import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import { makeDeployScriptService } from './deploy-script.ts';
import { AlertFactory } from '../core/alert-factory.ts';

const setup = () => {
  const deployScriptClient = {
    deploy: mock.fn<() => Promise<void>>(() => Promise.resolve())
  };
  const transpileService = {
    transpile: mock.fn<() => string>(() => '')
  };
  const service = makeDeployScriptService({
    deployScriptClient,
    transpileService
  });

  return {
    deployScriptClient,
    transpileService,
    deployScriptService: service
  };
};

const alert = AlertFactory.build({
  alertData: {
    id: 'alert-id',
    name: 'alert-name',
    path: 'alert-path',
    watchFiles: [
      { type: 'json', filename: 'watcher.json' }
    ]
  },
  scriptParams: {
    content: 'my script content',
    id: 'alert-id',
    path: 'alert-path'
  }
});

describe('DeployScriptService', () => {
  it('calls client for deploying script', async (t: TestContext) => {
    const { deployScriptService, transpileService, deployScriptClient } = setup();

    transpileService.transpile.mock.mockImplementation(() => 'transpiled script content');

    await deployScriptService.deploy(alert as unknown as Parameters<typeof deployScriptService.deploy>[0]);

    t.assert.strictEqual(transpileService.transpile.mock.calls.length, 1);
    t.assert.deepStrictEqual(transpileService.transpile.mock.calls[0]!.arguments, ['my script content', 'alert-path/alert-id', {}]);
    t.assert.strictEqual(deployScriptClient.deploy.mock.calls.length, 1);
    t.assert.deepStrictEqual(deployScriptClient.deploy.mock.calls[0]!.arguments, [{
      content: 'transpiled script content',
      id: 'alert-id'
    }]);
  });
});
