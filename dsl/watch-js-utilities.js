const vm = require('node:vm');
const path = require('node:path');
const { readFileSync, accessSync, constants } = require('node:fs');

const fileExists = (filePath) => {
  try {
    accessSync(filePath, constants.F_OK);

    return true;
  } catch (err) {
    return false;
  }
};

function parseWatchJSFile(jsCodePath, { alertId, baseDir }, getFileContent = readFileSync) {
  const code = getFileContent(jsCodePath, 'utf8');
  const targetDirectory = baseDir || __dirname

  const context = {
    process: {
      env: process.env
    },
    require: (moduleName) => {
      const resolvedPath = require.resolve(moduleName, { paths: [targetDirectory] });

      return require(resolvedPath);
    },
    __dirname: targetDirectory,
    script: (scriptPath) => {
      const fullPath = path.resolve(targetDirectory, scriptPath);
      const filename = scriptPath.split('/').pop().split('.').shift();

      if (!fileExists(fullPath)) {
        throw new Error(`Script file not found: ${fullPath}`);
      }

      const scriptId = `${alertId}-${filename}`;

      context.scripts[scriptId] = {
        id: scriptId,
        fullPath
      };

      return { id: scriptId };
    },
    scripts: {},
    console: {
      log: console.log,
      error: console.error
    },
    module: {
      exports: {}
    }
  };

  vm.createContext(context);
  vm.runInNewContext(code, context);

  return {
    watchObject: context.module.exports,
    scripts: context.scripts
  };
}


module.exports = {
  parseWatchJSFile
};
