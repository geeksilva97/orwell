import type { Alert } from '../core/alert.ts';
import type { WatchFile } from '../types.ts';

export function getAlertWatchersByEnvironment(
  alert: Alert,
  { serverName, env }: { serverName?: string; env?: string } = {}
): WatchFile[] {
  return alert.watchFiles.filter(({ filename: fileName }) => {
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
