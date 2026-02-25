const vm = require('node:vm');
const path = require('node:path');
const { readFileSync, accessSync, constants } = require('node:fs');
const { WatcherBuilder } = require('./watcher-builder');
const { createDSLGlobals } = require('./dsl-globals');
const makeMarkdown = require('./watchjs-functions/markdown');

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
  const builder = new WatcherBuilder();
  const dslGlobals = createDSLGlobals(builder);

  const markdown = makeMarkdown({ targetDirectory });

  const context = {
    __dirname: targetDirectory,
    process: {
      env: process.env
    },
    require: (moduleName) => {
      const resolvedPath = require.resolve(moduleName, { paths: [targetDirectory] });

      return require(resolvedPath);
    },
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
    markdown,
    scripts: {},
    console: {
      log: console.log,
      error: console.error
    },
    module: {
      exports: {}
    },
    ...dslGlobals,
  };

  vm.createContext(context);
  vm.runInNewContext(code, context);

  const exportsEmpty = Object.keys(context.module.exports).length === 0;
  const usedDSL = exportsEmpty && builder.hasState();

  return {
    watchObject: usedDSL ? builder.compile() : context.module.exports,
    scripts: context.scripts,
    source: code
  };
}


module.exports = {
  parseWatchJSFile
};
