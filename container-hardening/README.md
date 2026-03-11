# Container hardening

> **Vulnerability:** [CVE-2025-55182](https://nvd.nist.gov/vuln/detail/CVE-2025-55182) — React Server Components "Flight" protocol unsafe deserialization, leading to unauthenticated Remote Code Execution (RCE).  
> The Next.js app in `app/` is intentionally vulnerable. The exploit PoC in `app/exploit-poc.ts` fires the RCE and prints the output of `id`.

---

## Setup

```bash
# In one terminal — keep it running for each step
docker run --rm -p 3000:3000 <image>

# In a second terminal — fire the RCE
bun exploit-poc.ts
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
bun exploit-poc.ts
```

Expected output (embedded in the server response):

```
uid=0(root) gid=0(root) groups=0(root)
```

The attacker has full root access. They can read `/etc/shadow`, install tools with `apt`, pivot to mounted volumes, and rewrite any file in the container.

---

## Step 2 — Non-root user

Same full `node:22` image — hundreds of tools still available — but the process runs as the built-in `node` user (uid 1000).

```bash
docker build -f Containerfile.nonroot -t hardening:nonroot .
docker run --rm -p 3000:3000 hardening:nonroot
```

Fire the exploit:

```bash
bun exploit-poc.ts
```

Expected output:

```
uid=1000(node) gid=1000(node) groups=1000(node)
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
bun exploit-poc.ts
```

The RCE payload still reaches the server and Node.js still executes it — but calling `execSync('id')` fails because `/usr/bin/id` does not exist in the image. The attacker is stuck: no shell to drop into, no tools to run, no interpreter to download and execute a second stage.

You can verify the image contains no shell:

```bash
docker run --entrypoint="" --rm hardening:distroless /bin/sh
# → exec /bin/sh: no such file or directory

docker run --entrypoint="" --rm hardening:distroless /bin/bash
# → exec /bin/bash: no such file or directory
```

The attack surface that survives is limited to what pure Node.js code can do via the standard library — environment variable leaks, file reads reachable by uid 65532, outbound HTTP. All lateral movement tooling is gone.

---

## Summary

| Image | Base | User | Shell | Tools | Post-exploitation |
|---|---|---|---|---|---|
| `hardening:root` | `node:22` | root (uid 0) | ✅ bash | ✅ full apt | full system compromise |
| `hardening:nonroot` | `node:22` | node (uid 1000) | ✅ bash | ✅ curl, wget, … | limited, but still dangerous |
| `hardening:distroless` | distroless | nonroot (uid 65532) | ❌ | ❌ | dead end — no tooling at all |

> **Takeaway:** running as non-root is necessary but not sufficient. A distroless base image removes the entire post-exploitation toolkit, forcing the attacker to work through Node.js APIs alone — a dramatically smaller attack surface.
