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

export function parseWatchJSFile(
  jsCodePath: string,
  { alertId, baseDir }: { alertId: string; baseDir?: string },
  getFileContent: (path: string, encoding: BufferEncoding) => string = (p, e) => readFileSync(p, e)
): ParseResult {
  const code = getFileContent(jsCodePath, 'utf8');
  const targetDirectory = baseDir ?? path.dirname(jsCodePath);
  const builder = new WatcherBuilder();
  const dslGlobals = createDSLGlobals(builder);

  const markdown = makeMarkdown({ targetDirectory });

  const require = createRequire(path.resolve(targetDirectory, 'dummy.js'));

  const context: Record<string, unknown> = {
    __dirname: targetDirectory,
    process: {
      env: process.env
    },
    require: (moduleName: string) => {
      const resolvedPath = require.resolve(moduleName);
      return require(resolvedPath);
    },
    script: (scriptPath: string) => {
      const fullPath = path.resolve(targetDirectory, scriptPath);
      const filename = scriptPath.split('/').pop()?.split('.').shift() ?? '';

      if (!fileExists(fullPath)) {
        throw new Error(`Script file not found: ${fullPath}`);
      }

      const scriptId = `${alertId}-${filename}`;

      (context.scripts as Record<string, ScriptReference>)[scriptId] = {
        id: scriptId,
        fullPath
      };

      return { id: scriptId };
    },
    markdown,
    scripts: {} as Record<string, ScriptReference>,
    console: {
      log: console.log,
      error: console.error
    },
    module: {
      exports: {} as Record<string, unknown>
    },
    ...dslGlobals,
  };

  vm.createContext(context);
  vm.runInNewContext(code, context);

  const moduleExports = (context.module as { exports: Record<string, unknown> }).exports;
  const exportsEmpty = Object.keys(moduleExports).length === 0;
  const usedDSL = exportsEmpty && builder.hasState();

  return {
    watchObject: usedDSL ? builder.compile() : moduleExports,
    scripts: context.scripts as Record<string, ScriptReference>,
    source: code
  };
}
