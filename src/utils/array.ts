import { isArray } from "./is";

export function flattenArray<T>(items: (T | T[] | (T | T[])[])[], result: T[]): T[] {
  for (const item of items) {
    if (isArray(item)) {
      flattenArray(item, result);
    } else {
      result.push(item);
    }
  }

  return result;
}
