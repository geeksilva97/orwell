---
title: push
description: Deploy changed alerts to Elasticsearch using git diff.
---

Detects which alerts changed between your branch and `main`, then deploys only those to Elasticsearch.

## Usage

```bash
orwell push [options]
```

## Options

| Flag | Alias | Default | Description |
|---|---|---|---|
| `--endpoint <url>` | | `$ELASTIC_ENDPOINT` | Elasticsearch URL |
| `--api-key <key>` | | `$ELASTIC_API_KEY` | API key authentication |
| `--username <user>` | | `$ELASTIC_USERNAME` | Basic auth username |
| `--password <pass>` | | `$ELASTIC_PASSWORD` | Basic auth password |
| `--target <server.env>` | | | Filter: only deploy watchers matching this target |
| `--project-id <id>` | `-p` | | Prefix added to all alert IDs |
| `--base-dir <dir>` | | `src` | Root folder that contains alert groups |
| `--main-branch <branch>` | | `main` | Branch to diff against |
| `--diff-branch <branch>` | `-b` | current branch | Branch being compared |
| `--dry-run` | | | Print HTTP requests without deploying |

## How it works

1. Runs `git diff <main-branch>...<diff-branch>` to list changed files.
2. Finds the alert folder for each changed file.
3. Filters alerts by `--target` if provided (see [File naming & targeting](/guides/file-naming/)).
4. Deploys each matching alert via the Elasticsearch Watcher API (`PUT /_watcher/watch/{id}`).
5. If an alert has a Painless script, deploys it first via `PUT /_scripts/{id}`.

## Examples

### Dry-run before deploying

```bash
orwell push \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --target server-a.non-prod \
  --dry-run
```

### Deploy to production

```bash
orwell push \
  --endpoint https://elastic-prod:9200 \
  --api-key $ELASTIC_API_KEY \
  --target server-a.prod
```

### With project ID prefix

```bash
orwell push \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --project-id acme \
  --target server-a.non-prod
```

Alert IDs become `acme-{group}-{name}`.

### Compare a specific branch

```bash
orwell push \
  --endpoint https://elastic:9200 \
  --api-key $ELASTIC_API_KEY \
  --diff-branch feature/new-alerts \
  --main-branch develop
```

### Using environment variables (recommended for CI)

```bash
export ELASTIC_ENDPOINT=https://elastic:9200
export ELASTIC_API_KEY=your-key-here

orwell push --target server-a.non-prod
```

## Notes

- `push` never deletes watchers. Use [`sync`](/commands/sync/) if you also want to remove deleted alerts.
- If `--target` is omitted, all changed alerts are deployed regardless of their filename target.
- `--dry-run` is safe to run in CI to validate that alert JSON compiles correctly before merging.
