#!/bin/sh
set -eu

# Run from ~/app after compose has waited for container healthchecks.
docker compose exec -T backend python - "${1:?Usage: sh verify.sh https://public-host}" <<'PY'
import json
import sys
import time
import urllib.request

base = sys.argv[1].rstrip("/")
for attempt in range(12):
    try:
        for path in ("/", "/ready", "/api/ready", "/api/openapi.json"):
            with urllib.request.urlopen(base + path, timeout=5) as response:
                if response.status != 200:
                    raise RuntimeError(f"{path}: HTTP {response.status}")
                if path.endswith("ready") and json.load(response).get("status") != "ready":
                    raise RuntimeError(f"{path}: service is not ready")
                if path.endswith("openapi.json") and "/api/trips" not in json.load(response)["paths"]:
                    raise RuntimeError("Unexpected API schema")
        print(f"Public URL checks passed ({base}): frontend, backend, database and OpenAPI")
        break
    except Exception as error:
        print(f"Verification attempt {attempt + 1}/12 failed: {error}", flush=True)
        if attempt == 11:
            raise SystemExit(1)
        time.sleep(5)
PY
