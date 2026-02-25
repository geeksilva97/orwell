import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://orwell.codesilva.com',
  integrations: [
    starlight({
      title: 'Orwell',
      description: 'CLI for managing Elasticsearch Watcher alerts as code.',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/geeksilva97/orwell',
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', slug: 'index' },
            { label: 'Installation', slug: 'getting-started' },
          ],
        },
        {
          label: 'Commands',
          items: [
            { label: 'scaffold', slug: 'commands/scaffold' },
            { label: 'push', slug: 'commands/push' },
            { label: 'sync', slug: 'commands/sync' },
            { label: 'eval:watch', slug: 'commands/eval-watch' },
            { label: 'heartbeat:deploy', slug: 'commands/heartbeat-deploy' },
          ],
        },
        {
          label: 'JavaScript DSL',
          items: [
            { label: 'Overview', slug: 'dsl/overview' },
            { label: 'schedule()', slug: 'dsl/schedule' },
            { label: 'input() & query()', slug: 'dsl/input-query' },
            { label: 'condition()', slug: 'dsl/condition' },
            { label: 'transform()', slug: 'dsl/transform' },
            { label: 'webhookAction() & markdown()', slug: 'dsl/webhook-markdown' },
            { label: 'Comparison operators', slug: 'dsl/operators' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'File naming & targeting', slug: 'guides/file-naming' },
            { label: 'Painless scripts', slug: 'guides/painless-scripts' },
            { label: 'Authentication', slug: 'guides/authentication' },
            { label: 'CI/CD integration', slug: 'guides/ci-cd' },
            { label: 'Deploying the docs', slug: 'guides/deployment' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
