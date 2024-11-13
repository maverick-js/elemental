import { isFunction } from "@maverick-js/signals";

/**
 * Unwraps possible function calls and returns the value. It will return the value if the given
 * argument is not a function.
 */
export function unwrap<T>(value: T): T extends () => any ? ReturnType<T> : T {
  return isFunction(value) ? value() : value;
}

/**
 * Recursively unwraps possible function calls and returns the final value. It will return
 * the value if the given argument is not a function.
 */
export function unwrapDeep<T>(value: T): DeepReturnType<T> {
  while (typeof value === "function") value = value();
  return value as any;
}

export type DeepReturnType<T> = T extends () => any
  ? ReturnType<T> extends () => any
    ? DeepReturnType<ReturnType<T>>
    : ReturnType<T>
  : T;
