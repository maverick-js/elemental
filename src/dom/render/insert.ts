import { effect, isFunction, isReadSignal, peek, type ReadSignal } from "@maverick-js/signals";
import { $attr, $listen, $prop, $style, setStyle } from "../helpers";
import { isArray, isBoolean, isNil, isNull, isString, isUndefined } from "../../utils/is";
import { isVNode, type VNode } from "../../jsx/vnode";
import { defineCustomElement } from "../define-custom-element";
import type { JSX } from "../../jsx/jsx";
import { type CustomElement, type CustomElementConstructor } from "../create-custom-element";
import { createComment, createTextNode, isDOMNode, isTextNodeType } from "../../dom/utils/node";
import { SETUP_SYMBOL } from "../symbols";
import { hydrating } from "./hydrate-root";
import { unwrapDeep } from "../../utils/function";
import { reconcile } from "./reconcile";
import type { RenderedNode, RenderResult } from "./render";
import { isCustomElement, isCustomElementConstructor } from "../is";
import { createError } from "../../utils/error";

export function insert(
  parent: Node,
  newValue: JSX.Element,
  oldValue: RenderResult = null,
  before?: Node | null,
  isTracked = false
): RenderResult {
  if (hydrating && !oldValue) {
    oldValue = claimChildren(parent, before);
  }

  if (isNil(newValue) || isBoolean(newValue)) {
    return hydrating ? oldValue : removeNode(parent, oldValue, null, before);
  } else if (isCustomElementConstructor(newValue)) {
    const el = createCustomElement(newValue, oldValue);
    insertDOMNode(parent, el, oldValue, before);
    return el;
  } else if (isFunction(newValue)) {
    effect(() => {
      oldValue = insert(parent, unwrapDeep(newValue), oldValue, before, true);
    });
    return () => oldValue as RenderedNode;
  } else if (isArray(newValue)) {
    return insertArray(parent, newValue, oldValue, before, isTracked);
  } else if (isVNode(newValue)) {
    return insertVNode(parent, newValue, oldValue, before);
  } else if (isDOMNode(newValue)) {
    return insertDOMNode(parent, newValue, oldValue, before);
  } else {
    return insertTextNode(parent, newValue + "", oldValue, before);
  }
}

function createElement(vnode: VNode<string>, oldValue: RenderResult) {
  const { type, props, style, ref } = vnode,
    el =
      hydrating && isArray(oldValue) && isDOMNode(oldValue[0])
        ? (oldValue[0] as HTMLElement)
        : document.createElement(type);

  if (__DEV__ && hydrating && el.localName !== type) {
    throw createError(`hydration element mismatch, expected "${type}", received "${el.localName}"`);
  }

  setElementProps(el, props);
  if (style) setStyleProps(el, style);
  insertVNodeChildren(el, vnode);
  if (ref) callRefs(el, ref);

  return el;
}

function createCustomElement(
  ctor: CustomElementConstructor,
  oldValue?: RenderResult | null,
  vnode?: VNode | null
) {
  defineCustomElement(ctor);

  let el =
    hydrating && isArray(oldValue) && isCustomElement(oldValue[0])
      ? oldValue[0]
      : (document.createElement(ctor.options.name) as CustomElement);

  if (__DEV__ && hydrating && el.constructor !== ctor) {
    throw createError(
      `hydration custom element mismatch, expected constructor \`${ctor}\`, received constructor \`${el.constructor}\``
    );
  }

  if (vnode) {
    const { props, ref, style } = vnode;

    setElementProps(el, props);
    if (style) setStyleProps(el, style);

    el[SETUP_SYMBOL]();

    insertVNodeChildren(el, vnode);

    if (ref) callRefs(el, ref);
  } else {
    el[SETUP_SYMBOL]();
  }

  return el;
}

export function insertChildren(el: HTMLElement, children: JSX.Element[]): RenderResult {
  // We're passing in null for the last `before` argument here to prevent destructive changes.
  return insert(el, children, null, el.textContent || hasSignal(children) ? null : undefined);
}

function insertVNodeChildren(el: HTMLElement, { innerHTML, children }: VNode) {
  if (!isNull(innerHTML)) {
    if (isFunction(innerHTML)) {
      effect(() => {
        if (!hydrating) el.innerHTML = innerHTML();
      });
    } else if (!hydrating) {
      el.innerHTML = innerHTML;
    }
  } else {
    insertChildren(el, children);
  }
}

function hasSignal(list: JSX.Element[]) {
  let node: JSX.Element;

  for (let i = 1; i < list.length; i++) {
    node = list[i];
    if (isFunction(node)) {
      return true;
    } else if (isArray(node) && hasSignal(node)) {
      return true;
    }
  }

  return false;
}

export function isEventPropName(name: string) {
  return name[0] === "o" && name[1] === "n" && name[2] === ":";
}

export function setElementProps<T extends HTMLElement>(el: T, props: Record<string, any>) {
  for (const prop of Object.keys(props)) {
    const value = props[prop];
    if (isEventPropName(prop)) {
      const [namespace, eventType] = prop.split(":");
      $listen(el, eventType as any, value, namespace!.length > 2);
    } else if (prop in el) {
      if (isReadSignal(value)) {
        $prop(el, prop as keyof T, value as ReadSignal<any>);
      } else {
        el[prop as keyof T] = value;
      }
    } else if (isFunction(value)) {
      $attr(el, prop, value);
    } else if (!hydrating) {
      el.setAttribute(prop, value);
    }
  }
}

function callRefs<T>(instance: T, value: JSX.Ref<T> | JSX.RefArray<T>) {
  if (__DEV__ && !isFunction(value) && (!isArray(value) || !value.every(isFunction))) {
    throw createError(`ref must be a function or an array of functions, found ${value}`);
  }

  if (isArray(value)) {
    for (const callback of value) callback(instance);
  } else {
    value(instance);
  }
}

function setStyleProps(el: HTMLElement, style: JSX.CSSStyleProperties) {
  for (const prop of Object.keys(style) as Array<keyof JSX.CSSStyleProperties>) {
    const value = style[prop];
    if (isFunction(value)) {
      $style(el, prop, value);
    } else if (!hydrating) {
      setStyle(el, prop, value);
    }
  }
}

export function insertArray(
  parent: Node,
  newValue: JSX.Element[],
  oldValue: RenderResult,
  before?: Node | null,
  isTracked = false
) {
  const oldNodes = isArray(oldValue) ? (oldValue as Node[]) : null,
    newNodes: Node[] = [];

  if (resolveArray(newNodes, newValue, oldNodes, isTracked)) {
    effect(() => void (oldValue = insert(parent, newNodes, oldValue, before, true)));
    return (() => oldValue) as RenderResult;
  }

  if (hydrating) {
    if (newNodes.length === 0) {
      return oldValue;
    } else if (isUndefined(before)) {
      return [...parent.childNodes];
    }

    const firstNode = newNodes[0];
    if (firstNode?.parentNode !== parent) return oldValue;

    return claimChildren(parent, before);
  } else if (newNodes.length === 0) {
    const marker = removeNode(parent, oldValue, null, before);
    if (!isUndefined(before)) return marker;
  } else if (oldNodes) {
    if (oldNodes.length > 0) {
      reconcile(parent, oldNodes, newNodes);
    } else {
      appendNodes(parent, newNodes, before);
    }
  } else {
    oldValue && (parent.textContent = "");
    appendNodes(parent, newNodes);
  }

  return newNodes;
}

function claimChildren(parent: Node, before?: Node | null): Node[] {
  if (!before) {
    return [...parent.childNodes];
  } else {
    let node = parent.firstChild,
      nodes: Node[] = [];

    while (node && node !== before) {
      nodes.push(node);
      node = node.nextSibling;
    }

    return nodes;
  }
}

export function insertVNode(
  parent: Node,
  newNode: VNode,
  oldValue: RenderResult,
  before?: Node | null
) {
  const result = renderVNode(newNode, oldValue);
  // Fast path for DOM nodes which are the most common result.
  if (isDOMNode(result)) {
    return insertDOMNode(parent, result, oldValue, before);
  } else {
    return insert(parent, result, oldValue, before);
  }
}

type RenderedVNode = JSX.Element[] | ReadSignal<JSX.Element> | Node | null;

const vnodeCache = new WeakMap<VNode, RenderedVNode>();

function renderVNode(node: VNode, oldValue: RenderResult): RenderedVNode {
  if (vnodeCache.has(node)) {
    return vnodeCache.get(node)!;
  }

  let result: RenderedVNode;

  if (isString(node.type)) {
    result = createElement(node as VNode<string>, oldValue);
  } else if (isCustomElementConstructor(node.type)) {
    result = createCustomElement(node.type, oldValue, node as VNode<CustomElementConstructor>);
  } else {
    result = peek(() => resolveNode((node.type as JSX.Component<any>)(node), oldValue));
  }

  vnodeCache.set(node, result);

  return result;
}

export function insertDOMNode(
  parent: Node,
  newNode: Node,
  oldNode: RenderResult,
  before?: Node | null
): Node | [Node] | null {
  if ((hydrating && newNode.parentNode === parent) || newNode === oldNode) {
    return before ? [newNode] : newNode;
  } else if (isArray(oldNode)) {
    if (before) return removeNode(parent, oldNode, newNode, before);
    removeNode(parent, oldNode, newNode, null);
  } else if (isNil(oldNode) || !parent.firstChild) {
    parent.appendChild(newNode);
  } else {
    parent.replaceChild(newNode, parent.firstChild);
  }

  return newNode;
}

export function insertTextNode(
  parent: Node,
  text: string,
  oldValue: RenderResult,
  before?: Node | null
): Text | [Text] | null {
  if (
    hydrating &&
    isArray(oldValue) &&
    isDOMNode(oldValue[0]) &&
    isTextNodeType(oldValue[0]) &&
    oldValue[0].parentNode === parent
  ) {
    if (__DEV__ && oldValue[0].textContent !== text) {
      throw createError(`hydration text mismatch, expected "${text}", received "${oldValue}"`);
    }

    return oldValue[0];
  } else if (isDOMNode(oldValue) && isTextNodeType(oldValue)) {
    oldValue.data = text;
    return oldValue;
  } else {
    return removeNode(parent, oldValue, createTextNode(text), before) as [Text];
  }
}

export function removeNode(
  parent: Node,
  node: RenderResult,
  replacement: Node | null = null,
  before?: Node | null
): Node | [Node] | null {
  if (hydrating) {
    return null;
  }

  if (isCustomElement(node)) {
    node.destroy();
  }

  if (isUndefined(before)) {
    parent.textContent = "";
    return null;
  }

  const newNode = replacement || createComment("?");

  if (isArray(node) && node.length) {
    let el: Node,
      inserted = false,
      isParent = false;
    for (let i = node.length - 1; i >= 0; i--) {
      el = node[i] as Node;
      if (el !== newNode) {
        isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(newNode, el) : parent.insertBefore(newNode, before);
        else isParent && parent.removeChild(el);
      } else inserted = true;
    }
  } else if (isDOMNode(node)) {
    parent.replaceChild(newNode, node);
  } else {
    parent.insertBefore(newNode, before);
  }

  return [newNode];
}

function appendNodes(parent: Node, nodes: Node[], before?: Node | null) {
  if (isUndefined(before)) {
    for (let i = 0; i < nodes.length; i++) parent.appendChild(nodes[i]!);
  } else {
    for (let i = 0; i < nodes.length; i++) parent.insertBefore(nodes[i]!, before);
  }
}

function resolveArray(
  rendered: Node[],
  newNodes: JSX.Element[],
  oldNodes: Node[] | null,
  isTracked = false
): boolean {
  let isDynamic = false;

  for (let i = 0, len = newNodes.length; i < len; i++) {
    const newNode = newNodes[i],
      oldNode = oldNodes?.[rendered.length],
      result = resolveNode(newNode, oldNode);
    if (isFunction(result)) {
      if (isTracked) {
        const newNodes = unwrapDeep(newNode);
        isDynamic =
          resolveArray(
            rendered,
            isArray(newNodes) ? newNodes : [newNodes],
            oldNode ? [oldNode] : null
          ) || isDynamic;
      } else {
        // @ts-expect-error - signal will be correctly resolved inside the effect later.
        rendered.push(result);
        isDynamic = true;
      }
    } else if (isArray(result)) {
      isDynamic =
        resolveArray(rendered, result, oldNode ? [oldNode] : null, isTracked) || isDynamic;
    } else if (result) {
      rendered.push(result);
    }
  }

  return isDynamic;
}

function resolveNode(newNode: JSX.Element, oldNode: RenderResult = null) {
  if (isNil(newNode) || isBoolean(newNode)) {
    return null;
  } else if (isArray(newNode)) {
    return newNode;
  } else if (isDOMNode(newNode)) {
    return newNode;
  } else if (isVNode(newNode)) {
    return renderVNode(newNode, oldNode);
  } else if (isCustomElementConstructor(newNode)) {
    if (isCustomElement(oldNode) && oldNode.constructor === newNode) {
      return oldNode;
    } else {
      return createCustomElement(newNode, oldNode);
    }
  } else if (isFunction(newNode)) {
    return newNode;
  } else {
    const value = newNode + "";
    if (isDOMNode(oldNode) && isTextNodeType(oldNode) && oldNode.data === value) {
      return oldNode;
    } else {
      return createTextNode(value);
    }
  }
}
