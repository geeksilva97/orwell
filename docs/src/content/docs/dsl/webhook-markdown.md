---
title: webhookAction() & markdown()
description: Send Slack notifications via webhook actions with Markdown templates.
---

## `webhookAction()`

Adds a webhook action to the watcher. Typically used to post messages to Slack.

### Signature

```ts
webhookAction(spec: {
  name: string,
  transform?: ScriptRef,
  throttle_period?: string,
  message?: SlackBlockKit,
  configs: WebhookConfig,
}): void
```

### Parameters

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Action name (unique within the watcher) |
| `configs` | Yes | Elasticsearch webhook config (scheme, host, port, method, path, body) |
| `transform` | No | Per-action transform (see [`transform()`](/dsl/transform/)) |
| `throttle_period` | No | Minimum time between firings, e.g. `'5m'`, `'1h'` |
| `message` | No | Result of `markdown()` — compiles MD to Slack Block Kit and injects it as the body |

### Example: Slack with markdown template

```js
webhookAction({
  name: 'notify_slack',
  throttle_period: '30m',
  transform: script('./transform.groovy'),
  message: markdown('./message.md', {
    actions: [
      { text: 'View Logs', url: '{{ctx.payload.logsUrl}}' },
    ],
    context: [
      { text: '{{ctx.payload.env}}', url: '{{ctx.payload.watchUrl}}' },
    ],
  }),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.slackHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  }
})
```

When `message` is provided, Orwell injects the compiled Slack Block Kit JSON into the watcher body template. The body field should always reference `ctx.payload.message`.

### Example: multiple actions

```js
webhookAction({
  name: 'notify_team_a',
  message: markdown('./message.md'),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.teamAHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  }
})

webhookAction({
  name: 'notify_team_b',
  message: markdown('./message.md'),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.teamBHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  }
})
```

---

## `markdown()`

Compiles a Markdown file to [Slack Block Kit](https://api.slack.com/block-kit) JSON. The result is embedded inside the watcher body template.

### Signature

```ts
markdown(path: string, options?: {
  actions?: Array<{ text: string, url: string }>,
  context?: Array<{ text: string, url: string }>,
}): SlackBlockKit
```

### Parameters

| Field | Description |
|---|---|
| `path` | Path to the `.md` file, relative to the watcher file |
| `options.actions` | Buttons rendered at the bottom of the message |
| `options.context` | Footer links rendered in the context block |

### Markdown → Block Kit mapping

| Markdown element | Slack Block |
|---|---|
| `# Heading` | `header` block (plain_text) |
| Paragraph | `section` block (mrkdwn) |
| `- List item` | `section` block with bullet list |
| `1. List item` | `section` block with numbered list |
| `> Blockquote` | `section` block with `>` prefix |
| `---` | `divider` block |
| `**bold**` | `*bold*` (Slack mrkdwn) |
| `_italic_` | `_italic_` (Slack mrkdwn) |
| `` `code` `` | `` `code` `` (Slack mrkdwn) |
| `[text](url)` | `<url\|text>` (Slack mrkdwn) |

### Example

`message.md`:

```markdown
# {{ctx.payload.count}} Payment Failures

Service **{{ctx.payload.service}}** reported failures in the last 2 hours.

---

- Environment: {{ctx.payload.env}}
- First seen: {{ctx.payload.firstSeen}}
```

Watcher:

```js
webhookAction({
  name: 'notify_slack',
  message: markdown('./message.md', {
    actions: [
      { text: 'View Logs', url: '{{ctx.payload.logsUrl}}' },
      { text: 'Dashboard', url: '{{ctx.payload.dashboardUrl}}' },
    ],
    context: [
      { text: '{{ctx.payload.env}}', url: '{{ctx.payload.watchUrl}}' },
    ],
  }),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.slackHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  }
})
```

The `{{ctx.payload.*}}` placeholders are Mustache templates resolved by Elasticsearch at runtime.

---

## `metadata()`

Attaches arbitrary metadata to the watcher. Values are accessible as `ctx.metadata.*` in templates and scripts.

### Signature

```ts
metadata(spec: Record<string, any>): void
```

### Example

```js
metadata({
  slackHookPath: process.env.SLACK_HOOK_PATH,
  environment: 'NON-PROD',
})
```

Access in Mustache templates:

```
{{ctx.metadata.slackHookPath}}
```
