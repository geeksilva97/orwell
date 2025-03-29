/*
 * This is a temporary implementation!!!!
 * This transpiler misses a lot of edge cases and is not optimized. It is dummy
 */

const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('../container').container;

const environment = {};

const transpileScript = (scriptContent, currentDir, env = environment) => {
  logger.debug(`Transpiling script at ${currentDir}/script.groovy`);

  const lines = scriptContent.split('\n').map((rawLine) => {
    const line = rawLine.trim();

    if (line.startsWith('#include')) {
      return includeFile(line, currentDir, env);
    }

    return line;
  });

  return lines.join('\n');
};

const includeFile = (line, currentDir, environment) => {
  const baseDir = path.resolve(`${global?.env?.ABSOLUTE_BASE_DIR}/..`) || process.cwd();

  logger.debug(`Alert dir: ${currentDir}`);
  logger.debug(`Base dir: ${baseDir}`);

  const includePath = line.split(' ')[1].replace(/'|"/g, '');
  const abssoluteIncludePath =  `${baseDir}/${currentDir}/${includePath}`;

  const fullPathToInclude = path.resolve(abssoluteIncludePath);

  logger.debug(`Including file: ${fullPathToInclude}`);

  const fileContent = environment[fullPathToInclude] ||
    fs.readFileSync(fullPathToInclude).toString();

  // put the whole path here
  environment[fullPathToInclude] = fileContent;

  return fileContent;
};

module.exports = {
  transpileScript
};
