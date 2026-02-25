import nodePath from 'node:path';
import { readdirSync, readFileSync } from 'fs';
import { AlertFactory } from '../core/alert-factory.ts';
import type { Alert } from '../core/alert.ts';
import type { WatchFile } from '../types.ts';

type ReadDirFn = (path: string) => string[];
type ReadFileFn = (path: string) => string | Buffer;

class AlertRepositoryFileSystem {
  #prefix: string;
  #readDir: ReadDirFn;
  #readFile: ReadFileFn;

  constructor({
    prefix,
    readDir,
    readFile
  }: {
    prefix?: string;
    readDir?: ReadDirFn;
    readFile?: ReadFileFn;
  }) {
    this.#prefix = !prefix ? '' : `${prefix}-`;
    this.#readDir = readDir ?? (readdirSync as unknown as ReadDirFn);
    this.#readFile = readFile ?? (readFileSync as unknown as ReadFileFn);
  }

  findAlertByPath(alertPath: string): Alert | null {
    try {
      const files = this.#readDir(alertPath);

      const watchFiles: WatchFile[] = files.reduce<WatchFile[]>((acc, filename) => {
        const fileExtension = nodePath.extname(filename);
        const isJSONOrJs = ['.json', '.js'].includes(fileExtension);
        if (filename.includes('watcher.') && isJSONOrJs) {
          acc.push({
            type: fileExtension === '.json' ? 'json' : 'js',
            filename
          });
        }

        return acc;
      }, []);

      const scriptContent = this.#getScript(alertPath);

      const { alertId, alertName, path } = this.#splitPath(alertPath);

      return AlertFactory.build({
        alertData: {
          id: alertId,
          name: alertName,
          path,
          watchFiles
        },
        scriptParams: {
          content: scriptContent,
          id: alertId,
          path
        }
      });
    } catch (err) {
      console.error(`Could not find alert in ${alertPath}. Make sure your branch is aligned with its base`, { alertPath, err });

      return null;
    }
  }

  #splitPath(alertPath: string): { path: string; alertId: string; alertName: string } {
    const splittedDir = alertPath.split('/');
    const path = splittedDir.slice(0, 2).join('/');
    const alertName = splittedDir[2] ?? '';
    const alertId = `${this.#prefix}${splittedDir[1]}-${alertName}`;

    return { path, alertId, alertName };
  }

  #getScript(alertPath: string): string | null {
    try {
      const scriptCode = this.#readFile(`${alertPath}/script.groovy`);

      return scriptCode.toString();
    } catch {
      console.warn('Could not find script at ', { alertPath });

      return null;
    }
  }
}

export const makeAlertsRepository = ({
  readDir,
  readFile,
  prefix
}: {
  readDir?: ReadDirFn;
  readFile?: ReadFileFn;
  prefix?: string;
}) => new AlertRepositoryFileSystem({
  readFile,
  readDir,
  prefix
});

export const alertRepository = makeAlertsRepository({
  readDir: readdirSync as unknown as ReadDirFn,
  readFile: readFileSync as unknown as ReadFileFn
});
