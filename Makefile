# Makefile — Production Docker orchestration for WebRTC Chat
#
# Usage:
#   make help          Show available targets
#   make setup         First-time setup: copy .env template
#   make deploy        Build and start all services
#   make down          Stop all services
#
# Prerequisites:
#   - Docker and Docker Compose v2+
#   - .env file (run `make setup` to create from template)

.PHONY: help setup deploy build up down restart \
        logs logs-server logs-caddy logs-postgres \
        migrate status ps clean clean-all \
        rebuild-server rebuild-client \
        prod-pull prod-up prod-deploy prod-down prod-logs prod-status

# Default env file
ENV_FILE ?= .env

# Compose command
DC := docker compose --env-file $(ENV_FILE)

##@ General
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Setup
setup: ## Create .env from template (will not overwrite existing)
	@if [ -f $(ENV_FILE) ]; then \
		echo "$(ENV_FILE) already exists. Edit it manually or remove it first."; \
	else \
		cp .env.production.example $(ENV_FILE); \
		echo "Created $(ENV_FILE) from .env.production.example"; \
		echo "Edit $(ENV_FILE) with your production values before deploying."; \
	fi

check-env: ## Verify .env file exists
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "Error: $(ENV_FILE) not found. Run 'make setup' first."; \
		exit 1; \
	fi

##@ Deploy
deploy: check-env ## Build images and start all services (full deploy)
	$(DC) up -d --build

build: check-env ## Build all images without starting
	$(DC) build

up: check-env ## Start services (use existing images)
	$(DC) up -d

down: ## Stop all services
	$(DC) down

restart: down up ## Restart all services

##@ Rebuild individual services
rebuild-server: check-env ## Rebuild and restart only the server
	$(DC) up -d --build --no-deps server

rebuild-client: check-env ## Rebuild Caddy (includes client assets) and restart it
	$(DC) up -d --build --no-deps caddy

##@ Database
migrate: check-env ## Run database migrations only
	$(DC) up migrate

##@ Logs
logs: ## Follow logs for all services
	$(DC) logs -f

logs-server: ## Follow server logs
	$(DC) logs -f server

logs-caddy: ## Follow Caddy logs
	$(DC) logs -f caddy

logs-postgres: ## Follow PostgreSQL logs
	$(DC) logs -f postgres

##@ Status
status: ## Show service status and health
	$(DC) ps -a

ps: status ## Alias for status

##@ Production (GHCR registry-based deployment)
PROD_DC := docker compose -f docker-compose.prod.yml --env-file $(ENV_FILE)

prod-pull: check-env ## Pull latest images from GHCR
	$(PROD_DC) pull

prod-up: check-env ## Start production services (pre-pulled images)
	$(PROD_DC) up -d --remove-orphans

prod-deploy: prod-pull prod-up ## Pull latest images and restart (CI/CD deploy)

prod-down: ## Stop production services
	$(PROD_DC) down

prod-logs: ## Follow production logs
	$(PROD_DC) logs -f

prod-status: ## Show production service status
	$(PROD_DC) ps -a

##@ Cleanup
clean: ## Stop services and remove containers/networks
	$(DC) down --remove-orphans

clean-all: ## Stop services, remove containers, networks, volumes, and images
	@echo "WARNING: This will delete all data (database, Caddy certs, etc.)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DC) down --remove-orphans --volumes --rmi local
