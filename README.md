# Orwell CLI

A command-line tool for managing Elasticsearch Watcher alerts as code.

Orwell lets you define, version-control, and deploy watcher-based alerts to Elasticsearch from your terminal. Instead of clicking through Kibana, you keep alert definitions in your repo and push changes through git.

## Install

```bash
npm install -g @orwellg/cli
```

Or run locally from the repo:

```bash
git clone <repo-url> && cd orwell
npm install
node ./bin/orwell --version
```

Requires Node.js >= 22.

## Quick start

Scaffold a new alert project:

```bash
orwell scaffold --server server-a --name my-alert
```

This creates:

```
src/
  alert-group/
    my-alert/
      watcher.server-a.non-prod.json
      script.groovy
  shared/
    shared.groovy
```

Preview what would be deployed:

```bash
orwell push --endpoint $ELASTIC_ENDPOINT --api-key $ELASTIC_API_KEY \
  --target server-a.non-prod --dry-run
```

Deploy for real:

```bash
orwell push --endpoint $ELASTIC_ENDPOINT --api-key $ELASTIC_API_KEY \
  --target server-a.non-prod
```

## How it works

Orwell uses **git diff** to detect which alerts changed between your branch and main, then deploys only those alerts to Elasticsearch via the Watcher API. Each alert is a folder containing a watcher definition (JSON or JS) and an optional Painless script.

The alert ID is derived from the folder path: `{group}-{alert-name}`, optionally prefixed with a project ID.

## Commands

### `scaffold`

Create a new alert project with the right folder structure.

```bash
orwell scaffold \
  --server <server-name> \
  --name <alert-name> \
  -g, --group-name <group>    # default: alert-group
  --base-dir <dir>             # default: src
  --dest <dir>                 # default: current directory
  --no-git                     # skip git init
```

### `push`

Deploy changed alerts to Elasticsearch. Only alerts that differ from the main branch get pushed.

```bash
orwell push \
  --endpoint <url> \
  --api-key <key> \
  --target <server.env>        # e.g. server-a.non-prod
  -p, --project-id <id>       # prefix for alert IDs
  --base-dir <dir>             # default: src
  --main-branch <branch>      # default: main
  --dry-run                    # preview without deploying
```

### `sync`

Full bidirectional sync: pushes changed alerts and deletes removed ones.

```bash
orwell sync \
  --endpoint <url> \
  --api-key <key> \
  --target <server.env>
  --remove-only                # only delete
  --push-only                  # only push
  --dry-run
```

Accepts the same options as `push`, plus `--remove-only` and `--push-only`.

### `eval:watch`

Evaluate a JavaScript watcher file and print the resulting JSON. Useful for debugging JS-based watchers.

```bash
orwell eval:watch <path-to-watcher.js> --project-id <id>
```

### `heartbeat:deploy`

Build and deploy the heartbeat watcher directly to Elasticsearch.

```bash
orwell heartbeat:deploy \
  --base-dir src \
  --config-path ./orwell.js \
  --endpoint <url> \
  --api-key <key> \
  --dry-run                      # preview without deploying
```

The watcher ID is derived from the project ID: `{projectId}-heartbeat` (or `orwell-heartbeat` if no project ID is set). Supports `--dry-run` to print the watcher JSON without deploying.

Authentication options are the same as `push` and `sync` (`--api-key`, `--username`/`--password`, or the corresponding env vars).

## Folder structure

```
src/
  shared/
    shared.groovy              # shared Painless code, available via #include
  <group>/
    <alert-name>/
      watcher.json             # watcher definition
      script.groovy            # optional Painless script
```

Alerts are organized by group. Each alert folder contains at least one watcher file and optionally a Painless script.

### Watcher file naming

The filename determines which server and environment the watcher deploys to:

| Filename | Deploys to |
|---|---|
| `watcher.json` | All servers, all environments |
| `watcher.server-a.json` | server-a only, all environments |
| `watcher.server-b.prod.json` | server-b production only |
| `watcher.server-a.non-prod.json` | server-a non-prod only |

Pattern: `watcher[.server][.environment].json` (or `.js`)

### Painless scripts

Scripts must be named `script.groovy`. They support `#include` directives to pull in shared code:

```groovy
#include "../../shared/shared.groovy"

// your script logic here
```

## JavaScript watchers

For more complex watchers, you can use JavaScript instead of JSON. This lets you compose watchers programmatically, reference scripts, and use environment variables.

```javascript
// watcher.server-a.non-prod.js
const { webhook } = require('./base');
const transformScript = script('../path/to/transform.groovy');

module.exports = {
  trigger: { schedule: { interval: "2h" } },
  input: {
    chain: {
      inputs: [
        { static: { simple: { env: "NON-PROD" } } },
        { logs: { search: { /* ... */ } } }
      ]
    }
  },
  condition: { script: script('./condition.groovy') },
  transform: { chain: [{ script: transformScript }] },
  actions: {
    send_slack_message: {
      transform: { script: transformScript },
      webhook
    }
  }
};
```

The `script()` function is globally available in JS watchers. It takes a path to a `.groovy` file and returns `{ id: "<alert-id>-<filename>" }`, which Elasticsearch uses to reference stored scripts.

## Configuration

The `orwell.js` config file is used by the `heartbeat:deploy` command:

```javascript
module.exports = {
  baseDir: 'src',
  heartbeat: {
    projectId: 'my-project',       // optional, prefixes alert and watcher IDs
    alerts: [
      'in-person-selling/reconext-shipment-failure',
      'in-person-selling/shipping-release-scanner',
    ],
    action: {
      slack: { path: process.env.SLACK_HOOK_PATH }
    },
    indices: ['.watcher-history-*'],
    interval: '2h',
  }
};
```

## Authentication

Orwell supports two authentication methods for Elasticsearch:

**API Key** (preferred):
```bash
orwell push --endpoint https://my-elastic:9200 --api-key <key>
```

**Basic auth:**
```bash
orwell push --endpoint https://my-elastic:9200 --username <user> --password <pass>
```

Both can also be set via environment variables:

```bash
export ELASTIC_ENDPOINT=https://my-elastic:9200
export ELASTIC_API_KEY=your-api-key
# or
export ELASTIC_USERNAME=user
export ELASTIC_PASSWORD=pass
```

## Running tests

```bash
npm test
```

Uses the Node.js built-in test runner (`node --test`).

### Integration tests

Integration tests deploy real watchers to a local Elasticsearch instance:

```bash
docker-compose up -d          # starts ES on localhost:19200 + Kibana on localhost:15601
npm test                      # runs all tests including integration
docker-compose down
```

## License

MIT
