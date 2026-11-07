# eve Agent App

This project uses the eve framework. Before authoring tools, connections, channels, skills, subagents, schedules, or deployment, read the relevant page in `node_modules/eve/docs` (start with `README.md`, or https://eve.dev/docs).

## Code structure

Business logic lives under `agent/lib/core/`:

- `services/` — business logic, as services (`*.service.ts`). One service per use case (single responsibility principle). Services are grouped in folders by domain, e.g. `services/notes/`, `services/groups/`.
- `repositories/` — all database interaction, as repositories (`*.repository.ts`). Services access the database only through repositories.
- `entities/` — TypeORM entities (`*.entity.ts`).
- `types/` — types shared by more than one file. A type used in a single file stays in that file and is not exported.
- `helpers/` — standalone functions that don't belong to a class and are used by core code (services, repositories, entities).
- `db/migrations/` — TypeORM migrations.

Helpers tied to the agent rather than to the core (e.g. Telegram handlers, tools, channels) go under `agent/lib/helpers/`.

Import core files through the `#core/*` alias (`package.json` `imports`), never by relative path and without the `.ts` extension (the alias adds it): `#core/repositories/note.repository`, not `../../repositories/note.repository.ts`. Other files under `agent/lib/` use `#lib/*` and files under `scripts/` use `#scripts/*` in the same way: `#lib/env`, not `../lib/env.ts`.

No barrel files (an `index.ts` that re-exports a folder): import each file directly.

A function used only within its own file is not exported.

Type and interface names have no `interface` suffix: use `Note`, not `NoteInterface`.

## Commits

Commit messages are one short, clear line, with no body or additional details.

## Naming: `find` vs `get`

Use these prefixes only for functions that look up or read existing values, not on every function that returns a value. A function that does other work is named after that work, whatever it returns.

- `find*` — may find nothing: returns `T | null` for one item, or a possibly empty array for many. Callers must handle the empty case. Example: `findById(id): Promise<Note | null>`.
- `get*` — always provides exactly one value: returns `T`, never `null`. When the value does not exist, it throws. Example: `getById(id): Promise<Note>`.
