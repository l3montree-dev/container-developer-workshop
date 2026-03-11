# Step 1 — OCI Image Structure

> Spec reference: [OCI Image Layout Specification](https://github.com/opencontainers/image-spec/blob/main/image-layout.md)

An OCI image saved with `docker save` is a tar archive that follows the
[OCI Image Layout](https://github.com/opencontainers/image-spec/blob/main/image-layout.md) format.
Everything inside is content-addressed: files are stored as blobs named by their SHA-256 digest.

---

## Archive layout

After running `docker save oci-demo:step1 -o step1.tar && tar xf step1.tar -C tmp/layer-inspect`
you get:

```
tmp/layer-inspect/
├── oci-layout                        # layout version marker
├── index.json                        # entry point — the image index
├── manifest.json                     # legacy Docker compatibility manifest
└── blobs/
    └── sha256/
        ├── 542433e4…   (index)       # OCI image index for this tag
        ├── fac02a53…   (config)      # image configuration JSON
        ├── a447a5de…   (layer tar)   # layer 0 — alpine base rootfs
        └── 921d439b…   (layer tar)   # layer 1 — our RUN instruction
```

---

## File by file

### `oci-layout`

Marks the directory as an OCI Image Layout and states the spec version.

```json
{"imageLayoutVersion": "1.0.0"}
```

### `index.json`

The top-level entry point.
It is an [Image Index](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
(a.k.a. manifest list) that maps tag names to image manifests via content digests.

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.index.v1+json",
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.index.v1+json",
      "digest": "sha256:542433e4…",
      "size": 855,
      "annotations": {
        "org.opencontainers.image.ref.name": "step1"
      }
    }
  ]
}
```

The digest `sha256:542433e4…` is the filename of the next blob to follow.

### `manifest.json`

A legacy Docker-format manifest added by `docker save` for backwards compatibility with older tooling. Not part of the OCI spec — you can ignore it when reading the image spec.

```json
[{
  "Config":   "blobs/sha256/fac02a53…",
  "RepoTags": ["oci-demo:step1"],
  "Layers":   ["blobs/sha256/a447a5de…", "blobs/sha256/921d439b…"]
}]
```

### `blobs/sha256/542433e4…` — the OCI Image Manifest

> Spec: [image-manifest.md](https://github.com/opencontainers/image-spec/blob/main/manifest.md)

Points to the config blob and the ordered list of layer blobs for a specific platform.

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "config": {
    "mediaType": "application/vnd.oci.image.config.v1+json",
    "digest": "sha256:fac02a53…",
    "size": 1234
  },
  "layers": [
    { "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip", "digest": "sha256:a447a5de…" },
    { "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip", "digest": "sha256:921d439b…" }
  ]
}
```

### `blobs/sha256/fac02a53…` — the Image Config

> Spec: [config.md](https://github.com/opencontainers/image-spec/blob/main/config.md)

The image configuration JSON. Contains:

| Field | What it stores |
|---|---|
| `config.Env` | Environment variables (`ENV` instructions) |
| `config.Cmd` | Default command (`CMD` instruction) |
| `config.Entrypoint` | Entrypoint (`ENTRYPOINT` instruction) |
| `rootfs.diff_ids` | Ordered list of **uncompressed** layer digests (DiffIDs) |
| `history` | Full build history — one entry per Dockerfile instruction |

```json
{
  "architecture": "arm64",
  "os": "linux",
  "config": {
    "Env": ["PATH=/usr/local/sbin:…"],
    "Cmd": ["cat", "/hello.txt"]
  },
  "rootfs": {
    "type": "layers",
    "diff_ids": [
      "sha256:6d6d5227…",
      "sha256:6eb80f89…"
    ]
  },
  "history": [
    { "created_by": "ADD alpine-minirootfs-3.21.6-aarch64.tar.gz / # buildkit" },
    { "created_by": "CMD [\"/bin/sh\"]", "empty_layer": true },
    { "created_by": "RUN /bin/sh -c echo \"Hello, OCI World!\" > /hello.txt" },
    { "created_by": "CMD [\"cat\" \"/hello.txt\"]", "empty_layer": true }
  ]
}
```

Note: `empty_layer: true` means the instruction (like `CMD` or `ENV`) produced no filesystem
change and therefore has no corresponding entry in `rootfs.diff_ids`.

The **ImageID** is simply the SHA-256 of this JSON document — because it references the digests
of all layers, the ID is fully content-addressed and tamper-evident.

### `blobs/sha256/a447a5de…` and `blobs/sha256/921d439b…` — Layer tarballs

Each layer is a tar archive of the filesystem delta for that build step.

- Layer 0 (`a447a5de`) — the Alpine base image rootfs (`/bin`, `/etc`, `/lib`, …)
- Layer 1 (`921d439b`) — only the single file added by our `RUN` instruction: `/hello.txt`

The layers are applied in order on top of each other using a union filesystem (OverlayFS).
The result is the merged filesystem the container sees at runtime.

---

## How it all connects

```mermaid
graph TD
    A["index.json\n(entry point)"]
    B["blobs/sha256/542433e4\nImage Index\napplication/vnd.oci.image.index.v1+json"]

    subgraph image ["Image (linux/arm64)"]
        C["blobs/sha256/53af7607\nImage Manifest\napplication/vnd.oci.image.manifest.v1+json"]
        D["blobs/sha256/fac02a53\nImage Config\napplication/vnd.oci.image.config.v1+json"]
        E["blobs/sha256/a447a5de\nLayer 0 — alpine base\napplication/vnd.oci.image.layer.v1.tar+gzip"]
        G["blobs/sha256/921d439b\nLayer 1 — /hello.txt\napplication/vnd.oci.image.layer.v1.tar+gzip"]
        H["Merged filesystem\n(what the container sees)"]
    end

    subgraph attestation ["BuildKit auto-provenance (vnd.docker.reference.type: attestation-manifest)"]
        I["blobs/sha256/fd4f2623\nAttestation Manifest\napplication/vnd.oci.image.manifest.v1+json"]
        J["blobs/sha256/444d2edc\nAttestation Config\napplication/vnd.oci.image.config.v1+json"]
        K["blobs/sha256/d7a16af0\nBuildKit SLSA Provenance\napplication/vnd.in-toto+json\npredicateType: slsa.dev/provenance/v0.2"]
    end

    A -->|"manifests[0].digest"| B
    B -->|"manifests[0].digest"| C
    B -->|"manifests[1].digest\nvnd.docker.reference.digest → 53af7607"| I
    C -->|"config.digest"| D
    C -->|"layers[0].digest"| E
    C -->|"layers[1].digest"| G
    E -->|"applied first"| H
    G -->|"applied on top"| H
    I -->|"config.digest"| J
    I -->|"layers[0].digest"| K

    style A fill:#f5f5f5,stroke:#999
    style B fill:#dbeafe,stroke:#3b82f6
    style C fill:#dbeafe,stroke:#3b82f6
    style D fill:#dcfce7,stroke:#22c55e
    style E fill:#fef9c3,stroke:#ca8a04
    style G fill:#fef9c3,stroke:#ca8a04
    style H fill:#f3e8ff,stroke:#a855f7
    style I fill:#ffe4e6,stroke:#f43f5e
    style J fill:#ffe4e6,stroke:#f43f5e
    style K fill:#ffe4e6,stroke:#f43f5e
```

Every arrow is a `digest` field — a cryptographic hash of the blob's contents.
Changing any file changes its digest, which changes every blob that references it,
which changes the ImageID. The entire image is a Merkle tree.
