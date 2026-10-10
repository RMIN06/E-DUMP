SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
UV ?= uv
NPM ?= npm

.PHONY: dev-api dev-app seed gen-types check-types test test-backend test-mobile lint lint-backend lint-mobile slop-check security verify check-fonts
dev-api:
	cd backend && $(UV) run uvicorn app.main:app --reload --port 8080
dev-app:
	cd mobile && $(NPM) run start
seed:
	cd backend && $(UV) run python seeds/seed.py
gen-types:
	bash scripts/gen-api-types.sh
check-types:
	bash scripts/gen-api-types.sh --check
lint: lint-backend lint-mobile
lint-backend:
	cd backend && $(UV) run ruff check . && $(UV) run ruff format --check . && $(UV) run mypy --strict app
lint-mobile:
	cd mobile && $(NPM) run lint
test: test-backend test-mobile
test-backend:
	cd backend && $(UV) run pytest
	cd backend && $(UV) run coverage report --include='app/services/*,app/deps.py' --fail-under=90
test-mobile:
	cd mobile && $(NPM) run test
	node --test scripts/audit-policy.test.mjs scripts/web-worker.test.mjs
slop-check:
	bash scripts/check-slop.sh
security:
	cd backend && $(UV) run pip-audit
	test -z "$$(git ls-files -- backend/.env mobile/.env)" || { echo 'Local environment files must never be tracked.'; exit 1; }
	gitleaks dir . --redact --no-banner
	node scripts/audit-policy.mjs
check-fonts:
	cd mobile && $(NPM) run check-fonts
verify: lint test slop-check check-types security
