---
title: File naming & targeting
description: How watcher filenames control which servers and environments receive each alert.
---

## Naming pattern

```
watcher[.server][.environment].json|js
```

The filename determines which `--target` values will match the watcher at deploy time.

## Examples

| Filename | Deploys when `--target` is |
|---|---|
| `watcher.json` | Any target (always matches) |
| `watcher.non-prod.json` | `*.non-prod` |
| `watcher.prod.json` | `*.prod` |
| `watcher.server-a.json` | `server-a.*` |
| `watcher.server-a.non-prod.json` | `server-a.non-prod` |
| `watcher.server-b.prod.json` | `server-b.prod` |

## How targeting works

When you run `orwell push --target server-a.non-prod`, Orwell filters the alert's watcher files to those that match:

1. Exact match: `watcher.server-a.non-prod.js`
2. Server only: `watcher.server-a.js` (any environment for server-a)
3. Environment only: `watcher.non-prod.js` (any server in non-prod)
4. Catch-all: `watcher.json` / `watcher.js`

The first matching file wins. If no file matches, the alert is skipped.

## Multi-server alert example

An alert that needs different query parameters per server:

```
src/payments/order-failure/
  watcher.server-a.non-prod.js    ← server-a specific (ES endpoint A)
  watcher.server-b.non-prod.js    ← server-b specific (ES endpoint B)
  watcher.prod.js                 ← both servers in prod use the same config
  script.groovy
```

When deploying to `server-a.non-prod`, only `watcher.server-a.non-prod.js` is used.

## Watcher IDs with multiple files

Each watcher file in the same alert folder gets its own Elasticsearch Watcher ID:

| File | Watcher ID |
|---|---|
| `watcher.server-a.non-prod.js` | `payments-order-failure` *(target-scoped)* |
| `watcher.prod.js` | `payments-order-failure` *(target-scoped)* |

The ID itself does not encode the server/env — the targeting is purely a deploy-time filter. If two files in the same alert would deploy to the same Elasticsearch cluster at the same time, they'd overwrite each other. Structure your targets to avoid this.

## Omitting `--target`

If you run `push` or `sync` without `--target`, Orwell deploys **all** watcher files it finds in changed alert folders, regardless of filename. Useful for testing, not recommended for production pipelines.
