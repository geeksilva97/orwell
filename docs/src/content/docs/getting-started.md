---
title: Getting started
description: Install Orwell and deploy your first alert in minutes.
---

## Install

```bash
npm install -g @orwellg/cli
```

Or run directly from source:

```bash
git clone <repo-url> && cd orwell
npm install
node ./bin/orwell.ts --version
```

Requires **Node.js >= 24**.

---

## Quick start

### 1. Scaffold a new alert project

```bash
orwell scaffold --name my-first-alert --group-name payments
```

This creates:

```
src/
  payments/
    my-first-alert/
      watcher.non-prod.json
      script.groovy
  shared/
    shared.groovy
```

### 2. Edit the watcher definition

Open `src/payments/my-first-alert/watcher.non-prod.json` and replace it with a JavaScript-based watcher for more flexibility:

```
src/payments/my-first-alert/
  watcher.non-prod.js       ← rename or add alongside the .json
  script.groovy
```

```js
// watcher.non-prod.js
schedule({ interval: '1h' })

input({
  logs: query({
    indexes: ['app-logs-*'],
    timeRange: '-1h to now',
    query: 'payment failed',
  })
})

condition({ 'logs.hits.total': gt(0) })

webhookAction({
  name: 'notify_slack',
  message: markdown('./message.md'),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.metadata.slackHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  }
})
```

Create a `message.md` alongside it:

```markdown
# {{ctx.payload.count}} Payment Failures

Service **{{ctx.payload.service}}** reported payment failures in the last hour.
```

### 3. Preview the deployment

```bash
orwell push \
  --endpoint https://your-elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --target non-prod \
  --dry-run
```

Dry-run prints the HTTP requests that would be sent without touching Elasticsearch.

### 4. Deploy

```bash
orwell push \
  --endpoint https://your-elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --target non-prod
```

Orwell compares your current branch against `main`, finds `my-first-alert`, and deploys it.

---

## How Orwell finds changed alerts

Orwell runs `git diff` between your working branch and the main branch. Any alert whose files appear in the diff gets deployed. This means:

- You only touch Elasticsearch for things that actually changed.
- CI/CD is fast: each PR deploys only its own changes.
- Deleting an alert file does **not** remove it from Elasticsearch automatically — use [`sync`](/commands/sync/) for that.

---

## Alert ID format

Each alert gets a deterministic ID:

```
{projectId-}{group}-{alert-name}
```

Examples:

| `--project-id` | group | alert name | Watcher ID |
|---|---|---|---|
| _(none)_ | `payments` | `my-first-alert` | `payments-my-first-alert` |
| `acme` | `payments` | `my-first-alert` | `acme-payments-my-first-alert` |
