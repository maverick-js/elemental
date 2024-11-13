import { ELEMENTAL, ERROR_SYMBOL } from "../core/symbols";
import { isObject } from "./is";

export function createError(message: string): Error {
  const error = new Error(`[${ELEMENTAL}]: ${message}`);
  (error as any)[ERROR_SYMBOL] = true;
  return error;
}

export function isElementalError(error: unknown): error is Error {
  return error != null && isObject(error) && ERROR_SYMBOL in error;
}
