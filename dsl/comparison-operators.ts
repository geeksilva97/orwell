export const COMPARISON_TAG: unique symbol = Symbol('comparison');
export const IS_ONE_OF_TAG: unique symbol = Symbol('isOneOf');

export interface ComparisonOp {
  [COMPARISON_TAG]: true;
  operator: string;
  value: string | number;
}

export interface IsOneOfMarker {
  [IS_ONE_OF_TAG]: true;
  values: string[];
}

function makeOp(operator: string, value: string | number): ComparisonOp {
  return { [COMPARISON_TAG]: true, operator, value };
}

export const gt = (value: string | number): ComparisonOp => makeOp('gt', value);
export const gte = (value: string | number): ComparisonOp => makeOp('gte', value);
export const lt = (value: string | number): ComparisonOp => makeOp('lt', value);
export const lte = (value: string | number): ComparisonOp => makeOp('lte', value);
export const eq = (value: string | number): ComparisonOp => makeOp('eq', value);
export const notEq = (value: string | number): ComparisonOp => makeOp('not_eq', value);

export function isOneOf(...values: Array<string | string[]>): IsOneOfMarker {
  return { [IS_ONE_OF_TAG]: true, values: values.flat() };
}

export function isComparison(obj: unknown): obj is ComparisonOp {
  return obj != null && typeof obj === 'object' && (obj as Record<symbol, unknown>)[COMPARISON_TAG] === true;
}

export function isOneOfMarker(obj: unknown): obj is IsOneOfMarker {
  return obj != null && typeof obj === 'object' && (obj as Record<symbol, unknown>)[IS_ONE_OF_TAG] === true;
}
