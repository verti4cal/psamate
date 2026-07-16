.DEFAULT_GOAL := help
.PHONY: help \
        install install-backend install-frontend \
        dev dev-backend dev-frontend \
        build build-backend build-frontend \
        typecheck typecheck-backend typecheck-frontend \
        test test-backend test-frontend \
        db-generate db-migrate db-reset setup-reset \
        docker-build docker-up docker-down docker-logs docker-restart \
        docker-dev-up docker-dev-down \
        clean version

# Lets `make version 1.2.3` work as well as `make version VERSION=1.2.3` —
# treats the word after "version" as the version number rather than trying
# (and failing) to find a make target with that name.
ifeq (version,$(firstword $(MAKECMDGOALS)))
  VERSION := $(word 2,$(MAKECMDGOALS))
  $(eval $(VERSION):;@:)
endif

# ── Config ────────────────────────────────────────────────────────────────────

DATABASE_PATH ?= ./data/psamate.db
COMPOSE        = docker compose
COMPOSE_DEV    = docker compose -f docker-compose.dev.yml

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' \
		| sort

# ── Install ───────────────────────────────────────────────────────────────────

install: install-backend install-frontend ## Install deps for both workspaces

install-backend: ## npm install — backend
	cd backend && npm install

install-frontend: ## npm install — frontend
	cd frontend && npm install

# ── Dev servers ───────────────────────────────────────────────────────────────

dev: ## Start both dev servers in parallel (requires tmux or runs sequentially)
	@echo "Starting backend on :3000 and frontend on :5173 …"
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Start backend with hot reload
	cd backend && DATABASE_PATH=../$(DATABASE_PATH) npm run dev

dev-frontend: ## Start frontend Vite dev server
	cd frontend && npm run dev

# ── Build ─────────────────────────────────────────────────────────────────────

build: build-backend build-frontend ## Build both workspaces for production

build-backend: ## Compile TypeScript → dist/
	cd backend && npm run build

build-frontend: ## Bundle frontend → dist/
	cd frontend && npm run build

# ── Type checking ─────────────────────────────────────────────────────────────

typecheck: typecheck-backend typecheck-frontend ## Run tsc --noEmit on both workspaces

typecheck-backend: ## Type-check backend
	cd backend && npx tsc --noEmit

typecheck-frontend: ## Type-check frontend
	cd frontend && npx tsc --noEmit

# ── Tests ─────────────────────────────────────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && npm test

test-frontend: ## Run frontend tests
	cd frontend && npm test

# ── Database ──────────────────────────────────────────────────────────────────

db-generate: ## Generate a new Drizzle migration from schema changes
	cd backend && npm run db:generate

db-migrate: ## Apply pending migrations to the local dev database
	cd backend && DATABASE_PATH=../$(DATABASE_PATH) npm run db:migrate

db-reset: ## Delete the local dev database and re-run migrations
	@read -p "Delete $(DATABASE_PATH)? [y/N] " confirm && [ "$$confirm" = "y" ] && rm -f $(DATABASE_PATH) || true
	@$(MAKE) db-migrate

setup-reset: ## Wipe the database and restart dev containers so setup can be redone
	@echo "Wiping $(DATABASE_PATH)…"
	@rm -f $(DATABASE_PATH)
	@echo "Restarting dev containers…"
	$(COMPOSE_DEV) restart backend

# ── Docker — production ───────────────────────────────────────────────────────

docker-build: ## Build all Docker images
	$(COMPOSE) build

docker-up: ## Build images and start containers in the background
	$(COMPOSE) up --build -d

docker-down: ## Stop and remove containers
	$(COMPOSE) down

docker-logs: ## Tail logs from all containers
	$(COMPOSE) logs -f

docker-restart: ## Restart all containers without rebuilding
	$(COMPOSE) restart

# ── Docker — development ──────────────────────────────────────────────────────

docker-dev-up: ## Start dev containers with hot reload
	$(COMPOSE_DEV) up --build

docker-dev-down: ## Stop dev containers
	$(COMPOSE_DEV) down

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artefacts from both workspaces
	rm -rf backend/dist frontend/dist

# ── Release ───────────────────────────────────────────────────────────────────

# Bumps version.json, commits it to main, then tags and pushes — the tag
# push is what triggers .github/workflows/docker-release.yml to build and
# publish the image. Usage: make version 1.2.3 (or make version VERSION=1.2.3)
version: ## Bump version.json, commit, tag, and push — triggers the release build
	@test -n "$(VERSION)" || (echo "Usage: make version 1.2.3" && exit 1)
	@echo "$(VERSION)" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$$' \
		|| (echo "VERSION must look like a semver version, e.g. 1.2.3 or 1.2.3-beta.1" && exit 1)
	@[ "$$(git branch --show-current)" = "main" ] \
		|| (echo "Not on main (currently on $$(git branch --show-current)) — switch to main first" && exit 1)
	@git diff --quiet && git diff --cached --quiet \
		|| (echo "Working tree has uncommitted changes — commit or stash them first" && exit 1)
	node -e "const fs=require('fs');const f='version.json';const v=JSON.parse(fs.readFileSync(f,'utf8'));v.version='$(VERSION)';fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');"
	git add version.json
	git commit -m "Release v$(VERSION)"
	git push origin main
	git tag v$(VERSION)
	git push origin v$(VERSION)
	@echo "Released v$(VERSION) — image build: https://github.com/verti4cal/psamate/actions"
