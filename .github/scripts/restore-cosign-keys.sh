#!/usr/bin/env bash
set -euo pipefail

# Decode base64 secrets into cosign.key and cosign.pub
if [ -z "${COSIGN_KEY_B64:-}" ] || [ -z "${COSIGN_PUB_B64:-}" ]; then
  echo "ERROR: COSIGN_KEY_B64 and/or COSIGN_PUB_B64 secrets not provided." >&2
  echo "Please add these secrets to the repository or disable signing (set build.sign: false in the recipe)." >&2
  exit 1
fi

echo "$COSIGN_KEY_B64" | base64 -d > ./cosign.key
echo "$COSIGN_PUB_B64" | base64 -d > ./cosign.pub
chmod 600 ./cosign.key
chmod 644 ./cosign.pub
ls -l ./cosign.*

# Basic validation
if ! head -c 11 ./cosign.pub | grep -qi "PUBLIC" >/dev/null 2>&1; then
  echo "WARNING: cosign.pub does not look like a public key; ensure you provided the correct key bytes." >&2
fi

echo "Restored cosign.key and cosign.pub"
