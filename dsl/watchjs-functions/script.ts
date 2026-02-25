import path from 'node:path';
import { accessSync, constants } from 'node:fs';
import type { ScriptReference } from '../../lib/types.ts';

const fileExists = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

interface ScriptContext {
  scripts: Record<string, ScriptReference>;
}

export default function makeScript({
  targetDirectory,
  alertId,
  context
}: {
  targetDirectory: string;
  alertId: string;
  context: ScriptContext;
}): (scriptPath: string) => { id: string } {
  return function(scriptPath: string): { id: string } {
    const fullPath = path.resolve(targetDirectory, scriptPath);
    const filename = scriptPath.split('/').pop()?.split('.').shift() ?? '';

    if (!fileExists(fullPath)) {
      throw new Error(`Script file not found: ${fullPath}`);
    }

    const scriptId = `${alertId}-${filename}`;

    context.scripts[scriptId] = {
      id: scriptId,
      fullPath
    };

    return { id: scriptId };
  };
}
