#!/usr/bin/env bash
set -euo pipefail
TASK_FRONTEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_BACKEND_ROOT="${REGULATORY_BACKEND_DIR:-$TASK_FRONTEND_ROOT/../regulatory-evidence-mvp-v0.11.0}"
command -v uv >/dev/null || { echo 'Install uv and Python >=3.11 first (see README).'; exit 1; }
[[ -f "$TASK_BACKEND_ROOT/pyproject.toml" ]] || { echo "Evidence backend not found: $TASK_BACKEND_ROOT"; exit 1; }
# uv installs the backend dependencies from its own lockfile. The repositories stay separate.
exec uv run --directory "$TASK_BACKEND_ROOT" --locked python "$TASK_FRONTEND_ROOT/scripts/run_local.py" --backend "$TASK_BACKEND_ROOT" "$@"
