import { Alert } from './alert.ts';
import { Script } from './script.ts';
import type { WatchFile } from '../types.ts';

interface ScriptParams {
  id?: string;
  path?: string;
  content?: string | null;
}

interface AlertDataInput {
  id: string;
  name: string;
  path: string;
  watchFiles: WatchFile[] | string[];
}

interface BuildParams {
  alertData: AlertDataInput;
  scriptParams?: ScriptParams;
}

function buildScript(scriptParams: ScriptParams): Script | null {
  try {
    return Script.create(scriptParams as { id: string; content: string; path: string });
  } catch (err) {
    console.error('Could not build script', { scriptParams, err });
    return null;
  }
}

export class AlertFactory {
  static build({ alertData, scriptParams }: BuildParams): Alert {
    const script = scriptParams?.content ? buildScript(scriptParams) : null;

    return Alert.create({
      ...alertData,
      scripts: script != null ? [script] : []
    } as { id: string; name: string; path: string; scripts: Script[]; watchFiles: WatchFile[] });
  }
}
