const path = require('node:path');
const { readFileSync } = require('node:fs');
const { compileMarkdownToBlocks } = require('../markdown-compiler');

const MARKDOWN_TAG = Symbol('markdown');

module.exports = function makeMarkdown({ targetDirectory }) {
  return function markdown(filePath, options) {
    const fullPath = path.resolve(targetDirectory, filePath);
    const content = readFileSync(fullPath, 'utf8');
    const blocks = compileMarkdownToBlocks(content, options);
    return { [MARKDOWN_TAG]: true, blocks };
  };
};

module.exports.MARKDOWN_TAG = MARKDOWN_TAG;
module.exports.isMarkdownMessage = (obj) => obj != null && obj[MARKDOWN_TAG] === true;
