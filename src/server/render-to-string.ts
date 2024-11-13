import { isFunction, isReadSignal, root } from "@maverick-js/signals";
import type { CustomElementConstructor } from "../dom/create-custom-element";
import type { JSX } from "../jsx/jsx";
import { unwrapDeep } from "../utils/function";
import { isArray, isBoolean, isNil, isString } from "../utils/is";
import { isVNode, type VNode } from "../jsx/vnode";
import { escapeHTML } from "./escape";
import { SETUP_SYMBOL } from "../dom/symbols";
import { HTMLCustomServerElement } from "./server-element";
import { getShadowRootMode } from "../dom/utils/shadow-dom";
import { isCustomElementConstructor } from "../dom/is";

export function renderToString(value: JSX.Element) {
  return root((dispose) => {
    const result = renderNode(value);
    dispose();
    return result;
  });
}

function renderNode(value: JSX.Element): string {
  if (isNil(value) || isBoolean(value)) {
    return "<!~>";
  } else if (isCustomElementConstructor(value)) {
    return renderCustomElement(value);
  } else if (isFunction(value)) {
    return renderNode(unwrapDeep(value()));
  } else if (isArray(value)) {
    let result = "";
    for (let i = 0; i < value.length; i++) result += renderNode(value[i]);
    return result;
  } else if (isVNode(value)) {
    if (isString(value.type)) {
      return renderElement(value);
    } else if (isCustomElementConstructor(value.type)) {
      return renderCustomElement(value.type);
    } else {
      return renderNode((value.type as JSX.Component<any>)(value));
    }
  } else {
    return value === "" ? " " : escapeHTML(value + "");
  }
}

function renderElement({ type, props, style, children }: VNode): string {
  let result = `<${type}`,
    innerHTML = "";

  for (const prop of Object.keys(props)) {
    if (prop[0] === "o" && prop[1] === "n" && prop[2] === ":") {
      // no-op
    } else if (prop === "innerHTML") {
      innerHTML = unwrapDeep(props[prop]) + "";
    } else {
      // map prop to attr (unwrap)
    }
  }

  result += ">";
  result += innerHTML || renderNode(children);

  return result + `/${type}`;
}

function renderCustomElement(ctor: CustomElementConstructor, vnode?: VNode): string {
  let { name, shadowRoot } = ctor.options,
    host = new HTMLCustomServerElement(ctor),
    result = `<${name}`;

  if (vnode) {
    const { props, style, children } = vnode;

    for (const prop of Object.keys(props)) {
      const value = props[prop] as any;
      (host.$props as any)[prop]?.set(isReadSignal(value) ? value() : value);
    }

    host[SETUP_SYMBOL]();

    result += renderStyle(style);
    result += ` ${ctor.managedAttribute}>`;

    if (shadowRoot) {
      result += `<template shadowrootmode="${getShadowRootMode(shadowRoot)}">`;
    }

    result += host.textContent || renderNode(children);

    if (shadowRoot) {
      result += "</template>";
    }
  } else {
    host[SETUP_SYMBOL]();
    result += ` ${ctor.managedAttribute}>`;
  }

  return result + `</${name}>`;
}

function renderStyle(style: VNode["style"]) {
  let result = "";

  return result;
}
