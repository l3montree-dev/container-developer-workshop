# Prerequisites

## Docker

Required for all workshop steps. Install via [docs.docker.com/get-docker](https://docs.docker.com/get-docker/).

---

## jq

```bash
# macOS
brew install jq

# Debian/Ubuntu
apt-get install -y jq
```

---

## container-hardening-work-bench

Latest release: **v1.1.0-rc.1**
Full release listing: https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases

```bash
# macOS (Apple Silicon)
curl -Lo chw.tar.gz https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v1.1.0-rc.1/downloads/container-hardening-work-bench_1.1.0-rc.1_darwin_arm64.tar.gz
tar xzf chw.tar.gz
sudo mv container-hardening-work-bench /usr/local/bin/

# macOS (Intel)
curl -Lo chw.tar.gz https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v1.1.0-rc.1/downloads/container-hardening-work-bench_1.1.0-rc.1_darwin_amd64.tar.gz
tar xzf chw.tar.gz
sudo mv container-hardening-work-bench /usr/local/bin/

# Linux (amd64)
curl -Lo chw.tar.gz https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v1.1.0-rc.1/downloads/container-hardening-work-bench_1.1.0-rc.1_linux_amd64.tar.gz
tar xzf chw.tar.gz
sudo mv container-hardening-work-bench /usr/local/bin/

# Linux (arm64)
curl -Lo chw.tar.gz https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v1.1.0-rc.1/downloads/container-hardening-work-bench_1.1.0-rc.1_linux_arm64.tar.gz
tar xzf chw.tar.gz
sudo mv container-hardening-work-bench /usr/local/bin/

# Verify checksum (optional but recommended)
curl -Lo checksums.txt https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v1.1.0-rc.1/downloads/checksums.txt
sha256sum --check --ignore-missing checksums.txt
```

Verify the installation:

```bash
container-hardening-work-bench --help
```
