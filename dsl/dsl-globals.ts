import { gt, gte, lt, lte, eq, notEq, isOneOf } from './comparison-operators.ts';
import { query, rawQuery } from './query-compiler.ts';
import type { WatcherBuilder } from './watcher-builder.ts';
import type { WebhookActionSpec } from '../lib/types.ts';

export function createDSLGlobals(builder: WatcherBuilder): Record<string, unknown> {
  return {
    // Schedule
    schedule: (spec: Record<string, unknown>) => builder.setSchedule(spec),

    // Input
    input: (spec: Record<string, unknown>) => builder.setInput(spec),

    // Condition
    condition: (spec: Record<string, unknown> | string) => builder.setCondition(spec),

    // Transform
    transform: (spec: Record<string, unknown>) => builder.addTransform(spec),

    // Actions
    webhookAction: (spec: WebhookActionSpec) => builder.addWebhookAction(spec),

    // Metadata
    metadata: (spec: Record<string, unknown>) => builder.setMetadata(spec),

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
