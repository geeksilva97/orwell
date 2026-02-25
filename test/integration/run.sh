#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  echo "Tearing down containers..."
  docker compose down
}
trap cleanup EXIT

docker compose up -d --wait
node --test 'test/integration/**/*.test.js'
