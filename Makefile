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

.PHONY: run up down logs tui reset-sessions db-setup db-migrate db-shell install typecheck lint test help

## run: start Postgres, eve dev, the Telegram relay and the dev scheduler, following their logs (Ctrl-C stops them)
run:
	@$(COMPOSE) up --attach agent --attach telegram-poll --attach dev-schedules

## up: start Postgres, eve dev, the Telegram relay and the dev scheduler in the background
up:
	@$(COMPOSE) up -d --wait
	@echo "Agent is up (make logs, make tui, make down)"

## down: stop every container, keeping their data
down:
	@$(COMPOSE) down

## logs: follow the agent, relay and scheduler logs
logs:
	@$(COMPOSE) logs -f agent telegram-poll dev-schedules

## tui: open the eve terminal UI against the running agent
tui:
	@$(COMPOSE) exec agent npx --no-install eve remote connect --url http://127.0.0.1:2000

## reset-sessions: end every active session, so chats pick up code changes (drops their history)
reset-sessions:
	@$(COMPOSE) exec agent node scripts/reset-sessions.ts

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

## typecheck: check the project's types
typecheck:
	@$(AGENT_RUN) npm run --silent typecheck

## lint: run the linter
lint:
	@$(AGENT_RUN) npm run --silent lint

## test: run the tests
test:
	@$(AGENT_RUN) npm run --silent test

## help: list the available commands
help:
	@awk -F': ' '/^## / { printf "  %-15s %s\n", substr($$1, 4), substr($$0, length($$1) + 3) }' $(firstword $(MAKEFILE_LIST))
