# Orwell CLI

This is a CLI to manage alerts on ElasticSearch.

## Conventions

This CLI is supposed to support watcher-based alerts on Elastic. With the `scaffold` command you can create a new alert
project adhering to the conventions described below.

These conventions are mandatory to the alert management to work properly.

### Folder structure conventions

This project relies on some conventions to work properly. Please make sure you follow them.

It relies on the following structure:

- `<base_dir>` - source files
    - `<group-folder-name>` - Folder for grouping alers (e.g. `in-person-selling` to group IPS related alerts)
        - `<alertId-folder-name>` - Folder with the alertId
            - `watcher.json` - Watch JSON
            - `script.groovy` - Script related to that alert (optional)

Example:

- `src` - source files
    - `in-person-selling` - Folder for grouping alers (e.g. `in-person-selling` for group IPS related alerts)
        - `reconext-shipment-failure` - Folder with the alertId (the name of this folder will be the watcher and the
            script id)
            - `watcher.json`
            - `script.groovy`


From the above structure we can infer that it will deploy an Watch with the ID being `reconext-shipment-failure`. The ID will be the same for the script, so inside of the Watch JSON, the script reference will be `reconext-shipment-failure`.

### Naming conventions

The `painless script` **MUST** have precisely the following name to be deployed: `script.groovy`. For watchers you can define the name
based on `server` and `environments`.

The name definition is as follows: `watcher[.gopay|.commsplat][.prod|.non-prod].json`. For example:

- `watcher.json` will be deployed to both servers `commsplat` and `gopay` as well as to both environments `non-prod`
    e `prod`;
- `watcher.commsplat.json` will be deployed to `commsplat` only but in both `envs`;
- `watcher.gopay.non-prod` will be deployed to `gopay` in `non-prod` environment.
