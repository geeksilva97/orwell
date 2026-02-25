import { isComparison, type ComparisonOp } from './comparison-operators.ts';
import { isQuery, isRawQuery, compileQuery, type QueryMarker, type RawQueryMarker } from './query-compiler.ts';
import { isMarkdownMessage } from './watchjs-functions/markdown.ts';
import type { WebhookActionSpec, MarkdownMessage } from '../lib/types.ts';

export class WatcherBuilder {
  _schedule: Record<string, unknown> | null;
  _input: Record<string, unknown> | null;
  _condition: Record<string, unknown> | string | null;
  _transforms: Record<string, unknown>[];
  _actions: Record<string, Record<string, unknown>>;
  _metadata: Record<string, unknown> | null;

  constructor() {
    this._schedule = null;
    this._input = null;
    this._condition = null;
    this._transforms = [];
    this._actions = {};
    this._metadata = null;
  }

  hasState(): boolean {
    return !!(
      this._schedule ||
      this._input ||
      this._condition ||
      this._transforms.length ||
      Object.keys(this._actions).length ||
      this._metadata
    );
  }

  setSchedule(spec: Record<string, unknown>): void {
    this._schedule = spec;
  }

  setInput(spec: Record<string, unknown>): void {
    this._input = spec;
  }

  setCondition(spec: Record<string, unknown> | string): void {
    this._condition = spec;
  }

  addTransform(spec: Record<string, unknown>): void {
    this._transforms.push(spec);
  }

  addWebhookAction({ name, transform, throttle_period, configs, message }: WebhookActionSpec): void {
    const action: Record<string, unknown> = {};

    if (throttle_period) {
      action.throttle_period = throttle_period;
    }

    if (transform) {
      action.transform = this._compileTransformEntry(transform);
    }

    action.webhook = configs;

    if (message && isMarkdownMessage(message)) {
      const webhook = action.webhook as Record<string, unknown>;
      webhook.body = JSON.stringify({ blocks: message.blocks });
      webhook.headers = { 'Content-Type': 'application/json' };
    }

    this._actions[name ?? 'send_slack_message'] = action;
  }

  setMetadata(spec: Record<string, unknown>): void {
    this._metadata = spec;
  }

  compile(): Record<string, unknown> {
    const watch: Record<string, unknown> = {};

    if (this._schedule) {
      watch.trigger = { schedule: this._schedule };
    }

    if (this._input) {
      watch.input = this._compileInput(this._input);
    }

    if (this._condition) {
      watch.condition = this._compileCondition(this._condition);
    }

    if (this._transforms.length) {
      watch.transform = this._compileTransforms(this._transforms);
    }

    if (Object.keys(this._actions).length) {
      watch.actions = this._actions;
    }

    if (this._metadata) {
      watch.metadata = this._metadata;
    }

    return watch;
  }

  _compileInput(spec: Record<string, unknown>): Record<string, unknown> {
    const staticFields: Record<string, unknown> = {};
    const searchInputs: Record<string, unknown>[] = [];

    for (const [key, value] of Object.entries(spec)) {
      if (isQuery(value)) {
        searchInputs.push({
          [key]: compileQuery((value as QueryMarker).spec),
        });
      } else if (isRawQuery(value)) {
        searchInputs.push({
          [key]: { search: { request: (value as RawQueryMarker).body } },
        });
      } else {
        staticFields[key] = value;
      }
    }

    const hasStatic = Object.keys(staticFields).length > 0;
    const hasSearch = searchInputs.length > 0;

    if (hasStatic && !hasSearch) {
      return { simple: staticFields };
    }

    const inputs: Record<string, unknown>[] = [];

    if (hasStatic) {
      inputs.push({ static: { simple: staticFields } });
    }

    for (const searchInput of searchInputs) {
      inputs.push(searchInput);
    }

    return { chain: { inputs } };
  }

  _compileCondition(spec: Record<string, unknown> | string): Record<string, unknown> {
    if (typeof spec === 'string') {
      return { script: { source: spec } };
    }

    if ('id' in spec && spec.id) {
      return { script: spec };
    }

    const entries = Object.entries(spec);
    if (entries.length === 1) {
      const entry = entries[0];
      if (entry) {
        const [path, op] = entry;
        if (isComparison(op)) {
          const fullPath = path.startsWith('ctx.payload.')
            ? path
            : `ctx.payload.${path}`;
          return {
            compare: {
              [fullPath]: { [(op as ComparisonOp).operator]: (op as ComparisonOp).value },
            },
          };
        }
      }
    }

    return spec;
  }

  _compileTransforms(transforms: Record<string, unknown>[]): Record<string, unknown> {
    if (transforms.length === 1 && transforms[0]) {
      return this._compileTransformEntry(transforms[0]);
    }

    return {
      chain: transforms.map((t) => this._compileTransformEntry(t)),
    };
  }

  _compileTransformEntry(entry: Record<string, unknown>): Record<string, unknown> {
    if ('id' in entry && entry.id) {
      return { script: entry };
    }

    return entry;
  }
}
