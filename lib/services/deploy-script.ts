import { container } from '../container.ts';

interface DeployScriptClientLike {
  deploy(params: { id: string; content: string }): Promise<void>;
}

interface TranspileServiceLike {
  transpile: (content: string, dir: string, env: Record<string, string>) => string;
}

interface DeployableAlert {
  id: string;
  path: string;
  scripts: Array<{ id: string; content: string }>;
}

class DeployScriptService {
  deployScriptClient: DeployScriptClientLike;
  transpileService: TranspileServiceLike;

  constructor({
    deployScriptClient,
    transpileService
  }: {
    deployScriptClient: DeployScriptClientLike;
    transpileService: TranspileServiceLike;
  }) {
    this.deployScriptClient = deployScriptClient;
    this.transpileService = transpileService;
  }

  async deploy(alert: DeployableAlert, scriptId?: string): Promise<void> {
    const firstScript = alert.scripts[0];
    if (!firstScript) {
      throw new Error(`Alert ${alert.id} has no scripts to deploy`);
    }
    const transpiledScript = this.transpileService.transpile(firstScript.content, `${alert.path}/${alert.id}`, {});

    container.logger.info(`Deploying script for alert ${alert.id}`);
    container.logger.debug(`===== Script content ====\n${transpiledScript}`);

    try {
      await this.deployScriptClient.deploy({ id: scriptId ?? alert.id, content: transpiledScript });
      container.logger.info(`Script deployed sucessfully`);
    } catch (error) {
      container.logger.error(`Could not deploy script for alert ${alert.id}`);

      throw error;
    }
  }
}

export const makeDeployScriptService = ({ deployScriptClient, transpileService }: {
  deployScriptClient: DeployScriptClientLike;
  transpileService: TranspileServiceLike;
}) => {
  return new DeployScriptService({ deployScriptClient, transpileService });
};
