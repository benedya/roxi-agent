SHELL := /bin/bash
.SHELLFLAGS := -ec

# Everything runs in the containers from docker-compose.yml; the host needs only Docker.
# Compose reads the database credentials and EVE_PORT from .env.local.
COMPOSE := docker compose --env-file .env.local
# One-off command in a fresh agent container, with its dependencies installed first.
AGENT_CMD := sh -ec 'sh scripts/install-deps.sh && "$$@"' --
AGENT_RUN := $(COMPOSE) run --rm --no-deps agent $(AGENT_CMD)
# Same, but starts Postgres first and waits until it is healthy.
AGENT_RUN_DB := $(COMPOSE) run --rm agent $(AGENT_CMD)

# Which logs eve dev shows: none | error | warn | debug | all ("all" includes the app's pino logs).
export EVE_LOGS ?= all

.PHONY: run up down logs tui db-setup db-migrate db-shell install typecheck lint

## run: start Postgres, eve dev and the Telegram relay, following their logs (Ctrl-C stops them)
run:
	@$(COMPOSE) up --attach agent --attach telegram-poll

## up: start Postgres, eve dev and the Telegram relay in the background
up:
	@$(COMPOSE) up -d --wait
	@echo "Agent is up (make logs, make tui, make down)"

## down: stop every container, keeping their data
down:
	@$(COMPOSE) down

## logs: follow the agent and relay logs
logs:
	@$(COMPOSE) logs -f agent telegram-poll

## tui: open the eve terminal UI against the running agent
tui:
	@$(COMPOSE) exec agent npx --no-install eve remote connect --url http://127.0.0.1:2000

## db-setup: create or migrate the session and app schemas (safe to run repeatedly)
db-setup:
	@$(AGENT_RUN_DB) sh -c 'npx --no-install bootstrap >/dev/null && echo "Postgres session schema ready." && npm run --silent db:migrate'

## db-migrate: apply pending app-schema migrations
db-migrate:
	@$(AGENT_RUN_DB) npm run --silent db:migrate

## db-shell: open psql in the Postgres container
db-shell:
	@$(COMPOSE) exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

## install: reinstall the container's dependencies
install:
	@$(COMPOSE) run --rm --no-deps agent sh scripts/install-deps.sh --force

typecheck:
	@$(AGENT_RUN) npm run --silent typecheck

lint:
	@$(AGENT_RUN) npm run --silent lint
