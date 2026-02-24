const { describe, it } = require('node:test');
const {
  gt, gte, lt, lte, eq, notEq, isOneOf,
  isComparison, isOneOfMarker,
  COMPARISON_TAG, IS_ONE_OF_TAG,
} = require('./comparison-operators');

describe('comparison-operators', () => {
  describe('comparison operators', () => {
    it('gt creates a tagged marker with operator "gt"', (t) => {
      const result = gt(10);
      t.assert.strictEqual(result[COMPARISON_TAG], true);
      t.assert.strictEqual(result.operator, 'gt');
      t.assert.strictEqual(result.value, 10);
    });

    it('gte creates a tagged marker with operator "gte"', (t) => {
      const result = gte(5);
      t.assert.strictEqual(result.operator, 'gte');
      t.assert.strictEqual(result.value, 5);
    });

    it('lt creates a tagged marker with operator "lt"', (t) => {
      const result = lt(3);
      t.assert.strictEqual(result.operator, 'lt');
      t.assert.strictEqual(result.value, 3);
    });

    it('lte creates a tagged marker with operator "lte"', (t) => {
      const result = lte(0);
      t.assert.strictEqual(result.operator, 'lte');
      t.assert.strictEqual(result.value, 0);
    });

    it('eq creates a tagged marker with operator "eq"', (t) => {
      const result = eq('hello');
      t.assert.strictEqual(result.operator, 'eq');
      t.assert.strictEqual(result.value, 'hello');
    });

    it('notEq creates a tagged marker with operator "not_eq"', (t) => {
      const result = notEq(42);
      t.assert.strictEqual(result.operator, 'not_eq');
      t.assert.strictEqual(result.value, 42);
    });
  });

  describe('isComparison', () => {
    it('returns true for comparison markers', (t) => {
      t.assert.strictEqual(isComparison(gt(1)), true);
      t.assert.strictEqual(isComparison(lte(0)), true);
    });

    it('returns false for non-comparison objects', (t) => {
      t.assert.strictEqual(isComparison(null), false);
      t.assert.strictEqual(isComparison({}), false);
      t.assert.strictEqual(isComparison(42), false);
    });
  });

  describe('isOneOf', () => {
    it('creates a tagged marker with values', (t) => {
      const result = isOneOf('a', 'b', 'c');
      t.assert.strictEqual(result[IS_ONE_OF_TAG], true);
      t.assert.deepStrictEqual(result.values, ['a', 'b', 'c']);
    });

    it('flattens array arguments', (t) => {
      const result = isOneOf(['x', 'y']);
      t.assert.deepStrictEqual(result.values, ['x', 'y']);
    });

    it('is detected by isOneOfMarker', (t) => {
      t.assert.strictEqual(isOneOfMarker(isOneOf('a')), true);
      t.assert.strictEqual(isOneOfMarker(null), false);
      t.assert.strictEqual(isOneOfMarker({}), false);
    });
  });
});
