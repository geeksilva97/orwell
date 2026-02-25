const { marked } = require('marked');

function renderInlineTokens(tokens) {
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
        return token.text;
      case 'escape':
        return token.text;
      default:
        return token.raw || '';
    }
  }).join('');
}

function compileMarkdownToBlocks(markdownContent, options = {}) {
  const tokens = marked.lexer(markdownContent);
  const blocks = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          type: 'header',
          text: {
            type: 'plain_text',
            text: renderInlineTokens(token.tokens),
            emoji: true,
          },
        });
        break;

      case 'paragraph':
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: renderInlineTokens(token.tokens),
          },
        });
        break;

      case 'hr':
        blocks.push({ type: 'divider' });
        break;

      case 'list': {
        const prefix = token.ordered ? (i) => `${i + 1}. ` : () => '• ';
        const items = token.items.map((item, i) =>
          `${prefix(i)}${renderInlineTokens(item.tokens[0]?.tokens || [])}`
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
        const innerText = token.tokens
          .filter((t) => t.type === 'paragraph')
          .map((t) => renderInlineTokens(t.tokens))
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
            text: token.text.replace(/\n\n/g, ''),
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
        style: action.style || 'primary',
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

module.exports = { compileMarkdownToBlocks };
