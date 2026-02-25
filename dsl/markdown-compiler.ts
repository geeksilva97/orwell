import { marked, type Token, type Tokens } from 'marked';
import type { SlackBlock, MarkdownOptions } from '../lib/types.ts';

interface InlineToken {
  type: string;
  text?: string;
  raw?: string;
  href?: string;
  tokens?: InlineToken[];
}

function renderInlineTokens(tokens: InlineToken[] | undefined): string {
  if (!tokens) return '';

  return tokens.map((token) => {
    switch (token.type) {
      case 'strong':
        return `*${renderInlineTokens(token.tokens)}*`;
      case 'em':
        return `_${renderInlineTokens(token.tokens)}_`;
      case 'codespan':
        return `\`${token.text}\``;
      case 'link':
        return `<${token.href}|${renderInlineTokens(token.tokens)}>`;
      case 'text':
        return token.text ?? '';
      case 'escape':
        return token.text ?? '';
      default:
        return token.raw ?? '';
    }
  }).join('');
}

export function compileMarkdownToBlocks(markdownContent: string, options: MarkdownOptions = {}): SlackBlock[] {
  const tokens = marked.lexer(markdownContent);
  const blocks: SlackBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          type: 'header',
          text: {
            type: 'plain_text',
            text: renderInlineTokens((token as Tokens.Heading).tokens as unknown as InlineToken[]),
            emoji: true,
          },
        });
        break;

      case 'paragraph':
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: renderInlineTokens((token as Tokens.Paragraph).tokens as unknown as InlineToken[]),
          },
        });
        break;

      case 'hr':
        blocks.push({ type: 'divider' });
        break;

      case 'list': {
        const listToken = token as Tokens.List;
        const prefix = listToken.ordered ? (i: number) => `${i + 1}. ` : () => '• ';
        const items = listToken.items.map((item, i) =>
          `${prefix(i)}${renderInlineTokens((item.tokens[0] as unknown as { tokens?: InlineToken[] })?.tokens ?? [])}`
        );
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: items.join('\n'),
          },
        });
        break;
      }

      case 'blockquote': {
        const bqToken = token as Tokens.Blockquote;
        const innerText = bqToken.tokens
          .filter((t): t is Tokens.Paragraph => t.type === 'paragraph')
          .map((t) => renderInlineTokens(t.tokens as unknown as InlineToken[]))
          .join('\n');
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${innerText}`,
          },
        });
        break;
      }

      case 'html':
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: (token as Tokens.HTML).text.replace(/\n\n/g, ''),
          },
        });
        break;

      case 'space':
        break;
    }
  }

  if (options.actions && options.actions.length) {
    blocks.push({
      type: 'actions',
      elements: options.actions.map((action) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.text,
          emoji: true,
        },
        url: action.url,
        style: action.style ?? 'primary',
      })),
    });
  }

  if (options.context && options.context.length) {
    blocks.push({
      type: 'context',
      elements: options.context.map((elem) => ({
        type: 'mrkdwn',
        text: `<${elem.url}|${elem.text}>`,
      })),
    });
  }

  return blocks;
}
