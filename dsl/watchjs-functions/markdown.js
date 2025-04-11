const util = require('node:util');
const path = require('node:path');
const marked = require('marked');
const mustache = require('mustache');
const { readFileSync } = require('node:fs');

function actionsSection(text, link) { }
function actionButton(text, link) { }
function contextSection(text, link) { }
function subTeam() {
  return function(text, render) {
    return `<!subteam^${render(text.trim())}>`;
  }
}

function parseHTML(token, blocks) {
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: token.text.replace('\n\n', '')
    }
  });
}

function parseHeading({ tokens }, blocks) {
  for (let i = 0; i < tokens.length; ++i) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: tokens[i].text,
        emoji: true
      }
    });
  }
}

function parseParagraph({ tokens }, blocks) {
  const textContent = [];
  for (let i = 0; i < tokens.length; ++i) {
    const tk = tokens[i];
    switch (tk.type) {
      case 'link':
        const { href, text } = tk;
        textContent.push(`<${href}|${text}>`);
        break;
      case 'text':
        textContent.push(tk.text);
        break;
    }
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: textContent.join('')
    }
  });
}

function markdownToSlackBlocks(filePath, ctx, { actions, context }) {
  const blocks = [];
  const mkdown = readFileSync(path.join(__dirname, 'sample.md'), 'utf8');
  const interpolated = mustache.render(mkdown, { ctx: { ...ctx, }, logs: ['log1', 'log2', 'log3'], subTeam });
  const tokens = marked.lexer(interpolated);

  for (let i = 0; i < tokens.length; ++i) {
    if (tokens[i].type === 'space') continue;
    const token = tokens[i];

    switch (token.type) {
      case 'html':
        parseHTML(token, blocks);
        break;
      case 'heading':
        parseHeading(token, blocks);
        break;
      case 'hr':
        blocks.push({
          type: 'divider'
        })
        break;
      case 'paragraph':
        parseParagraph(token, blocks);
        break;
    }
  }

  if (actions && actions.length) {
    blocks.push({
      type: 'actions',
      elements: actions.map(action => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.text,
          emoji: true
        },
        url: action.url,
        style: action.style || 'primary'
      }))
    });
  }

  if (context && context.length) {
    blocks.push({
      type: 'context',
      elements: context.map(elem => ({
        type: "mrkdwn",
        text: `<${elem.url}|${elem.text}>`
      }))
    });
  }

  console.log(
    util.inspect(blocks, true, null, true)
  );

  return blocks;
}

markdownToSlackBlocks('', {
  totalFailures: 2
}, {
  actions: [
    {
      style: 'primary',
      text: 'See Logs',
      url: 'https://example.com',
    }
  ],
  context: [
    {
      text: 'See Details',
      url: 'http://gambiarra.com'
    }
  ]
});

module.exports = markdownToSlackBlocks;
