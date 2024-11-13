import type { ReadSignal, WriteSignal } from "@maverick-js/signals";

export type Reactive<T> = T | ReadSignal<T>;

export type NonReactive<T> = T | (() => T);

export type ReactiveRecord<T> = {
  [P in keyof T]: Reactive<T[P]>;
};

export type NullableRecord<T> = {
  [P in keyof T]: T[P] | null;
};

export type NullableReactiveRecord<T> = ReactiveRecord<NullableRecord<T>>;

export type Stringify<P> = P extends string ? P : never;

export type LowercaseProperties<T> = {
  [P in keyof T as Lowercase<Stringify<P>>]?: T[P] | null;
};

export type ReadSignalRecord<Record = {}> = {
  [Prop in keyof Record]: ReadSignal<Record[Prop]>;
};

export type WriteSignalRecord<Record = {}> = {
  [Prop in keyof Record]: WriteSignal<Record[Prop]>;
};

export type AnyRecord = {
  [name: string]: any;
};

export type StyleProp =
  | Exclude<
      keyof CSSStyleDeclaration,
      | "item"
      | "setProperty"
      | "removeProperty"
      | "getPropertyValue"
      | "getPropertyPriority"
      | "length"
      | "parentRule"
    >
  | `--${string}`
  | (string & {});
