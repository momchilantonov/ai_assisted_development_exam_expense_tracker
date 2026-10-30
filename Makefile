# Single entry point for humans, agents, hooks and CI. Targets are guarded so
# they are no-ops until the corresponding directory exists.
SHELL := /bin/bash
BACKEND_PY := backend/.venv/bin/python

.PHONY: help check-env setup setup-backend setup-frontend setup-e2e seed-user \
	dev-backend dev-frontend lint lint-backend lint-frontend typecheck \
	typecheck-backend typecheck-frontend test-backend test-frontend test-e2e \
	check validate validate-infra

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | grep -v PHONY | cut -d: -f1 | sort | tr '\n' ' '; echo

check-env:
	@scripts/check-env.sh

setup: check-env setup-backend setup-frontend setup-e2e

setup-backend:
	@if [ -d backend ]; then \
	  if command -v uv >/dev/null; then \
	    uv venv --python 3.12 backend/.venv && \
	    uv pip install --python $(BACKEND_PY) -r backend/requirements-dev.txt; \
	  else \
	    python3.12 -m venv backend/.venv && \
	    $(BACKEND_PY) -m pip install -r backend/requirements-dev.txt; \
	  fi; \
	else echo "backend/ not created yet - skipping"; fi

setup-frontend:
	@if [ -d frontend ]; then npm --prefix frontend ci; else echo "frontend/ not created yet - skipping"; fi

setup-e2e:
	@if [ -d e2e ] && [ -f e2e/package.json ]; then \
	  npm --prefix e2e ci && npx --prefix e2e playwright install chromium; \
	else echo "e2e/ not created yet - skipping"; fi

seed-user:
	@cd backend && .venv/bin/python -m app.cli create-user

dev-backend:
	@cd backend && .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	@npm --prefix frontend run dev

lint: lint-backend lint-frontend

lint-backend:
	@if [ -d backend/app ]; then \
	  $(BACKEND_PY) -m ruff check backend && $(BACKEND_PY) -m ruff format --check backend; \
	else echo "backend/app not present - skipping"; fi

lint-frontend:
	@if [ -f frontend/package.json ]; then npm --prefix frontend run lint; else echo "frontend not present - skipping"; fi

typecheck: typecheck-backend typecheck-frontend

# mypy is OPTIONAL: runs only when installed in the backend venv.
typecheck-backend:
	@if [ -d backend/app ] && $(BACKEND_PY) -m mypy --version >/dev/null 2>&1; then \
	  cd backend && .venv/bin/python -m mypy app; \
	else echo "backend typecheck skipped (no backend/app or mypy not installed)"; fi

typecheck-frontend:
	@if [ -f frontend/package.json ]; then npm --prefix frontend run typecheck; else echo "frontend not present - skipping"; fi

test-backend:
	@if [ -d backend/tests ]; then cd backend && .venv/bin/python -m pytest -q; else echo "backend/tests not present - skipping"; fi

test-frontend:
	@if [ -f frontend/package.json ]; then npm --prefix frontend test -- --run; else echo "frontend not present - skipping"; fi

test-e2e:
	@if [ -f e2e/package.json ]; then npm --prefix e2e test; else echo "e2e not present - skipping"; fi

# Lint + typecheck + backend and frontend tests (no E2E).
check: lint typecheck test-backend test-frontend

# check + E2E; output is saved under docs/evidence/test-runs/.
validate:
	@scripts/check-all.sh --e2e

validate-infra:
	@scripts/validate-infra.sh
