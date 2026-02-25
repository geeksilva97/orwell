schedule({ interval: '1h' })

input({
  env: 'integration-test',
  logs: query({
    indexes: ['orwell-integration-test-logs'],
    timeRange: '-24h to now',
    query: 'Failed to create reconext order',
    filters: {
      'kubernetes.pod_name': isOneOf('ips-hermes'),
    },
  }),
})

condition({ 'logs.hits.total': gt(0) })

transform(script('./transform.groovy'))

webhookAction({
  name: 'notify',
  configs: {
    scheme: 'https',
    host: 'localhost',
    port: 9999,
    method: 'post',
    path: '/noop',
  },
})
