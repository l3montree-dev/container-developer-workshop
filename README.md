# Container Developer Workshop

A hands-on workshop covering OCI image internals, container hardening, and Linux namespaces.

| Section | What you learn |
|---|---|
| [`understanding-oci-images/`](understanding-oci-images/) | Layers, whiteouts, secrets, multi-stage builds |
| [`container-hardening/`](container-hardening/) | RCE exploitation, root vs. non-root, distroless, read-only filesystems |
| [`sbom-generation/`](sbom-generation/) | SBOM trust boundaries — ghost packages and phantom binaries |
| [`linux-namespaces/`](linux-namespaces/) | How containers isolate processes at the kernel level |

---

## Setup

All tools are provided through a [Nix](https://nixos.org/) dev shell (`flake.nix`). Two paths depending on your OS:

- **Linux** — run `nix develop` directly in the repo root.
- **macOS** — the Linux namespace exercises require a real Linux kernel. Use [Lima](https://lima-vm.io/) to spin up a lightweight Debian VM and run everything inside it.

---

## macOS: Lima + Nix

### 1 — Install Nix

```bash
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install)
```

Restart your shell, then verify:

```bash
nix --version
```

### 2 — Install Lima

```bash
nix-env -iA nixpkgs.lima
# or, if you prefer Homebrew:
brew install lima
```

### 3 — Start the workshop VM

The repo ships a `workshop.yaml` Lima template — a minimal Debian 12 VM with your home directory mounted read-write.

```bash
limactl start workshop.yaml
```

First start downloads the Debian image and boots the VM (~1 min). Subsequent starts are instant.

### 4 — Install Nix inside the VM

Open a shell in the VM and run each step:

```bash
limactl shell workshop
```

**Install Nix:**

```bash
sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install) --no-daemon
```

**Enable flakes:**

```bash
sudo mkdir -p /etc/nix
echo 'experimental-features = nix-command flakes' | sudo tee -a /etc/nix/nix.conf
```

**Reload your shell to pick up the Nix profile:**

```bash
exec $SHELL -l
```

**Verify:**

```bash
nix --version
```

### 5 — Enter the dev shell

```bash
# Still inside the VM shell:
cd ~/path/to/container-developer-workshop
nix develop
```

`nix develop` installs and activates all tools: `docker`, `jq`, `bun`, `nc`, `gnutar`, `container-hardening-work-bench`, plus the Linux-only namespace tools (`unshare`, `nsenter`, `newuidmap`, `go`).

### VM lifecycle

```bash
limactl stop workshop      # pause the VM
limactl start workshop     # resume
limactl delete workshop    # remove entirely
```

---

## Linux

```bash
nix develop
```

That's it. All tools including the namespace utilities are available immediately.

---

## Without Nix

See [PREREQUISITES.md](PREREQUISITES.md) for manual installation instructions for each tool.
