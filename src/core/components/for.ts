import { isFunction, type Maybe, type ReadSignal } from "@maverick-js/signals";
import type { JSX } from "../../jsx/jsx";
import { computedKeyedMap, computedMap } from "@maverick-js/signals/map";
import { unwrapDeep } from "../../utils/function";

export interface ForProps<Item = unknown> {
  each: Maybe<Item[] | ReadSignal<Item[]>>;
  children: ForMap<Item>;
}

export interface ForMap<Item = unknown> {
  (item: ReadSignal<Item>, index: number): JSX.Element;
}

export function For<Item = unknown>({ each, children }: ForProps<Item>) {
  if (!__SERVER__ && isFunction(each)) {
    return computedMap(each, children);
  } else if (each) {
    return unwrapDeep(each).map((item, index) => children(() => item, index));
  } else {
    return null;
  }
}

export interface ForKeyedProps<Item = unknown> {
  each: Maybe<Item[] | ReadSignal<Item[]>>;
  children: ForKeyedMap<Item>;
}

export interface ForKeyedMap<Item = unknown> {
  (item: Item, index: ReadSignal<number>): JSX.Element;
}

export function ForKeyed<Item = unknown>({ each, children }: ForKeyedProps<Item>) {
  if (!__SERVER__ && isFunction(each)) {
    return computedKeyedMap(each, children);
  } else if (each) {
    return unwrapDeep(each).map((item, index) => children(item, () => index));
  } else {
    return null;
  }
}
