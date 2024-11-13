import type { CustomElementConstructor } from "./create-custom-element";
import { DEFINED_SYMBOL } from "./symbols";

let registry = !__SERVER__ ? window.customElements : null;

export function defineCustomElement(ctor: CustomElementConstructor) {
  if (__SERVER__ || ctor[DEFINED_SYMBOL]) return;
  const tagName = ctor.options.name;
  registry!.define(tagName, ctor);
  ctor[DEFINED_SYMBOL] = true;
}

export function isCustomElementDefined(tagName: string) {
  if (__SERVER__) return false;
  return !!registry!.get(tagName);
}
