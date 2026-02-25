---
title: input() & query()
description: Define what data the watcher fetches before evaluating its condition.
---

## `input()`

Sets the watcher's input as a [chain input](https://www.elastic.co/guide/en/elasticsearch/reference/current/input-chain.html). Each key in the object becomes a named input in the chain.

### Signature

```ts
input(spec: Record<string, any>): void
```

### How it works

- **Primitive values** (`string`, `number`, `boolean`, plain objects) become `simple` (static) inputs.
- **`query()` or `rawQuery()` values** become `search` inputs.

### Examples

#### Static values only

```js
input({
  env: 'NON-PROD',
  threshold: 5,
})
```

Produces a chain with a single `simple` input:

```json
{
  "input": {
    "chain": {
      "inputs": [
        {
          "static": {
            "simple": { "env": "NON-PROD", "threshold": 5 }
          }
        }
      ]
    }
  }
}
```

#### Mix of static and query inputs

```js
input({
  env: 'PROD',
  logs: query({
    indexes: ['app-*'],
    timeRange: '-1h to now',
    query: 'error',
  })
})
```

Produces a chain with a `simple` input followed by a named `search` input:

```json
{
  "input": {
    "chain": {
      "inputs": [
        { "static": { "simple": { "env": "PROD" } } },
        {
          "logs": {
            "search": {
              "request": {
                "indices": ["app-*"],
                "body": { ... }
              }
            }
          }
        }
      ]
    }
  }
}
```

The `ctx.payload.logs` path then holds the search result in subsequent steps.

---

## `query()`

Builds an Elasticsearch search input with a high-level API.

### Signature

```ts
query(spec: {
  indexes: string[],
  timeRange: string,
  query?: string,
  filters?: Record<string, any>,
}): QuerySpec
```

### Parameters

| Field | Required | Description |
|---|---|---|
| `indexes` | Yes | Array of index patterns |
| `timeRange` | Yes | Time window string, e.g. `'-1h to now'` |
| `query` | No | Full-text search string (maps to `match` on all fields) |
| `filters` | No | Key-value pairs for `term` filters; values can be [comparison operators](/dsl/operators/) |

### Example

```js
input({
  logs: query({
    indexes: ['eks-*'],
    timeRange: '-2h to now',
    query: 'Failed to create order',
    filters: {
      'kubernetes.pod_name': isOneOf('api-service', 'worker'),
      'log.level': 'error',
    }
  })
})
```

---

## `rawQuery()`

Bypasses the query builder and passes a raw Elasticsearch input body.

### Signature

```ts
rawQuery(body: object): QuerySpec
```

### Example

```js
input({
  results: rawQuery({
    search: {
      request: {
        indices: ['.watcher-history-*'],
        body: {
          query: {
            bool: {
              filter: [
                { term: { 'watch_id': 'my-watcher' } },
                { range: { 'result.execution_time': { gte: 'now-2h' } } }
              ]
            }
          }
        }
      }
    }
  })
})
```
