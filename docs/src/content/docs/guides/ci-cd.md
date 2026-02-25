---
title: CI/CD integration
description: Automate alert deployment in GitHub Actions and other CI systems.
---

The typical CI/CD workflow for Orwell:

1. Developer opens a PR with alert changes.
2. CI runs `--dry-run` to validate the watcher JSON compiles correctly.
3. PR is merged to `main`.
4. CI runs `push` (or `sync`) against the target environment.

## GitHub Actions

### Validate on PR (dry-run)

```yaml
# .github/workflows/validate-alerts.yml
name: Validate alerts

on:
  pull_request:
    paths:
      - 'src/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0     # required: Orwell needs git history for diff

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Dry-run push (non-prod)
        run: |
          node ./bin/orwell push \
            --endpoint $ELASTIC_ENDPOINT \
            --api-key $ELASTIC_API_KEY \
            --target server-a.non-prod \
            --dry-run
        env:
          ELASTIC_ENDPOINT: ${{ secrets.ELASTIC_NONPROD_ENDPOINT }}
          ELASTIC_API_KEY: ${{ secrets.ELASTIC_NONPROD_API_KEY }}
```

:::caution
Always use `fetch-depth: 0` in your checkout step. Without the full git history, Orwell cannot compute the diff against `main` and will deploy nothing (or everything, depending on the fallback).
:::

### Deploy on merge to main

```yaml
# .github/workflows/deploy-alerts.yml
name: Deploy alerts

on:
  push:
    branches: [main]
    paths:
      - 'src/**'

jobs:
  deploy-non-prod:
    runs-on: ubuntu-latest
    environment: non-prod
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Deploy to non-prod
        run: |
          node ./bin/orwell sync \
            --target server-a.non-prod \
            --project-id acme
        env:
          ELASTIC_ENDPOINT: ${{ secrets.ELASTIC_NONPROD_ENDPOINT }}
          ELASTIC_API_KEY: ${{ secrets.ELASTIC_NONPROD_API_KEY }}

  deploy-prod:
    runs-on: ubuntu-latest
    environment: prod
    needs: deploy-non-prod
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Deploy to prod
        run: |
          node ./bin/orwell sync \
            --target server-a.prod \
            --project-id acme
        env:
          ELASTIC_ENDPOINT: ${{ secrets.ELASTIC_PROD_ENDPOINT }}
          ELASTIC_API_KEY: ${{ secrets.ELASTIC_PROD_API_KEY }}
```

## Deploy the heartbeat

The heartbeat watcher only needs to be re-deployed when `orwell.js` changes:

```yaml
# .github/workflows/deploy-heartbeat.yml
name: Deploy heartbeat

on:
  push:
    branches: [main]
    paths:
      - 'orwell.js'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: Deploy heartbeat
        run: node ./bin/orwell heartbeat:deploy --config-path ./orwell.js
        env:
          ELASTIC_ENDPOINT: ${{ secrets.ELASTIC_ENDPOINT }}
          ELASTIC_API_KEY: ${{ secrets.ELASTIC_API_KEY }}
          SLACK_HOOK_PATH: ${{ secrets.SLACK_HOOK_PATH }}
```

## Multiple servers

If you deploy to multiple servers, run `push` once per server in parallel:

```yaml
strategy:
  matrix:
    target: [server-a.non-prod, server-b.non-prod]
steps:
  - name: Deploy
    run: node ./bin/orwell push --target ${{ matrix.target }}
    env:
      ELASTIC_ENDPOINT: ${{ secrets[format('ELASTIC_{0}_ENDPOINT', matrix.target)] }}
      ELASTIC_API_KEY:  ${{ secrets[format('ELASTIC_{0}_API_KEY',  matrix.target)] }}
```

## GitLab CI

```yaml
deploy-alerts:
  stage: deploy
  image: node:22-alpine
  script:
    - npm ci
    - node ./bin/orwell sync --target server-a.non-prod --project-id acme
  variables:
    ELASTIC_ENDPOINT: $ELASTIC_NONPROD_ENDPOINT
    ELASTIC_API_KEY: $ELASTIC_NONPROD_API_KEY
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      changes:
        - src/**/*
```
