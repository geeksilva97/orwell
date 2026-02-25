---
title: Painless scripts
description: Write and share Groovy-syntax Painless scripts for transforms and conditions.
---

Elasticsearch Watchers run [Painless](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-painless.html) scripts for transforms and conditions. Orwell stores them as `.groovy` files and deploys them as stored scripts before deploying the watcher.

## File naming

Orwell looks for `script.groovy` inside each alert folder:

```
src/payments/order-failure/
  watcher.non-prod.js
  script.groovy          ← Painless script (deployed as stored script)
```

You can have multiple scripts by naming them descriptively and referencing them with `script()`:

```
src/payments/order-failure/
  watcher.non-prod.js
  transform.groovy
  condition.groovy
```

```js
// watcher.non-prod.js
transform(script('./transform.groovy'))
condition({ script: script('./condition.groovy') })
```

## Deployed script ID

Script IDs follow the same pattern as alert IDs:

```
{projectId-}{group}-{alert-name}-{filename-without-extension}
```

Example: `transform.groovy` in `payments/order-failure/` → `payments-order-failure-transform`.

## `#include` directives

Orwell preprocesses `.groovy` files and resolves `#include` before deploying. This lets you share helper functions across multiple alerts.

```groovy
// script.groovy
#include "../../shared/shared.groovy"

// your alert-specific logic below
def hits = ctx.payload.logs.hits.hits;
```

```groovy
// shared/shared.groovy
String buildLogsUrl(def hits) {
  // ...
}
```

The `#include` path is relative to the including file. After preprocessing, the content of `shared.groovy` is inlined at the `#include` line.

:::caution
Functions must appear at the beginning of Painless scripts — before any statement-level code. Place all function definitions from `#include` files at the top.
:::

## Writing transforms

A transform script must return a `Map` (Groovy map / Painless map). This becomes the new `ctx.payload`:

```groovy
#include "../../shared/shared.groovy"

def hits   = ctx.payload.logs.hits.hits;
def count  = ctx.payload.logs.hits.total.value;
def env    = ctx.payload.static.env;

return [
  count:         count,
  service:       'payments-api',
  env:           env,
  firstFailure:  hits.size() > 0 ? hits[0]._source['@timestamp'] : '',
  logsUrl:       buildLogsUrl(hits),
  slackHookPath: '/services/T000/B000/xxxx',
  message:       [:],   // populated by webhookAction message template
];
```

## Writing conditions

A condition script must return a `boolean`:

```groovy
return ctx.payload.logs.hits.total.value > ctx.payload.static.threshold;
```

## Shared scripts

Put reusable functions in `src/shared/shared.groovy`. The `scaffold` command creates this file automatically.

```groovy
// src/shared/shared.groovy

String buildLogsUrl(def hits) {
  if (hits.isEmpty()) { return ''; }
  def ts = hits[0]._source['@timestamp'];
  return 'https://kibana.example.com/app/logs?timestamp=' + ts;
}

boolean isHighSeverity(def payload) {
  return payload.logs.hits.total.value >= 10;
}
```

## Debugging scripts

1. Use `orwell eval:watch` to compile the watcher JSON and verify script IDs are correct.
2. Run `orwell push --dry-run` to see what HTTP requests would be sent, including the script payload.
3. After deploying, test the watcher via Kibana → Stack Management → Watcher → Run now.
