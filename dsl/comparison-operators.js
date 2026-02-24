const COMPARISON_TAG = Symbol('comparison');

function makeOp(operator, value) {
  return { [COMPARISON_TAG]: true, operator, value };
}

const gt = (value) => makeOp('gt', value);
const gte = (value) => makeOp('gte', value);
const lt = (value) => makeOp('lt', value);
const lte = (value) => makeOp('lte', value);
const eq = (value) => makeOp('eq', value);
const notEq = (value) => makeOp('not_eq', value);

const IS_ONE_OF_TAG = Symbol('isOneOf');

function isOneOf(...values) {
  return { [IS_ONE_OF_TAG]: true, values: values.flat() };
}

function isComparison(obj) {
  return obj != null && obj[COMPARISON_TAG] === true;
}

function isOneOfMarker(obj) {
  return obj != null && obj[IS_ONE_OF_TAG] === true;
}

module.exports = {
  COMPARISON_TAG,
  IS_ONE_OF_TAG,
  gt,
  gte,
  lt,
  lte,
  eq,
  notEq,
  isOneOf,
  isComparison,
  isOneOfMarker,
};
