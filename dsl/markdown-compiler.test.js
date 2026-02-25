const { describe, it } = require('node:test');
const { compileMarkdownToBlocks } = require('./markdown-compiler');

describe('markdown-compiler', () => {
  describe('headings', () => {
    it('converts heading to header block', (t) => {
      const blocks = compileMarkdownToBlocks('# Alert Title');
      t.assert.deepStrictEqual(blocks, [{
        type: 'header',
        text: { type: 'plain_text', text: 'Alert Title', emoji: true },
      }]);
    });

    it('preserves mustache placeholders in headings', (t) => {
      const blocks = compileMarkdownToBlocks('# {{ctx.payload.count}} Failures');
      t.assert.strictEqual(blocks[0].text.text, '{{ctx.payload.count}} Failures');
    });
  });

  describe('paragraphs', () => {
    it('converts paragraph to section block', (t) => {
      const blocks = compileMarkdownToBlocks('Hello world');
      t.assert.deepStrictEqual(blocks, [{
        type: 'section',
        text: { type: 'mrkdwn', text: 'Hello world' },
      }]);
    });

    it('preserves mustache placeholders in paragraphs', (t) => {
      const blocks = compileMarkdownToBlocks('Error in {{ctx.payload.service}}');
      t.assert.strictEqual(blocks[0].text.text, 'Error in {{ctx.payload.service}}');
    });
  });

  describe('dividers', () => {
    it('converts hr to divider block', (t) => {
      const blocks = compileMarkdownToBlocks('Above\n\n---\n\nBelow');
      const dividers = blocks.filter((b) => b.type === 'divider');
      t.assert.strictEqual(dividers.length, 1);
    });
  });

  describe('inline formatting', () => {
    it('converts bold to slack mrkdwn', (t) => {
      const blocks = compileMarkdownToBlocks('This is **bold** text');
      t.assert.strictEqual(blocks[0].text.text, 'This is *bold* text');
    });

    it('converts italic to slack mrkdwn', (t) => {
      const blocks = compileMarkdownToBlocks('This is *italic* text');
      t.assert.strictEqual(blocks[0].text.text, 'This is _italic_ text');
    });

    it('converts links to slack format', (t) => {
      const blocks = compileMarkdownToBlocks('Click [here](https://example.com)');
      t.assert.strictEqual(blocks[0].text.text, 'Click <https://example.com|here>');
    });

    it('converts inline code to backtick format', (t) => {
      const blocks = compileMarkdownToBlocks('Run `npm test` now');
      t.assert.strictEqual(blocks[0].text.text, 'Run `npm test` now');
    });

    it('preserves mustache in links', (t) => {
      const blocks = compileMarkdownToBlocks('See [logs]({{ctx.payload.logsUrl}})');
      t.assert.strictEqual(blocks[0].text.text, 'See <{{ctx.payload.logsUrl}}|logs>');
    });
  });

  describe('lists', () => {
    it('converts unordered list to bullet section', (t) => {
      const blocks = compileMarkdownToBlocks('- Item one\n- Item two\n- Item three');
      t.assert.strictEqual(blocks[0].type, 'section');
      t.assert.strictEqual(blocks[0].text.text, '• Item one\n• Item two\n• Item three');
    });

    it('converts ordered list with numbers', (t) => {
      const blocks = compileMarkdownToBlocks('1. First\n2. Second');
      t.assert.strictEqual(blocks[0].text.text, '1. First\n2. Second');
    });
  });

  describe('blockquotes', () => {
    it('converts blockquote to quoted section', (t) => {
      const blocks = compileMarkdownToBlocks('> Important note');
      t.assert.strictEqual(blocks[0].type, 'section');
      t.assert.strictEqual(blocks[0].text.text, '> Important note');
    });
  });

  describe('actions option', () => {
    it('appends action buttons', (t) => {
      const blocks = compileMarkdownToBlocks('Hello', {
        actions: [
          { text: 'See Logs', url: 'https://example.com' },
          { text: 'Dismiss', url: 'https://example.com/dismiss', style: 'danger' },
        ],
      });
      t.assert.strictEqual(blocks.length, 2);
      t.assert.strictEqual(blocks[1].type, 'actions');
      t.assert.strictEqual(blocks[1].elements.length, 2);
      t.assert.strictEqual(blocks[1].elements[0].text.text, 'See Logs');
      t.assert.strictEqual(blocks[1].elements[0].style, 'primary');
      t.assert.strictEqual(blocks[1].elements[1].style, 'danger');
    });

    it('preserves mustache in action urls', (t) => {
      const blocks = compileMarkdownToBlocks('Hello', {
        actions: [{ text: 'View', url: '{{ctx.payload.logsUrl}}' }],
      });
      t.assert.strictEqual(blocks[1].elements[0].url, '{{ctx.payload.logsUrl}}');
    });
  });

  describe('context option', () => {
    it('appends context elements', (t) => {
      const blocks = compileMarkdownToBlocks('Hello', {
        context: [
          { text: 'Details', url: 'https://example.com/details' },
        ],
      });
      t.assert.strictEqual(blocks.length, 2);
      t.assert.strictEqual(blocks[1].type, 'context');
      t.assert.strictEqual(blocks[1].elements[0].text, '<https://example.com/details|Details>');
    });
  });

  describe('full template', () => {
    it('compiles a complete markdown template with mustache placeholders', (t) => {
      const md = [
        '# {{ctx.payload.count}} Failures Detected',
        '',
        'Service **{{ctx.payload.service}}** has errors.',
        '',
        '---',
        '',
        'Check [dashboard]({{ctx.payload.dashboardUrl}}) for details.',
      ].join('\n');

      const blocks = compileMarkdownToBlocks(md, {
        actions: [{ text: 'See Logs', url: '{{ctx.payload.logsUrl}}' }],
        context: [{ text: 'Details', url: '{{ctx.payload.detailsUrl}}' }],
      });

      t.assert.strictEqual(blocks[0].type, 'header');
      t.assert.strictEqual(blocks[0].text.text, '{{ctx.payload.count}} Failures Detected');

      t.assert.strictEqual(blocks[1].type, 'section');
      t.assert.strictEqual(blocks[1].text.text, 'Service *{{ctx.payload.service}}* has errors.');

      t.assert.strictEqual(blocks[2].type, 'divider');

      t.assert.strictEqual(blocks[3].type, 'section');
      t.assert.strictEqual(blocks[3].text.text, 'Check <{{ctx.payload.dashboardUrl}}|dashboard> for details.');

      t.assert.strictEqual(blocks[4].type, 'actions');
      t.assert.strictEqual(blocks[5].type, 'context');
    });
  });
});
