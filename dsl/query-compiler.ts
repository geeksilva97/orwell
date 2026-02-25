import { isOneOfMarker, type IsOneOfMarker } from './comparison-operators.ts';

export const QUERY_TAG: unique symbol = Symbol('query');
export const RAW_QUERY_TAG: unique symbol = Symbol('rawQuery');

export interface QuerySpec {
  indexes: string[];
  timeRange?: string;
  query?: string;
  filters?: Record<string, string | IsOneOfMarker>;
}

export interface QueryMarker {
  [QUERY_TAG]: true;
  spec: QuerySpec;
}

export interface RawQueryMarker {
  [RAW_QUERY_TAG]: true;
  body: Record<string, unknown>;
}

export function parseTimeRange(timeRange: string): Record<string, unknown> {
  const match = timeRange.match(/^(-?\w+)\s+to\s+(\w+)$/);
  if (!match) {
    throw new Error(`Invalid timeRange format: "${timeRange}". Expected format: "-2h to now"`);
  }

  const [, from, to] = match;

  const gte = from === 'now'
    ? '{{ctx.trigger.scheduled_time}}'
    : `{{ctx.trigger.scheduled_time}}||${from}`;

  const lte = to === 'now'
    ? '{{ctx.trigger.scheduled_time}}'
    : `{{ctx.trigger.scheduled_time}}||${to}`;

  return {
    range: {
      '@timestamp': {
        gte,
        lte,
        format: 'strict_date_optional_time||epoch_millis',
      },
    },
  };
}

export function compileFilters(filters: Record<string, string | IsOneOfMarker>): Record<string, unknown>[] {
  const compiled: Record<string, unknown>[] = [];

  for (const [field, value] of Object.entries(filters)) {
    if (isOneOfMarker(value)) {
      compiled.push({
        bool: {
          should: value.values.map((v) => ({
            match_phrase: { [field]: v },
          })),
          minimum_should_match: 1,
        },
      });
    } else {
      compiled.push({
        match_phrase: { [field]: value },
      });
    }
  }

  return compiled;
}

export function compileQuery(spec: QuerySpec): Record<string, unknown> {
  const { indexes, timeRange, query, filters } = spec;
  const filterClauses: Record<string, unknown>[] = [];

  if (timeRange) {
    filterClauses.push(parseTimeRange(timeRange));
  }

  if (query) {
    filterClauses.push({
      match_phrase: {
        message: {
          query,
          slop: 10,
        },
      },
    });
  }

  if (filters) {
    filterClauses.push(...compileFilters(filters));
  }

  return {
    search: {
      request: {
        search_type: 'query_then_fetch',
        indices: indexes,
        rest_total_hits_as_int: true,
        body: {
          query: {
            bool: {
              filter: filterClauses,
            },
          },
          sort: {
            '@timestamp': { order: 'desc' },
          },
        },
      },
    },
  };
}

export function query(spec: QuerySpec): QueryMarker {
  return { [QUERY_TAG]: true, spec };
}

export function rawQuery(body: Record<string, unknown>): RawQueryMarker {
  return { [RAW_QUERY_TAG]: true, body };
}

export function isQuery(obj: unknown): obj is QueryMarker {
  return obj != null && typeof obj === 'object' && (obj as Record<symbol, unknown>)[QUERY_TAG] === true;
}

export function isRawQuery(obj: unknown): obj is RawQueryMarker {
  return obj != null && typeof obj === 'object' && (obj as Record<symbol, unknown>)[RAW_QUERY_TAG] === true;
}
