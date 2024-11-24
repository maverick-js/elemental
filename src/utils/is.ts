export function noop(...args: any[]): any {}

export function isNil(value: unknown): value is null | undefined {
  return value == null;
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === "undefined";
}

export function isString(value: any): value is string {
  return typeof value === "string";
}

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isObject(value: unknown): value is object {
  return typeof value === "object";
}

export function isNonNullObject(value: unknown): value is object {
  return !isNull(value) && typeof value === "object";
}
