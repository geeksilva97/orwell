# Orwell CLI

CLI tool for managing Elasticsearch Watcher alerts as code. Detects changed alerts via git diff and deploys them to Elasticsearch.

## Quick reference

- **Run CLI:** `node ./bin/orwell.ts <command>`
- **Run tests:** `npm test` (runs `node --test '**/*.test.ts'`)
- **Typecheck:** `npm run typecheck` (runs `tsc --noEmit`)
- **Integration tests:** `docker-compose up -d` then `npm test`, needs ES on port 19200
- **Node version:** 24.4.1 (see `.tool-versions`) — runs `.ts` files natively via strip-types

## Project structure

```
bin/orwell.ts           # CLI entry point (commander.js)
lib/
  types.ts              # Central interfaces and shared types
  container.ts          # Service locator (logger)
  commands/             # Command handlers registered in bin/orwell.ts
  core/                 # Domain models (Alert, Script, AlertFactory)
  services/             # Business logic (deploy, diff, filter, transpile)
  repositories/         # Filesystem-based alert discovery
  errors/               # Custom errors (OrwellError + type guards)
dsl/                    # Watcher DSL: builder, query compiler, markdown→Slack Block Kit
  watchjs-functions/    # Global functions available inside watcher.*.js files
test/
  fixtures/             # Test data and example configs
  integration/          # Tests against real local Elasticsearch
```

## Workflow rules

- **Always run tests after every change:** `npm test`
- **Bug fixes require test-first approach:** write a failing test that reproduces the bug, then fix the code to make it pass

## Code conventions

- **TypeScript + ESM** throughout (`import`/`export`), strict mode with `noUncheckedIndexedAccess`
- **No build step** — Node 24 strips types natively; use `.ts` extensions in all relative imports
- **No `any`** — use `unknown` + narrowing or generics instead
- **No linter or formatter configured** — follow existing style
- Factory functions prefixed with `make` (e.g., `makeDeployAlertsService`, `makeHttpClient`)
- Private class fields use `#` prefix (no parameter properties — `erasableSyntaxOnly`)
- Dependency injection via constructor args for testability
- `lib/container.ts` provides a lightweight service locator with `container.logger`
- Use `container.logger` (info/error/warn/debug) in command handlers, not bare `console.log`
- DSL watcher fixture files (`test/fixtures/**/*.js`, `watcher.*.js`) stay as `.js` — they run inside `vm.runInNewContext`

## Testing

- **Runner:** Node.js built-in test runner (`node:test`)
- **Test files:** colocated as `*.test.ts` next to source
- **Structure:** `describe`/`it` from `node:test`, assertions via `t.assert.*`; type test callbacks as `(t: TestContext) =>`
- **Mocking:** `t.mock.method()` and `t.mock.fn()` (no external mock libraries)
- Integration tests require Docker (`docker-compose up -d` for ES 8.17 on port 19200)

## Commands

| Command | Source |
|---|---|
| `push` | `lib/commands/push.ts` |
| `sync` | `lib/commands/sync.ts` |
| `heartbeat:deploy` | `lib/commands/heartbeat.ts` |
| `eval:watch` | `lib/commands/eval-javascript-watch.ts` |
| `scaffold` | `lib/commands/scaffold/index.ts` |

## DSL watcher files

JavaScript watcher files (`watcher.*.js`) run in an isolated VM context with these globals: `schedule()`, `input()`, `condition()`, `transform()`, `webhookAction()`, `metadata()`, `query()`, `rawQuery()`, `script()`, `markdown()`, `gt`, `gte`, `lt`, `lte`, `eq`, `notEq`, `isOneOf`.

## Painless scripts

- Stored as `.groovy` files
- Support `#include` directives for shared code
- Functions must be at the beginning of the script
