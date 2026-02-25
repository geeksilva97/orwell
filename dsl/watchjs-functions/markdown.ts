import path from 'node:path';
import { readFileSync } from 'node:fs';
import { compileMarkdownToBlocks } from '../markdown-compiler.ts';
import type { MarkdownOptions, MarkdownMessage } from '../../lib/types.ts';

export const MARKDOWN_TAG: unique symbol = Symbol('markdown');

export default function makeMarkdown({ targetDirectory }: { targetDirectory: string }): (filePath: string, options?: MarkdownOptions) => MarkdownMessage {
  return function markdown(filePath: string, options?: MarkdownOptions): MarkdownMessage {
    const fullPath = path.resolve(targetDirectory, filePath);
    const content = readFileSync(fullPath, 'utf8');
    const blocks = compileMarkdownToBlocks(content, options);
    return { [MARKDOWN_TAG]: true, blocks };
  };
}

export function isMarkdownMessage(obj: unknown): obj is MarkdownMessage {
  return obj != null && typeof obj === 'object' && (obj as Record<symbol, unknown>)[MARKDOWN_TAG] === true;
}
