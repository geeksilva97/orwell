const fs = require('fs');

const { transpileScript } = require("./transpile-painless-scripts");

describe('transpile-painless-scripts', () => {
  describe('transpileScript', () => {
    describe('when it find a #include directive', () => {
      it('includes the file content in the given path', () => {
        const env = {};
        jest.spyOn(fs, 'readFileSync').mockReturnValue('def foo = 1;')

        const currentDir = '/painless-alerts/src/in-person-selling/my-alert';
        const transpiledFile = transpileScript(`
        #include '../../shared/my-file.groovy'

        def bar = 2;
        `, currentDir, env);

        const envKeys = Object.keys(env);

        expect(transpiledFile).toEqual('\ndef foo = 1;\n\ndef bar = 2;\n');
        expect(envKeys[0]).toContain('/painless-alerts/src/shared/my-file.groovy');
        expect(env[envKeys[0]]).toEqual('def foo = 1;');
      });
    });
  });
});
