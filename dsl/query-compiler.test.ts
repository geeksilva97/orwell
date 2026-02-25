import { describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import { isOneOf } from './comparison-operators.ts';
import {
  parseTimeRange,
  compileQuery,
  compileFilters,
  query,
  rawQuery,
  isQuery,
  isRawQuery,
} from './query-compiler.ts';

describe('query-compiler', () => {
  describe('parseTimeRange', () => {
    it('parses "-2h to now"', (t: TestContext) => {
      const result = parseTimeRange('-2h to now');
      t.assert.deepStrictEqual(result, {
        range: {
          '@timestamp': {
            gte: '{{ctx.trigger.scheduled_time}}||-2h',
            lte: '{{ctx.trigger.scheduled_time}}',
            format: 'strict_date_optional_time||epoch_millis',
          },
        },
      });
    });

    it('parses "-30m to now"', (t: TestContext) => {
      const result = parseTimeRange('-30m to now') as { range: { '@timestamp': { gte: string } } };
      t.assert.strictEqual(
        result.range['@timestamp'].gte,
        '{{ctx.trigger.scheduled_time}}||-30m'
      );
    });

    it('throws on invalid format', (t: TestContext) => {
      t.assert.throws(() => parseTimeRange('invalid'), /Invalid timeRange format/);
    });
  });

  describe('compileFilters', () => {
    it('compiles isOneOf filter into bool.should', (t: TestContext) => {
      const result = compileFilters({
        'kubernetes.pod_name': isOneOf('ips-hermes', 'ips-zeus'),
      });

      t.assert.deepStrictEqual(result, [
        {
          bool: {
            should: [
              { match_phrase: { 'kubernetes.pod_name': 'ips-hermes' } },
              { match_phrase: { 'kubernetes.pod_name': 'ips-zeus' } },
            ],
            minimum_should_match: 1,
          },
        },
      ]);
    });

    it('compiles plain string filter into match_phrase', (t: TestContext) => {
      const result = compileFilters({ 'kubernetes.namespace': 'production' });
      t.assert.deepStrictEqual(result, [
        { match_phrase: { 'kubernetes.namespace': 'production' } },
      ]);
    });
  });

  describe('compileQuery', () => {
    it('compiles a full query spec', (t: TestContext) => {
      const result = compileQuery({
        indexes: ['eks-*'],
        timeRange: '-2h to now',
        query: 'Error while processing request',
        filters: {
          'kubernetes.container_name': isOneOf('ips-hermes'),
        },
      });

      t.assert.deepStrictEqual(result, {
        search: {
          request: {
            search_type: 'query_then_fetch',
            indices: ['eks-*'],
            rest_total_hits_as_int: true,
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: '{{ctx.trigger.scheduled_time}}||-2h',
                          lte: '{{ctx.trigger.scheduled_time}}',
                          format: 'strict_date_optional_time||epoch_millis',
                        },
                      },
                    },
                    {
                      match_phrase: {
                        message: {
                          query: 'Error while processing request',
                          slop: 10,
                        },
                      },
                    },
                    {
                      bool: {
                        should: [
                          { match_phrase: { 'kubernetes.container_name': 'ips-hermes' } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
              sort: { '@timestamp': { order: 'desc' } },
            },
          },
        },
      });
    });

    it('compiles with only indexes and timeRange', (t: TestContext) => {
      const result = compileQuery({
        indexes: ['logs-*'],
        timeRange: '-1h to now',
      }) as { search: { request: { body: { query: { bool: { filter: unknown[] } } } } } };

      const filters = result.search.request.body.query.bool.filter;
      t.assert.strictEqual(filters.length, 1);
      t.assert.ok((filters[0] as Record<string, unknown>).range);
    });
  });

  describe('query / rawQuery markers', () => {
    it('query() creates a tagged marker', (t: TestContext) => {
      const q = query({ indexes: ['test'] });
      t.assert.strictEqual(isQuery(q), true);
      t.assert.deepStrictEqual(q.spec, { indexes: ['test'] });
    });

    it('rawQuery() creates a tagged marker', (t: TestContext) => {
      const rq = rawQuery({ indices: ['test'], body: {} });
      t.assert.strictEqual(isRawQuery(rq), true);
    });

    it('isQuery returns false for non-query objects', (t: TestContext) => {
      t.assert.strictEqual(isQuery(null), false);
      t.assert.strictEqual(isQuery({}), false);
    });

    it('isRawQuery returns false for non-rawQuery objects', (t: TestContext) => {
      t.assert.strictEqual(isRawQuery(null), false);
      t.assert.strictEqual(isRawQuery({}), false);
    });
  });
});
