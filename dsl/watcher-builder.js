const { isComparison } = require('./comparison-operators');
const { isQuery, isRawQuery, compileQuery } = require('./query-compiler');

class WatcherBuilder {
  constructor() {
    this._schedule = null;
    this._input = null;
    this._condition = null;
    this._transforms = [];
    this._actions = {};
    this._metadata = null;
  }

  hasState() {
    return !!(
      this._schedule ||
      this._input ||
      this._condition ||
      this._transforms.length ||
      Object.keys(this._actions).length ||
      this._metadata
    );
  }

  setSchedule(spec) {
    this._schedule = spec;
  }

  setInput(spec) {
    this._input = spec;
  }

  setCondition(spec) {
    this._condition = spec;
  }

  addTransform(spec) {
    this._transforms.push(spec);
  }

  addWebhookAction({ name, transform, throttle_period, configs }) {
    const action = {};

    if (throttle_period) {
      action.throttle_period = throttle_period;
    }

    if (transform) {
      action.transform = this._compileTransformEntry(transform);
    }

    action.webhook = configs;

    this._actions[name || 'send_slack_message'] = action;
  }

  setMetadata(spec) {
    this._metadata = spec;
  }

  compile() {
    const watch = {};

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

  _compileInput(spec) {
    const staticFields = {};
    const searchInputs = [];

    for (const [key, value] of Object.entries(spec)) {
      if (isQuery(value)) {
        searchInputs.push({
          [key]: compileQuery(value.spec),
        });
      } else if (isRawQuery(value)) {
        searchInputs.push({
          [key]: { search: { request: value.body } },
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

    const inputs = [];

    if (hasStatic) {
      inputs.push({ static: { simple: staticFields } });
    }

    for (const searchInput of searchInputs) {
      inputs.push(searchInput);
    }

    return { chain: { inputs } };
  }

  _compileCondition(spec) {
    if (typeof spec === 'string') {
      return { script: { source: spec } };
    }

    if (spec.id) {
      return { script: spec };
    }

    const entries = Object.entries(spec);
    if (entries.length === 1) {
      const [path, op] = entries[0];
      if (isComparison(op)) {
        const fullPath = path.startsWith('ctx.payload.')
          ? path
          : `ctx.payload.${path}`;
        return {
          compare: {
            [fullPath]: { [op.operator]: op.value },
          },
        };
      }
    }

    return spec;
  }

  _compileTransforms(transforms) {
    if (transforms.length === 1) {
      return this._compileTransformEntry(transforms[0]);
    }

    return {
      chain: transforms.map((t) => this._compileTransformEntry(t)),
    };
  }

  _compileTransformEntry(entry) {
    if (entry.id) {
      return { script: entry };
    }

    return entry;
  }
}

module.exports = { WatcherBuilder };
