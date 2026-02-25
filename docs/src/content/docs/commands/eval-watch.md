---
title: eval:watch
description: Evaluate a JavaScript watcher file and print the resulting JSON.
---

Evaluates a `.js` watcher file in the DSL context and prints the compiled Elasticsearch watcher JSON. Useful for debugging and validating JS watchers before deploying.

## Usage

```bash
orwell eval:watch <path> [options]
```

## Arguments

| Argument | Description |
|---|---|
| `<path>` | Path to the `watcher.*.js` file |

## Options

| Flag | Alias | Default | Description |
|---|---|---|---|
| `--project-id <id>` | `-p` | | Project ID prefix used in script references |

## Example

```bash
orwell eval:watch src/payments/order-failure/watcher.non-prod.js --project-id acme
```

Output:

```json
{
  "trigger": {
    "schedule": { "interval": "1h" }
  },
  "input": {
    "chain": {
      "inputs": [
        {
          "logs": {
            "search": {
              "request": {
                "indices": ["app-logs-*"],
                "body": { ... }
              }
            }
          }
        }
      ]
    }
  },
  "condition": {
    "compare": { "ctx.payload.logs.hits.total": { "gt": 0 } }
  },
  "actions": {
    "notify_slack": {
      "webhook": { ... }
    }
  }
}
```

## Notes

- The watcher file must live inside a valid folder structure (`{group}/{alert-name}/`) so Orwell can derive the alert ID for script references.
- This command only evaluates the watcher file — it does not transpile Groovy scripts or contact Elasticsearch.
- For JSON watchers, use a regular text editor or `cat` instead.
