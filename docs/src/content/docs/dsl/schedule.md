---
title: schedule()
description: Set the trigger schedule for a watcher.
---

Sets the trigger that determines how often Elasticsearch evaluates the watcher.

## Signature

```ts
schedule(spec: { interval: string }): void
```

## Usage

```js
schedule({ interval: '2h' })
```

## Parameters

| Field | Type | Description |
|---|---|---|
| `interval` | string | Run frequency. Supports Elasticsearch time units: `30m`, `1h`, `6h`, `1d`, etc. |

## Examples

```js
schedule({ interval: '30m' })   // every 30 minutes
schedule({ interval: '1h' })    // every hour
schedule({ interval: '6h' })    // every 6 hours
schedule({ interval: '1d' })    // once a day
```

## Resulting JSON

```json
{
  "trigger": {
    "schedule": { "interval": "2h" }
  }
}
```

:::note
`schedule()` maps directly to the Elasticsearch Watcher [`schedule` trigger](https://www.elastic.co/guide/en/elasticsearch/reference/current/trigger-schedule.html). Only `interval` is supported by the DSL. For cron-based schedules, use a raw `module.exports` watcher.
:::
