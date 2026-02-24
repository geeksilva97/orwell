const { isOneOfMarker } = require('./comparison-operators');

const QUERY_TAG = Symbol('query');
const RAW_QUERY_TAG = Symbol('rawQuery');

function parseTimeRange(timeRange) {
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

function compileFilters(filters) {
  const compiled = [];

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

function compileQuery(spec) {
  const { indexes, timeRange, query, filters } = spec;
  const filterClauses = [];

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

function query(spec) {
  return { [QUERY_TAG]: true, spec };
}

function rawQuery(body) {
  return { [RAW_QUERY_TAG]: true, body };
}

function isQuery(obj) {
  return obj != null && obj[QUERY_TAG] === true;
}

function isRawQuery(obj) {
  return obj != null && obj[RAW_QUERY_TAG] === true;
}

module.exports = {
  QUERY_TAG,
  RAW_QUERY_TAG,
  parseTimeRange,
  compileQuery,
  compileFilters,
  query,
  rawQuery,
  isQuery,
  isRawQuery,
};
