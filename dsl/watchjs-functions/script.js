const path = require('node:path');
const { accessSync, constants } = require('node:fs');

const fileExists = (filePath) => {
  try {
    accessSync(filePath, constants.F_OK);

    return true;
  } catch (err) {
    return false;
  }
};

module.exports = function makeScript({
  targetDirectory,
  alertId,
  context
}) {
  return function(scriptPath) {
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
  }
};
