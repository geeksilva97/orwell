---
title: Deploying the docs
description: Host the documentation on Cloudflare Pages at orwell.codesilva.com.
---

The docs site (`docs/`) is a static Astro/Starlight site. The recommended host is **Cloudflare Pages**.

## Cloudflare Pages — Git integration (easiest)

Connect your GitHub repository directly to Cloudflare Pages. Every push to `main` triggers a new build.

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**.
2. Select **Pages** → **Connect to Git** → pick your repo.
3. Configure the build:

   | Setting | Value |
   |---|---|
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `docs` |

4. Click **Save and Deploy**.

### Custom domain

After the first deployment:

1. In your Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `orwell.codesilva.com`.
3. Cloudflare will add the DNS record automatically (since codesilva.com is already on Cloudflare).

---

## Cloudflare Pages — Wrangler CLI (CI/CD)

For more control, deploy via Wrangler in GitHub Actions.

### One-time setup

1. Create the Pages project in the Cloudflare dashboard (without Git integration).
2. Get your `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the dashboard.
3. Add them as GitHub secrets.

### GitHub Actions workflow

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install & build
        working-directory: docs
        run: |
          npm ci
          npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=orwell-docs
          workingDirectory: docs
```

---

## Local development

```bash
cd docs
npm install
npm run dev
```

Opens at `http://localhost:4321`.

## Local preview (production build)

```bash
cd docs
npm run build
npm run preview
```
