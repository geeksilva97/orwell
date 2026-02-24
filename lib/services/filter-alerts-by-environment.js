function getAlertWatchersByEnvironment(alert, { serverName, env } = {}) {
  return alert.watchFiles.filter(({ filename: fileName, type }) => {
    const pieces = fileName.split('.');
    const noLevel = pieces.length === 2;

    if (noLevel || (!serverName && !env)) return true;

    const isServerLevel = pieces.length === 3; // watcher.servcername.ext
    const isFullLeveled = pieces.length === 4; // watcher.servcername.env.ext
    const server = (isServerLevel || isFullLeveled) && serverName ? pieces[1] : undefined;
    const environment = isFullLeveled && env ? pieces[2] : undefined;

    return env === environment && serverName === server;
  });
}

module.exports = {
  getAlertWatchersByEnvironment
};
