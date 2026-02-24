schedule({ interval: '2h' })

input({
  watchUrl: 'https://example.com/watcher/status',
  timeWindowInMinutes: 120,
  env: 'NON-PROD',
  logs: query({
    indexes: ['eks-*'],
    timeRange: '-2h to now',
    query: 'Failed to create reconext order',
    filters: {
      'kubernetes.pod_name': isOneOf('ips-hermes'),
    },
  }),
})

condition({ 'logs.hits.total': gt(0) })

transform(script('./transform.groovy'))

webhookAction({
  name: 'send_slack_message',
  transform: script('./transform.groovy'),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.slackHookPath}}',
    body: '{{#toJson}}ctx.payload.message{{/toJson}}',
  },
})
