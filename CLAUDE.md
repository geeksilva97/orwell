# Orwell CLI

CLI tool for managing Elasticsearch Watcher alerts as code. Detects changed alerts via git diff and deploys them to Elasticsearch.

## Quick reference

- **Run CLI:** `node ./bin/orwell <command>`
- **Run tests:** `npm test` (runs `node --test '**/*.test.js'`)
- **Integration tests:** `docker-compose up -d` then `npm test`, needs ES on port 19200
- **Node version:** 22.11.0 (see `.tool-versions`)

## Project structure

```
bin/orwell              # CLI entry point (commander.js)
lib/
  commands/             # Command handlers registered in bin/orwell
  core/                 # Domain models (Alert, Script, AlertFactory)
  services/             # Business logic (deploy, diff, filter, transpile)
  repositories/         # Filesystem-based alert discovery
  errors/               # Custom errors extending BaseError
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

- **CommonJS** throughout (`require`/`module.exports`), no TypeScript
- **No linter or formatter configured** — follow existing style
- Factory functions prefixed with `make` (e.g., `makeDeployAlertsService`, `makeHttpClient`)
- Private class fields use `#` prefix
- Dependency injection via constructor args for testability
- `lib/container.js` provides a lightweight service locator with `container.logger`
- Use `container.logger` (info/error/warn/debug) in command handlers, not bare `console.log`

## Testing

- **Runner:** Node.js built-in test runner (`node:test`)
- **Test files:** colocated as `*.test.js` next to source
- **Structure:** `describe`/`it` from `node:test`, assertions via `t.assert.*`
- **Mocking:** `t.mock.method()` and `t.mock.fn()` (no external mock libraries)
- Integration tests require Docker (`docker-compose up -d` for ES 8.17 on port 19200)

## Commands

| Command | Source |
|---|---|
| `push` | `lib/commands/push.js` (registered inline in `bin/orwell`) |
| `sync` | `lib/commands/sync.js` |
| `heartbeat:deploy` | `lib/commands/heartbeat.js` |
| `eval:watch` | `lib/commands/eval-javascript-watch.js` |
| `scaffold` | `lib/commands/scaffold/` |

## DSL watcher files

JavaScript watcher files (`watcher.*.js`) run in an isolated VM context with these globals: `schedule()`, `input()`, `condition()`, `transform()`, `webhookAction()`, `metadata()`, `query()`, `rawQuery()`, `script()`, `markdown()`, `gt`, `gte`, `lt`, `lte`, `eq`, `notEq`, `isOneOf`.

## Painless scripts

- Stored as `.groovy` files
- Support `#include` directives for shared code
- Functions must be at the beginning of the script
