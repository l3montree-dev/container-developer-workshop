# SBOM Generation — trust the package database?

> An SBOM (Software Bill of Materials) lists every component in your software.
> Scanners like Trivy build it by reading the **package manager database** inside the image — not by inspecting the actual files on disk.
> This step shows exactly what that assumption gets you wrong in both directions.
>
> From the [Trivy documentation](https://trivy.dev/docs/dev/guide/coverage/os/debian/):
> *"Trivy detects packages that have been installed through package managers such as apt and dpkg. While there are some exceptions, like Go binaries and JAR files, it's important to note that binaries that have been custom-built using make or tools installed via curl are generally not detected."*

---

## Setup

```bash
mkdir -p tmp
docker build -f Containerfile -t sbom-demo:latest .
```

Generate a CycloneDX SBOM with Trivy:

```bash
trivy image --format cyclonedx --output ./tmp/sbom.cdx.json sbom-demo:latest
```

To see all detected components at a glance:

```bash
cat ./tmp/sbom.cdx.json | jq '[.components[] | .name] | sort'
```

---

## Finding 1 — the ghost package (in the SBOM, never installed)

The image has a hand-crafted entry for `libssl1.1` injected directly into
`/var/lib/dpkg/status`. No files were ever installed. It is pure metadata.

Check that the *files* are missing from the image:

```bash
docker run --rm sbom-demo:latest find /usr/lib -name 'libssl.so.1.1*' 2>/dev/null
# → (no output — the library files do not exist)
```

But Trivy reports it as installed:

```bash
cat ./tmp/sbom.cdx.json | jq '
  .components[]
  | select(.name == "libssl1.1")
  | {name, version, type}
'
```

Expected output:

```json
{
  "name": "libssl1.1",
  "version": "1.1.1w-0+deb11u1",
  "type": "library"
}
```

**So what?** An attacker who can modify a layer can silently inject a known-vulnerable
package entry into your SBOM — triggering false CVE alerts — or conversely remove
a real package entry to hide a vulnerable dependency from scanners.

---

## Finding 2 — the phantom binary (on disk, not in the SBOM)

`/usr/local/bin/jq-static` is a real, released binary downloaded directly from
GitHub during the build — no `apt`, no dpkg record, no package metadata.
It is a **C binary** with no embedded module information, so Trivy has no
language-specific scanner that can identify it.

Confirm it exists and runs:

```bash
docker run --rm sbom-demo:latest jq-static --version
# → jq-1.7.1
```

Now search for it in the SBOM:

```bash
cat ./tmp/sbom.cdx.json | jq '[.components[] | .name] | map(select(test("jq"; "i")))'
# → []
```

Empty. The binary is completely invisible to Trivy.

### Why Go binaries are an exception

If you try this with a Go binary (e.g. `container-hardening-work-bench`), Trivy
**will** find it — Go embeds the full `go.mod` dependency graph directly into every
compiled binary as `buildinfo` metadata. Trivy reads that metadata as a second pass.

```bash
# Go binaries expose their module graph:
go version -m /usr/local/bin/container-hardening-work-bench
```

C, C++, Rust, and most other compiled binaries carry no equivalent metadata.
A malicious or vulnerable binary written in any of those languages is invisible
to Trivy unless it was installed through the package manager.

---

## What an SBOM scanner actually reads

```
/var/lib/dpkg/status        ← debian/ubuntu: every apt-installed package
/var/lib/apk/db/installed   ← alpine: every apk-installed package
/var/lib/rpm/rpmdb.sqlite   ← rpm-based: every rpm-installed package
```

Trivy builds the SBOM entirely from these files. Executables, libraries, and scripts
that were not installed via the package manager are **invisible** by default.

Trivy's `--scanners vuln,secret,license` flag scans layers for known file hashes
and secrets as a second pass — but binary-level coverage is incomplete and
architecture-dependent.

> **Takeaway:** an SBOM is only as trustworthy as the package database it was built
> from. Treat it as a starting point, not ground truth. Combine it with:
> - Image signing and provenance attestation (Sigstore / cosign)
> - Build-time SBOMs generated from source (not from the final image)
> - File-integrity monitoring in production to catch binaries that arrived outside the package manager
