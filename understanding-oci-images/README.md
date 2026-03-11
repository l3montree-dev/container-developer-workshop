# Understanding OCI Images

A hands-on walkthrough of how container images actually work under the hood.

---

## Step 1 — OCI images are just tarballs

```bash
cd step1-basic

# Build the image
docker build -f Containerfile -t oci-demo:step1 .

# Run it to verify it works
docker run --rm oci-demo:step1
```

Now export the image to a tar archive:

```bash
docker save oci-demo:step1 -o step1.tar

# Look at what's inside
tar tf step1.tar
```

You'll find:
- `manifest.json` — the image manifest listing layer digests
- `<digest>/layer.tar` — each filesystem layer as its own tarball
- `<config-digest>.json` — the image config (env, cmd, labels, …)

Extract a layer and poke around:

```bash
mkdir -p tmp/layer-inspect
tar xf step1.tar -C tmp/layer-inspect
ls tmp/layer-inspect

# In OCI layout, blobs have no extension — use manifest.json to find layer digests
# Each layer blob is a gzipped tar named only by its sha256 digest
cat tmp/layer-inspect/manifest.json | jq -r '.[0].Layers[]' | while read layer_path; do
  digest="${layer_path##*/}"
  dest="tmp/layer-inspect/blobs/sha256/${digest}-rootfs"
  mkdir -p "$dest"
  tar xzf "tmp/layer-inspect/$layer_path" -C "$dest"
  echo "=== $digest ==="
  ls "$dest"
done
```

Use the hardening workbench to merge all layers into one directory:

```bash
container-hardening-work-bench inspect -f Containerfile -o ./merged
ls ./merged   # this is exactly what the container sees at runtime
```


---

## Step 2 — Secrets in environment variables

```bash
cd ../step2-secrets

docker build -f Containerfile -t oci-demo:step2 .
docker save oci-demo:step2 -o step2.tar
```

Crack open the image config — **no extraction needed**:

```bash
# Get the config filename from manifest.json, then pretty-print the Env array
CONFIG=$(tar xf step2.tar manifest.json -O | jq -r '.[0].Config')

echo "Config file: $CONFIG"
tar xf step2.tar "$CONFIG" -O | jq '.config.Env'
```

**The passwords are right there in plain text.** Every `ENV` you set during build is stored permanently in the image config — anyone who can pull the image can read them.

> **Takeaway:** never bake secrets into images via `ENV` or `ARG` (ARG values also end up in the history). Use runtime secrets injection (Docker secrets, Kubernetes secrets, Vault sidecars, …).

---

## Step 3 — Whiteout files and layer pollution

### 3a — The problem: `rm` in a separate layer

```bash
cd ../step3-whiteout

docker build -f Containerfile -t oci-demo:step3-whiteout .
docker save oci-demo:step3-whiteout -o step3-whiteout.tar
```

Inspect each layer individually:

```bash
mkdir -p tmp/whiteout-inspect
tar xf step3-whiteout.tar -C tmp/whiteout-inspect
ls tmp/whiteout-inspect

# Look at the second layer (the rm layer) — find whiteout markers
for layer_dir in tmp/whiteout-inspect/*/; do
  tar tf "${layer_dir}layer.tar" 2>/dev/null | grep -i '\.wh\.' && echo "  ^ in $layer_dir"
done
```

Whiteout files (`.wh.<name>`) tell the union filesystem to hide the file at runtime — but the **original file still lives in the lower layer** and is shipped with the image.

Use the workbench to compare layer-by-layer vs merged:

```bash
container-hardening-work-bench inspect -f Containerfile -o ./merged-whiteout
```

### 3b — The fix: single `RUN` layer

```bash
cd ../step3-combined

docker build -f Containerfile -t oci-demo:step3-combined .
docker save oci-demo:step3-combined -o step3-combined.tar

# Compare image sizes
docker images oci-demo
```

The combined image is noticeably smaller — the deleted files never made it into any layer.

---

## Step 4 — Multi-stage builds

```bash
cd ../step4-multistage

docker build -f Containerfile -t oci-demo:step4 .
docker run --rm oci-demo:step4

# Compare sizes
docker images oci-demo
```

The final image is built `FROM scratch` — it contains **only** the compiled binary. No Alpine, no gcc, no libc, no build artefacts.

```bash
docker save oci-demo:step4 -o step4.tar
tar tf step4.tar   # just one tiny layer
```

Use the workbench to inspect the merged filesystem:

```bash
container-hardening-work-bench inspect -f Containerfile -o ./merged-multistage
ls ./merged-multistage   # a single /app binary
```

> **Takeaway:** multi-stage builds give you the full power of a build environment without shipping any of it to production. Smaller attack surface, smaller image, faster pulls.

---

## Step 5 — Multi-stage as the universal fix (secrets + whiteouts)

The previous steps showed three problems in isolation. This step combines all of them into a single builder stage, then proves the final image is clean.

```bash
cd ../step5-multistage-complex

docker build -f Containerfile -t oci-demo:step5 .
docker run --rm oci-demo:step5
```

### Prove the secret is gone from the final image

```bash
docker save oci-demo:step5 -o step5.tar

CONFIG=$(tar xf step5.tar manifest.json -O | jq -r '.[0].Config')
tar xf step5.tar "$CONFIG" -O | jq '.config.Env'
# → null  (no ENV entries at all)
```

Compare with the builder stage — save it separately to show the contrast:

```bash
docker build -f Containerfile --target builder -t oci-demo:step5-builder .
docker save oci-demo:step5-builder -o step5-builder.tar

CONFIG=$(tar xf step5-builder.tar manifest.json -O | jq -r '.[0].Config')
tar xf step5-builder.tar "$CONFIG" -O | jq '.config.Env'
# → ["BUILD_TOKEN=ghp_super_secret_build_token_abc123"]  ← secret visible here
```

### Prove the whiteout files are gone from the final image

```bash
mkdir -p tmp/step5-inspect
tar xf step5.tar -C tmp/step5-inspect

# Search all layers for whiteout markers
for layer_dir in tmp/step5-inspect/*/; do
  tar tf "${layer_dir}layer.tar" 2>/dev/null | grep '\.wh\.'
done
# → (no output — zero whiteout files)
```

Do the same for the builder image and you'll see whiteout files from the separate `RUN rm` layer.

### Inspect the merged filesystem

```bash
container-hardening-work-bench inspect -f Containerfile -o ./merged-step5
ls ./merged-step5
# → just /app
```

The entire merged filesystem is a single binary — no secrets, no whiteout pollution, no build tooling.

> **Takeaway:** multi-stage builds don't just remove build tools — they discard every ENV, every layer, and every whiteout file from previous stages. Only what you explicitly `COPY --from=` crosses the boundary.

---

## Summary

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| `ENV SECRET=...` | Secret baked into image manifest forever | Runtime secrets injection or multi-stage |
| `RUN install` then `RUN rm` | Deleted files still in lower layer → whiteout bloat | Combine into one `RUN`, or use multi-stage |
| Single-stage build with dev tools | Compiler, headers, caches shipped to prod | Multi-stage build |
| All of the above | Bloated, leaky, oversized image | Multi-stage: only `COPY` what you need into a clean final stage |
