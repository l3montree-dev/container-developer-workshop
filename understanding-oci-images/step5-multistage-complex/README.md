# Step 5 — Multi-stage as the universal fix (secrets + whiteouts)

The previous steps showed three problems in isolation. This step combines all of them into a single builder stage, then proves the final image is clean.

```bash
mkdir -p tmp
docker build -f Containerfile -t oci-demo:step5 .
docker run --rm oci-demo:step5
```

## Prove the secret is gone from the final image

```bash
mkdir -p tmp/step5-inspect
docker save oci-demo:step5 -o ./tmp/step5.tar
tar xf ./tmp/step5.tar -C ./tmp/step5-inspect

cat tmp/step5-inspect/manifest.json | jq -r '.[0].Layers[]' | while read layer_path; do
  digest="${layer_path##*/}"
  dest="tmp/step5-inspect/blobs/sha256/${digest}-rootfs"
  mkdir -p "$dest"
  tar xzf "tmp/step5-inspect/$layer_path" -C "$dest"
  echo "=== $digest ==="
  ls "$dest"
done
```

## Inspect the merged filesystem

```bash
container-hardening-work-bench inspect -f Containerfile -o ./tmp/merged-step5
ls ./tmp/merged-step5
# → just /app
```

The entire merged filesystem is a single binary — no secrets, no whiteout pollution, no build tooling.

> **Takeaway:** multi-stage builds don't just remove build tools — they discard every ENV, every layer, and every whiteout file from previous stages. Only what you explicitly `COPY --from=` crosses the boundary.
