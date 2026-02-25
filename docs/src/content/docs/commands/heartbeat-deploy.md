---
title: heartbeat:deploy
description: Deploy a heartbeat watcher that monitors your other watchers.
---

Builds and deploys a special watcher that monitors the execution history of your other watchers and fires a Slack alert if any fail to run on schedule.

## Usage

```bash
orwell heartbeat:deploy [options]
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--endpoint <url>` | `$ELASTIC_ENDPOINT` | Elasticsearch URL |
| `--api-key <key>` | `$ELASTIC_API_KEY` | API key authentication |
| `--username <user>` | `$ELASTIC_USERNAME` | Basic auth username |
| `--password <pass>` | `$ELASTIC_PASSWORD` | Basic auth password |
| `--config-path <path>` | `./orwell.js` | Path to config file |
| `--base-dir <dir>` | `src` | Root folder for alerts |
| `--dry-run` | | Print watcher JSON without deploying |
| `--verbose` | | Extra logging |

## Configuration file

The heartbeat watcher is driven by `orwell.js` at the project root:

```js
// orwell.js
module.exports = {
  baseDir: 'src',
  heartbeat: {
    projectId: 'acme',          // optional prefix
    alerts: [
      'payments/order-failure',
      'payments/refund-stuck',
      'infra/disk-high',
    ],
    action: {
      slack: {
        path: process.env.SLACK_HOOK_PATH,
      },
    },
    indices: ['.watcher-history-*'],
    interval: '2h',
  },
};
```

### Config fields

| Field | Required | Description |
|---|---|---|
| `heartbeat.alerts` | Yes | Array of `{group}/{alert-name}` paths to monitor |
| `heartbeat.action.slack.path` | Yes | Slack incoming webhook path (e.g. `/services/T.../B.../...`) |
| `heartbeat.indices` | Yes | Elasticsearch indices for watcher history |
| `heartbeat.interval` | Yes | How often the heartbeat runs (e.g. `1h`, `30m`) |
| `heartbeat.projectId` | No | Prefixes the heartbeat watcher ID |

## Deployed watcher ID

```
{projectId}-heartbeat
```

If `projectId` is not set: `orwell-heartbeat`.

## How it works

1. Reads `orwell.js` and builds a watcher that:
   - Searches `.watcher-history-*` for recent executions of each monitored alert.
   - Fires a Slack notification listing any alerts that have **not** executed in the configured interval.
2. Deploys the watcher via `PUT /_watcher/watch/{id}`.

## Example

```bash
orwell heartbeat:deploy \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --config-path ./orwell.js \
  --dry-run
```
