import fs from 'node:fs';
import path from 'node:path';
import { container } from '../container.ts';

const { logger } = container;

const transpileScript = (
  scriptContent: string,
  currentDir: string,
  env: Record<string, string> = {}
): string => {
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

const includeFile = (line: string, currentDir: string, environment: Record<string, string>): string => {
  const baseDir = path.resolve(`${process.cwd()}/..`);

  logger.debug(`Alert dir: ${currentDir}`);
  logger.debug(`Base dir: ${baseDir}`);

  const parts = line.split(' ');
  const includePath = (parts[1] ?? '').replace(/'|"/g, '');
  const abssoluteIncludePath = `${baseDir}/${currentDir}/${includePath}`;

  const fullPathToInclude = path.resolve(abssoluteIncludePath);

  logger.debug(`Including file: ${fullPathToInclude}`);

  const fileContent = environment[fullPathToInclude] ??
    fs.readFileSync(fullPathToInclude).toString();

  // put the whole path here
  environment[fullPathToInclude] = fileContent;

  return fileContent;
};

export { transpileScript };
