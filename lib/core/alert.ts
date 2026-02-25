import assert from 'node:assert';
import type { WatchFile } from '../types.ts';
import { Script } from './script.ts';

interface AlertParams {
  id: string;
  name: string;
  path: string;
  scripts: Script[];
  watchFiles: WatchFile[];
}

export class Alert {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly scripts: Script[];
  readonly watchFiles: WatchFile[];

  constructor({ id, name, path, scripts, watchFiles }: AlertParams) {
    assert(id);
    assert(path);
    assert(watchFiles?.length > 0, 'An alert must have at least one watch file');

    this.id = id;
    this.name = name;
    this.path = path;
    this.scripts = scripts;
    this.watchFiles = watchFiles;
  }

  static create(params: AlertParams): Alert {
    return new Alert(params);
  }

  hasScript(): boolean {
    return this.scripts.length > 0;
  }

  withScript(content: string): Alert {
    return new Alert({
      id: this.id,
      name: this.name,
      path: this.path,
      watchFiles: this.watchFiles,
      scripts: [
        ...this.scripts,
        new Script({
          id: this.id,
          path: this.path,
          content
        })
      ]
    });
  }

  withWatchFiles(watchFiles: WatchFile | string): Alert {
    const newWatchFile = typeof watchFiles === 'string'
      ? watchFiles
      : watchFiles;
    return new Alert({
      id: this.id,
      name: this.name,
      path: this.path,
      scripts: this.scripts,
      watchFiles: Array.from(new Set([
        ...this.watchFiles,
        newWatchFile
      ] as WatchFile[]))
    });
  }
}
