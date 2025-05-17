module.exports = {
  baseDir: 'src',
  heartbeat: {
    alerts: [
      'in-person-selling/reconext-shipment-failure',
      'in-person-selling/shipping-release-scanner',
    ],
    action: {
      slack: {
        path: process.env.SLACK_HOOK_PATH,
      }
    },
    indices: 'watcher-history',
    interval: '2h',
  }
};
