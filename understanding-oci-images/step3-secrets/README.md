# Secrets in environment variables

## The problem

```bash
mkdir -p tmp
docker build -f Containerfile -t oci-demo:step2 .
docker save oci-demo:step2 -o ./tmp/step2.tar
```

Crack open the image config:

```bash
CONFIG=$(tar xfO ./tmp/step2.tar manifest.json | jq -r '.[0].Config')

echo "Config file: $CONFIG"
tar xfO ./tmp/step2.tar "$CONFIG" | jq '.config.Env'
```

**The passwords are right there in plain text.** Every `ENV` you set during build is stored permanently in the image config — anyone who can pull the image can read them.

> `ARG` values are no better — they are recorded in the build history inside the same config JSON.

---

## The fix — BuildKit secret mounts

> **Is this an OCI standard?** No. `--mount=type=secret` is a **BuildKit-specific Dockerfile extension**, not part of any OCI spec. The OCI only standardizes the image format ([Image Spec](https://github.com/opencontainers/image-spec)), the runtime ([Runtime Spec](https://github.com/opencontainers/runtime-spec)), and registry protocol ([Distribution Spec](https://github.com/opencontainers/distribution-spec)) — the build process is entirely out of scope. This feature is maintained by the [Moby/BuildKit](https://github.com/moby/buildkit) project and enabled via the `# syntax=docker/dockerfile:1` directive. It is a de-facto standard supported by Docker and Podman, but not a formal one.

BuildKit's `--mount=type=secret` makes a secret available inside a single `RUN` as a file under `/run/secrets/<id>`. It is **never written to any layer** and never appears in the image config or history.

```bash
# Write the secrets to files
echo "super_secret_password_123" > /tmp/db_password
echo "sk-prod-abc123xyz789"       > /tmp/api_key

docker build \
  -f Containerfile.build-secrets \
  --secret id=db_password,src=/tmp/db_password \
  --secret id=api_key,src=/tmp/api_key \
  -t oci-demo:step2-solution .
```

Now prove the secrets are gone:

```bash
docker save oci-demo:step2-solution -o ./tmp/step2-solution.tar
CONFIG=$(tar xfO ./tmp/step2-solution.tar manifest.json | jq -r '.[0].Config')
tar xfO ./tmp/step2-solution.tar "$CONFIG" | jq '.config.Env'
# → ["PATH=/usr/local/sbin:…"]   ← no secrets, just the default PATH
```

The secret files are never committed to the image — not even as a whiteout — because the mount is handled entirely outside the layer snapshot.

> **Takeaway:** never bake secrets into images via `ENV` or `ARG`. Use `--mount=type=secret` at build time, and runtime secrets injection (Docker secrets, Kubernetes secrets, Vault, …) at run time.
