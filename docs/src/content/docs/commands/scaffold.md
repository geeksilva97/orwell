---
title: scaffold
description: Create a new alert project with the correct folder structure.
---

Creates the folder structure and starter files for a new alert.

## Usage

```bash
orwell scaffold [options]
```

## Options

| Flag | Alias | Default | Description |
|---|---|---|---|
| `--name <name>` | `-n` | _(required)_ | Alert name |
| `--group-name <group>` | `-g` | `alert-group` | Group folder name |
| `--base-dir <dir>` | | `src` | Base directory for alerts |
| `--dest <dir>` | | `.` | Destination directory |
| `--no-git` | | | Skip `git init` |

## What it creates

```
<dest>/
  <base-dir>/
    <group-name>/
      <name>/
        watcher.non-prod.json     ← starter watcher definition
        script.groovy             ← references shared script
    shared/
      shared.groovy               ← shared Painless code
```

`script.groovy` comes pre-wired with an `#include` pointing at `shared/shared.groovy`:

```groovy
#include "../../shared/shared.groovy"

// your Painless logic here
```

## Examples

### Default group name

```bash
orwell scaffold --name order-failure
```

Creates `src/alert-group/order-failure/`.

### Custom group

```bash
orwell scaffold --name order-failure --group-name payments
```

Creates `src/payments/order-failure/`.

### Different base directory and destination

```bash
orwell scaffold --name order-failure -g payments --base-dir alerts --dest /tmp/my-project
```

### Skip git init

Useful when adding an alert to an existing repository:

```bash
orwell scaffold --name order-failure --no-git
```
