---
title: JavaScript DSL overview
description: Write Elasticsearch Watchers in JavaScript with the Orwell DSL.
---

Instead of writing raw Elasticsearch Watcher JSON, you can define alerts in JavaScript using the Orwell DSL. JS watchers are more concise, composable, and easier to review.

## When to use `.js` vs `.json`

| Format | Use when |
|---|---|
| `.json` | Simple static watchers, no dynamic logic |
| `.js` | Script references, query composition, Slack markdown, environment-based logic |

Both formats are supported and can coexist in the same alert folder.

## How DSL files work

A file named `watcher.*.js` is evaluated in an isolated VM context. A set of global functions — `schedule`, `input`, `condition`, `transform`, `webhookAction`, `metadata`, `query`, `rawQuery`, `script`, `markdown` — are injected into that context.

You call these functions at the top level. Order does not matter. Orwell assembles the final Elasticsearch Watcher JSON from whatever you called.

```js
// watcher.server-a.non-prod.js

schedule({ interval: '2h' })

input({
  env: 'NON-PROD',
  logs: query({
    indexes: ['eks-*'],
    timeRange: '-2h to now',
    query: 'payment failed',
  })
})

condition({ 'logs.hits.total': gt(0) })

transform(script('./transform.groovy'))

webhookAction({
  name: 'notify_slack',
  transform: script('./transform.groovy'),
  message: markdown('./message.md', {
    actions: [{ text: 'View Logs', url: '{{ctx.payload.logsUrl}}' }],
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

## Available globals

| Function | Purpose |
|---|---|
| [`schedule(spec)`](/dsl/schedule/) | Set the trigger schedule |
| [`input(spec)`](/dsl/input-query/) | Define chain inputs (static values and/or queries) |
| [`query(spec)`](/dsl/input-query/#query) | Build an Elasticsearch search input |
| [`rawQuery(body)`](/dsl/input-query/#rawquery) | Pass a raw search input object |
| [`condition(spec)`](/dsl/condition/) | Set the condition for firing |
| [`transform(spec)`](/dsl/transform/) | Add a transformation step |
| [`webhookAction(spec)`](/dsl/webhook-markdown/) | Add a webhook (Slack) action |
| [`metadata(spec)`](/dsl/webhook-markdown/#metadata) | Attach metadata to the watcher |
| [`script(path)`](/dsl/transform/#script) | Reference a Groovy script file |
| [`markdown(path, opts?)`](/dsl/webhook-markdown/#markdown) | Compile a Markdown file to Slack Block Kit |
| `gt`, `gte`, `lt`, `lte`, `eq`, `notEq`, `isOneOf` | [Comparison operators](/dsl/operators/) |

## Escaping to raw `module.exports`

If the DSL globals don't cover your use case, you can export a plain object instead:

```js
// watcher.server-a.non-prod.js
module.exports = {
  trigger: { schedule: { interval: '1h' } },
  input: { simple: { env: 'NON-PROD' } },
  condition: { always: {} },
  actions: {},
};
```

Orwell detects that no DSL functions were called and uses `module.exports` directly.
