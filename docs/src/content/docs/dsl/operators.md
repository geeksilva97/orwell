---
title: Comparison operators
description: Operators for condition() and query() filters.
---

Comparison operators are global functions available in JS watcher files. Use them inside [`condition()`](/dsl/condition/) and the `filters` field of [`query()`](/dsl/input-query/).

## Reference

| Operator | Description | JSON output |
|---|---|---|
| `gt(value)` | Greater than | `{ "gt": value }` |
| `gte(value)` | Greater than or equal | `{ "gte": value }` |
| `lt(value)` | Less than | `{ "lt": value }` |
| `lte(value)` | Less than or equal | `{ "lte": value }` |
| `eq(value)` | Equal | `{ "eq": value }` |
| `notEq(value)` | Not equal | `{ "not_eq": value }` |
| `isOneOf(...values)` | Match any of the provided values | `{ "is_one_of": [values] }` |

## Usage in `condition()`

```js
condition({ 'logs.hits.total': gt(0) })
condition({ 'errors.hits.total': gte(5) })
condition({ 'response_time_ms': lt(500) })
```

Multiple conditions are ANDed:

```js
condition({
  'errors.hits.total': gte(5),
  'warnings.hits.total': lt(100),
})
```

## Usage in `query()` filters

```js
input({
  logs: query({
    indexes: ['app-*'],
    timeRange: '-1h to now',
    filters: {
      'status': eq('error'),
      'http.response.status_code': gte(500),
      'kubernetes.pod_name': isOneOf('api', 'worker', 'scheduler'),
    }
  })
})
```

## `isOneOf` with multiple values

```js
filters: {
  'log.level': isOneOf('error', 'fatal'),
}
```

Maps to an Elasticsearch `terms` query for the matching field.
