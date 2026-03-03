import vm from 'node:vm';
import path from 'node:path';
import { readFileSync, accessSync, constants } from 'node:fs';
import { WatcherBuilder } from './watcher-builder.ts';
import { createDSLGlobals } from './dsl-globals.ts';
import makeMarkdown from './watchjs-functions/markdown.ts';
import { createRequire } from 'node:module';
import type { ScriptReference } from '../lib/types.ts';

const fileExists = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

interface ParseResult {
  watchObject: Record<string, unknown>;
  scripts: Record<string, ScriptReference>;
  source: string;
}

function buildVMContext(
  alertId: string,
  targetDirectory: string,
  builder: WatcherBuilder
): { context: vm.Context; scripts: Record<string, ScriptReference> } {
  const scripts: Record<string, ScriptReference> = {};
  const req = createRequire(path.resolve(targetDirectory, '_'));

  const context: Record<string, unknown> = {
    __dirname: targetDirectory,
    process: { env: process.env },
    require: (moduleName: string) => req(req.resolve(moduleName)),
    script: (scriptPath: string) => {
      const fullPath = path.resolve(targetDirectory, scriptPath);
      const filename = path.basename(scriptPath).split('.')[0] ?? '';

      if (!fileExists(fullPath)) {
        throw new Error(`Script file not found: ${fullPath}`);
      }

      const scriptId = `${alertId}-${filename}`;
      scripts[scriptId] = { id: scriptId, fullPath };
      return { id: scriptId };
    },
    markdown: makeMarkdown({ targetDirectory }),
    scripts,
    console: { log: console.log, error: console.error },
    module: { exports: {} as Record<string, unknown> },
    ...createDSLGlobals(builder),
  };

  vm.createContext(context);
  return { context, scripts };
}

export function parseWatchJSFile(
  jsCodePath: string,
  { alertId, baseDir }: { alertId: string; baseDir?: string },
  getFileContent: (path: string, encoding: BufferEncoding) => string = (p, e) => readFileSync(p, e)
): ParseResult {
  const source = getFileContent(jsCodePath, 'utf8');
  const targetDirectory = baseDir ?? path.dirname(jsCodePath);
  const builder = new WatcherBuilder();

  const { context, scripts } = buildVMContext(alertId, targetDirectory, builder);
  vm.runInNewContext(source, context);

  const moduleExports = (context.module as { exports: Record<string, unknown> }).exports;
  const watchObject = Object.keys(moduleExports).length === 0 && builder.hasState()
    ? builder.compile()
    : moduleExports;

  return { watchObject, scripts, source };
}
