module.exports = {
  baseDir: 'src',
  heartbeat: {
    alerts: [
      'in-person-selling/reconext-shipment-failure',
      'in-person-selling/shipping-release-scanner',
    ],
    action: {
      webhook: {
        scheme: "https",
        host: "hooks.slack.com",
        port: 443,
        method: "post",
        path: process.env.SLACK_HOOK_PATH,
        params: {},
        headers: {},
      }
    },
    indices: 'watcher-history',
    interval: '2h',
  }
};
