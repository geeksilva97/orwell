---
title: Authentication
description: Configure API key or basic auth for Elasticsearch access.
---

All commands that contact Elasticsearch (`push`, `sync`, `heartbeat:deploy`) require credentials. Orwell supports two authentication methods.

## API key (recommended)

```bash
orwell push \
  --endpoint https://your-elastic:9200 \
  --api-key YOUR_API_KEY
```

## Basic auth

```bash
orwell push \
  --endpoint https://your-elastic:9200 \
  --username elastic \
  --password YOUR_PASSWORD
```

## Environment variables

All credentials can be provided via environment variables instead of flags. This is the recommended approach for CI/CD:

| Variable | Equivalent flag |
|---|---|
| `ELASTIC_ENDPOINT` | `--endpoint` |
| `ELASTIC_API_KEY` | `--api-key` |
| `ELASTIC_USERNAME` | `--username` |
| `ELASTIC_PASSWORD` | `--password` |

```bash
export ELASTIC_ENDPOINT=https://your-elastic:9200
export ELASTIC_API_KEY=YOUR_API_KEY

orwell push --target server-a.non-prod
```

Flags take precedence over environment variables when both are set.

## Required Elasticsearch permissions

The credentials used by Orwell need these privileges:

| Resource | Privilege |
|---|---|
| Cluster | `monitor` |
| Watcher | `manage_watcher` |
| Stored scripts | `manage` |

Example API key with the minimum required role:

```json
{
  "name": "orwell-deploy",
  "role_descriptors": {
    "orwell": {
      "cluster": ["monitor", "manage_watcher"],
      "indices": [],
      "applications": [
        {
          "application": "kibana-.kibana",
          "privileges": ["feature_watcher.all"],
          "resources": ["*"]
        }
      ]
    }
  }
}
```

## Multiple environments

A common pattern is to store one API key per environment in CI secrets:

```bash
# .env.non-prod
ELASTIC_ENDPOINT=https://elastic-nonprod:9200
ELASTIC_API_KEY=nonprod-key

# .env.prod
ELASTIC_ENDPOINT=https://elastic-prod:9200
ELASTIC_API_KEY=prod-key
```

Then in CI:

```yaml
- name: Deploy to non-prod
  run: orwell push --target server-a.non-prod
  env:
    ELASTIC_ENDPOINT: ${{ secrets.ELASTIC_NONPROD_ENDPOINT }}
    ELASTIC_API_KEY: ${{ secrets.ELASTIC_NONPROD_API_KEY }}
```
