#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
scratch=$(mktemp -d)
trap 'rm -f "$scratch/openapi.json" "$scratch/schema.d.ts"; rmdir "$scratch"' EXIT
(
  cd backend
  uv run python -c 'import json; from app.main import create_app; print(json.dumps(create_app().openapi()))'
) > "$scratch/openapi.json"
mobile/node_modules/.bin/openapi-typescript "$scratch/openapi.json" -o "$scratch/schema.d.ts"
mobile/node_modules/.bin/prettier "$scratch/schema.d.ts" --write
if [[ "${1:-}" == "--check" ]]; then
  diff -u mobile/src/api/schema.d.ts "$scratch/schema.d.ts"
else
  cp "$scratch/schema.d.ts" mobile/src/api/schema.d.ts
fi
