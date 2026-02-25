schedule({ interval: '2h' })

input({
  env: 'NON-PROD',
})

condition({ 'hits.total': gt(0) })

webhookAction({
  name: 'send_slack_message',
  message: markdown('./message.md', {
    actions: [{ text: 'See Logs', url: '{{ctx.payload.logsUrl}}' }],
    context: [{ text: 'Details', url: '{{ctx.payload.detailsUrl}}' }],
  }),
  configs: {
    scheme: 'https',
    host: 'hooks.slack.com',
    port: 443,
    method: 'post',
    path: '{{ctx.payload.slackHookPath}}',
  },
})
