import fs from 'fs';
import { describe, it, mock } from 'node:test';
import type { TestContext } from 'node:test';
import { transpileScript } from './transpile-painless-scripts.ts';

describe('transpile-painless-scripts', () => {
  describe('transpileScript', () => {
    describe('when it find a #include directive', () => {
      it('includes the file content in the given path', (t: TestContext) => {
        const env: Record<string, string> = {};
        const readFileSyncMock = mock.method(fs, 'readFileSync', () => 'def foo = 1;');

        const currentDir = '/painless-alerts/src/in-person-selling/my-alert';
        const transpiledFile = transpileScript(`
        #include '../../shared/my-file.groovy'

        def bar = 2;
        `, currentDir, env);

        const envKeys = Object.keys(env);

        t.assert.strictEqual(transpiledFile, '\ndef foo = 1;\n\ndef bar = 2;\n');
        t.assert.ok(envKeys[0]!.includes('/painless-alerts/src/shared/my-file.groovy'));
        t.assert.strictEqual(env[envKeys[0]!], 'def foo = 1;');

        readFileSyncMock.mock.restore();
      });
    });
  });
});
