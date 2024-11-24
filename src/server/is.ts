import { DEFINED_SYMBOL } from "../dom/symbols";
import { isNonNullObject } from "../utils/is";
import type { CustomServerElement, HTMLServerElement, ServerShadowRoot } from "./server-element";
import { SERVER_ELEMENT_SYMBOL, SERVER_SHADOW_ROOT_SYMBOL } from "./symbols";

export function isHTMLServerElement(value: unknown): value is HTMLServerElement {
  return isNonNullObject(value) && SERVER_ELEMENT_SYMBOL in value;
}

export function isCustomServerElement(value: unknown): value is CustomServerElement {
  return isHTMLServerElement(value) && DEFINED_SYMBOL in value;
}

export function isServerShadowRoot(value: unknown): value is ServerShadowRoot {
  return isNonNullObject(value) && SERVER_SHADOW_ROOT_SYMBOL in value;
}
