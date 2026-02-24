const { gt, gte, lt, lte, eq, notEq, isOneOf } = require('./comparison-operators');
const { query, rawQuery } = require('./query-compiler');

function createDSLGlobals(builder) {
  return {
    // Schedule
    schedule: (spec) => builder.setSchedule(spec),

    // Input
    input: (spec) => builder.setInput(spec),

    // Condition
    condition: (spec) => builder.setCondition(spec),

    // Transform
    transform: (spec) => builder.addTransform(spec),

    // Actions
    webhookAction: (spec) => builder.addWebhookAction(spec),

    // Metadata
    metadata: (spec) => builder.setMetadata(spec),

    // Query helpers
    query,
    rawQuery,

    // Comparison operators
    gt,
    gte,
    lt,
    lte,
    eq,
    notEq,
    isOneOf,
  };
}

module.exports = { createDSLGlobals };
