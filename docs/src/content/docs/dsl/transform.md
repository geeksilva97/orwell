---
title: transform()
description: Add a transformation step that reshapes the payload before actions run.
---

Adds a [transform](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform.html) that runs after the condition and before the actions. Transforms reshape `ctx.payload` so your action templates have the data they need.

## Signature

```ts
transform(spec: ScriptRef | object): void
```

## With a Groovy script

The most common pattern: pass `script()` to reference a `.groovy` file.

```js
transform(script('./transform.groovy'))
```

This sets the watcher-level transform. The script receives `ctx.payload` and must return the new payload object.

### Resulting JSON

```json
{
  "transform": {
    "script": {
      "id": "payments-order-failure-transform"
    }
  }
}
```

## `script()` reference

```ts
script(relativePath: string): { id: string }
```

`script()` takes a path relative to the watcher file and returns a stored script reference. The ID is derived from the alert folder:

```
{projectId-}{group}-{alert-name}-{filename-without-extension}
```

Example: `script('./transform.groovy')` inside `payments/order-failure/watcher.js` returns:

```json
{ "id": "payments-order-failure-transform" }
```

The `.groovy` file is deployed separately before the watcher itself (see [`push`](/commands/push/)).

## Example: building a Slack payload

```groovy
// transform.groovy
#include "../../shared/shared.groovy"

def hits = ctx.payload.logs.hits.hits;
def count = ctx.payload.logs.hits.total.value;
def env = ctx.payload.static.env;

return [
  count: count,
  service: 'payments-api',
  env: env,
  logsUrl: buildLogsUrl(hits),
  slackHookPath: '/services/T000/B000/xxxx',
];
```

## Watcher-level vs action-level transforms

`transform()` at the top level sets a **watcher-level** transform that runs once. You can also set a per-action transform inside `webhookAction()`:

```js
// watcher-level: runs before all actions
transform(script('./transform.groovy'))

webhookAction({
  name: 'notify_slack',
  // action-level: overrides payload for this action only
  transform: script('./slack-transform.groovy'),
  // ...
})
```

If both are set, the action-level transform runs after the watcher-level one and its output is what the action templates see.
