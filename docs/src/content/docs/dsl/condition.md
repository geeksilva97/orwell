---
title: condition()
description: Set the condition that determines whether the watcher fires its actions.
---

Sets the condition the watcher evaluates after fetching its input. If the condition is false, actions are skipped.

## Signature

```ts
condition(spec: Record<string, ComparisonOperator> | { script: string }): void
```

## Comparison-based condition

Pass an object whose keys are `ctx.payload` paths and whose values are [comparison operators](/dsl/operators/).

```js
condition({ 'logs.hits.total': gt(0) })
```

Multiple keys are ANDed together:

```js
condition({
  'logs.hits.total': gt(0),
  'errors.hits.total': gte(5),
})
```

### Resulting JSON

```json
{
  "condition": {
    "compare": {
      "ctx.payload.logs.hits.total": { "gt": 0 }
    }
  }
}
```

## Script-based condition

Pass `{ script: '<painless code>' }` for more complex logic:

```js
condition({
  script: 'return ctx.payload.logs.hits.total > ctx.payload.threshold;'
})
```

To reference a Groovy file instead:

```js
condition({ script: script('./condition.groovy') })
```

### Resulting JSON

```json
{
  "condition": {
    "script": {
      "id": "my-group-my-alert-condition"
    }
  }
}
```

## Examples

### Fire if any log hits found

```js
condition({ 'logs.hits.total': gt(0) })
```

### Fire if error count exceeds threshold

```js
condition({ 'errors.hits.total': gte(10) })
```

### Always fire (useful for testing)

Use `module.exports` directly with `"always": {}` if you want an always-true condition, since `condition()` requires a comparison or script.

```js
module.exports = {
  // ...
  condition: { always: {} },
  // ...
};
```
