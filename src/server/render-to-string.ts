import { isFunction, isReadSignal, root } from "@maverick-js/signals";
import type { JSX } from "../jsx/jsx";
import { unwrap, unwrapDeep } from "../utils/function";
import { isArray, isBoolean, isNil, isString } from "../utils/is";
import { isVNode, type VNode } from "../jsx/vnode";
import { escapeHTML } from "./escape";
import { SETUP_SYMBOL } from "../dom/symbols";
import { CustomServerElement, type CustomServerElementConstructor } from "./server-element";
import { isCustomElementConstructor } from "../dom/is";
import { ServerStyleDeclaration } from "./server-style-declaration";
import { camelToKebabCase } from "../utils/string";
import { setAttribute } from "../dom/helpers";
import type { CustomElementConstructor } from "../dom";

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

function renderElement({ type, props, style, innerHTML, children }: VNode): string {
  let result = `<${type}`;

  for (const prop of Object.keys(props)) {
    if (isEventPropName(prop)) {
      // no-op
    } else {
      const value = unwrap(props[prop]);
      if (isNil(value) || value === false) continue;
      result += ` ${prop.toLowerCase()}="${escapeHTML(value + "", true)}"`;
    }
  }

  if (style) result += renderStyle(style);

  result += ">";
  result += unwrap(innerHTML) ?? renderNode(children);

  return result + `</${type}>`;
}

function renderCustomElement<Props>(ctor: CustomElementConstructor<Props>, vnode?: VNode): string {
  const host = new CustomServerElement<Props>(
    ctor as unknown as CustomServerElementConstructor<Props>
  );

  if (vnode) {
    const { props, style } = vnode;
    setServerElementProps(host, props);
    if (style) setStyleDeclarationProps(host.style, style);
  }

  host[SETUP_SYMBOL]();

  if (vnode) {
    host.innerHTML = unwrap(vnode.innerHTML) ?? host.innerHTML + renderNode(vnode.children);
  }

  return host.toString();
}

export function setServerElementProps(host: CustomServerElement<any>, props: Record<string, any>) {
  for (const prop of Object.keys(props)) {
    if (isEventPropName(prop)) {
      // no-op
    } else if (prop in host.$props) {
      const value = props[prop];
      (host as any)[prop] = isReadSignal(value) ? value() : value;
    } else {
      setAttribute(host, prop.toLowerCase(), unwrap(props[prop]));
    }
  }
}

function renderStyle(props: JSX.CSSStyleProperties) {
  let result = "";

  for (const prop of Object.keys(props) as Array<keyof JSX.CSSStyleProperties>) {
    const value = unwrap(props[prop]);
    if (isNil(value) || value === false) continue;
    const name = prop[0] === "-" ? prop : camelToKebabCase(prop);
    result += `${name}: ${value};`;
  }

  return result ? ` style="${escapeHTML(result, true)}"` : "";
}

function setStyleDeclarationProps(style: ServerStyleDeclaration, props: JSX.CSSStyleProperties) {
  for (const prop of Object.keys(props)) {
    // @ts-expect-error
    style[prop] = unwrap(props[prop]);
  }
}

function isEventPropName(name: string) {
  return name[0] === "o" && name[1] === "n" && name[2] === ":";
}
