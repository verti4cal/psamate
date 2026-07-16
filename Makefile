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
        clean

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
