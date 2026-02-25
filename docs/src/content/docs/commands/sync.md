---
title: sync
description: Push changed alerts and remove deleted ones from Elasticsearch.
---

A full bidirectional sync: deploys changed alerts and removes watchers whose definition files no longer exist.

## Usage

```bash
orwell sync [options]
```

## Options

Accepts all options from [`push`](/commands/push/), plus:

| Flag | Default | Description |
|---|---|---|
| `--remove-only` | | Only delete watchers, skip push |
| `--push-only` | | Only push changed alerts, skip deletion |

`--remove-only` and `--push-only` are mutually exclusive.

## How it works

Without flags, `sync` runs both phases:

1. **Push phase** — identical to [`push`](/commands/push/): detects changed alerts via `git diff` and deploys them.
2. **Remove phase** — lists all watchers in Elasticsearch whose IDs match the project prefix, then deletes any that no longer exist on disk.

## Examples

### Full sync (push + remove)

```bash
orwell sync \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --target server-a.non-prod
```

### Dry-run

Preview both operations without touching Elasticsearch:

```bash
orwell sync \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --target server-a.non-prod \
  --dry-run
```

### Remove only

Useful after bulk-deleting alert folders:

```bash
orwell sync \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --remove-only
```

### Push only

Equivalent to `push`, but using the `sync` command:

```bash
orwell sync \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --push-only
```

## When to use sync vs push

| Situation | Command |
|---|---|
| PR merge: deploy new/changed alerts | `push` |
| PR merge: deploy changes and clean up deleted alerts | `sync` |
| Bulk cleanup after removing many alerts | `sync --remove-only` |
| Validate changes without touching ES | either with `--dry-run` |
