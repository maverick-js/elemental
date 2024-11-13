import { isFunction } from "@maverick-js/signals";
import { isDOMNode, isElementNodeType } from "./utils/node";
import type { CustomElement } from "./create-custom-element";
import { DEFINED_SYMBOL, SETUP_SYMBOL } from "./symbols";

export function isCustomElement(value: unknown): value is CustomElement {
  return isDOMNode(value) && isCustomElementNode(value);
}

export function isCustomElementNode(node: Node): node is CustomElement {
  return isElementNodeType(node) && SETUP_SYMBOL in node;
}

export function isCustomElementConstructor(value: unknown): value is CustomElementConstructor {
  return isFunction(value) && DEFINED_SYMBOL in value;
}

export function isCustomElementSetup(node: CustomElement) {
  return node.readyState === 2;
}
