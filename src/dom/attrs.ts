import type { SignalOptions } from "@maverick-js/signals";
import { isArray } from "../utils/is";

export type AttributeValue = string | null;

export type Attributes<Props = {}> = {
  [P in keyof Props]?: string | false | Attribute<Props[P]>;
};

export interface AttributeConverter<Value = unknown> {
  (newValue: AttributeValue, oldValue: AttributeValue): Value;
}

export interface Attribute<Value = unknown> extends SignalOptions<Value> {
  /**
   * Whether the property is associated with an attribute, or a custom name for the associated
   * attribute. By default this is `true` and the attribute name is inferred by kebab-casing the
   * property name.
   */
  attr?: string | false;
  /**
   * Convert between an attribute value and property value. If not specified, it will be inferred
   * from the initial value.
   */
  toProp?: AttributeConverter<Value>;
}

export type AttributeConverterMap<Props = {}> = Map<
  keyof Props,
  { [P in keyof Props]: { prop: P; toProp: AttributeConverter<Props[P]> } }[keyof Props]
>;

export const toStringProp: AttributeConverter<string | null> = (v) => (v === null ? "" : v + "");

export const toNullableStringProp: AttributeConverter<string | null> = (v) =>
  v === null ? null : v + "";

export const toNumberProp: AttributeConverter<number | null> = (v) => (v === null ? 0 : Number(v));

export const toNullableNumberProp: AttributeConverter<number | null> = (v) =>
  v === null ? null : Number(v);

export const toBooleanProp: AttributeConverter<boolean | null> = (v) => v !== null;

export const toArrayProp: AttributeConverter<unknown[] | null> = (v) =>
  v === null ? [] : JSON.parse(v);

export const toObjectProp: AttributeConverter<object | null> = (v) =>
  v === null ? {} : JSON.parse(v);

export function inferToProp(value: unknown): AttributeConverter<any> {
  if (value === null) return toNullableStringProp;
  switch (typeof value) {
    case "undefined":
      return toStringProp;
    case "string":
      return toStringProp;
    case "boolean":
      return toBooleanProp;
    case "number":
      return toNumberProp;
    case "object":
      return isArray(value) ? toArrayProp : toObjectProp;
    default:
      return toStringProp;
  }
}
