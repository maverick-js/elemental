import { effect, isFunction, isReadSignal, peek, type ReadSignal } from "@maverick-js/signals";
import { $listen, $prop, $style, setStyle } from "../helpers";
import { isArray, isBoolean, isNil, isString, isUndefined } from "../../utils/is";
import { isVNode, type VNode } from "../../jsx/vnode";
import { defineCustomElement } from "../define-custom-element";
import type { JSX } from "../../jsx/jsx";
import { type CustomElement, type CustomElementConstructor } from "../create-custom-element";
import { createComment, createTextNode, isDOMNode, isTextNodeType } from "../../dom/utils/node";
import { SETUP_SYMBOL } from "../symbols";
import { hydrating } from "./hydrate-root";
import { unwrapDeep } from "../../utils/function";
import { reconcile } from "./reconcile";
import { flattenArray } from "../../utils/array";
import type { WriteSignalRecord } from "../../core/types";
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
  if (isNil(newValue) || isBoolean(newValue)) {
    return removeNode(parent, oldValue, null, before);
  } else if (isCustomElementConstructor(newValue)) {
    const el = createCustomElement(newValue);
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
    return insertVNode(parent, newValue, oldValue, before, isTracked);
  } else if (isDOMNode(newValue)) {
    return insertDOMNode(parent, newValue, oldValue, before);
  } else {
    return insertTextNode(parent, newValue + "", oldValue, before);
  }
}

function createElement({ type, props, ref, style, children }: VNode<string>) {
  const el = document.createElement(type);

  setElProps(el, props);

  if (ref) callRefs(el, ref);
  if (style) setStyleProps(el, style);

  insertChildren(el, children);

  return el;
}

function createCustomElement(
  ctor: CustomElementConstructor,
  oldValue?: Node | null,
  vnode?: VNode | null
) {
  defineCustomElement(ctor);

  const el =
      hydrating && isCustomElement(oldValue)
        ? oldValue
        : (document.createElement(ctor.options.name) as CustomElement),
    $props = el.$props;

  if (vnode) {
    const { props, ref, style, children } = vnode;

    for (const prop of Object.keys(vnode.props)) {
      if (!(prop in $props)) continue;

      const value = props[prop] as any,
        $prop = ($props as WriteSignalRecord<Record<string, any>>)[prop]!;

      if (isReadSignal(value)) {
        effect(() => void $prop.set(value()));
      } else {
        $prop.set(value);
      }
    }

    if (ref) callRefs(el, ref);
    if (style) setStyleProps(el, style);

    insertChildren(el, children);
  }

  el[SETUP_SYMBOL]();

  return el;
}

export function insertChildren(el: HTMLElement, children: JSX.Element[]) {
  insert(el, children, null, hasSignal(children) ? null : undefined);
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

function setElProps<T extends HTMLElement>(el: T, props: Record<string, any>) {
  for (const prop of Object.keys(props)) {
    const value = props[prop];
    if (prop[0] === "o" && prop[1] === "n" && prop[2] === ":") {
      const [namespace, eventType] = prop.split(":");
      $listen(el, eventType as any, value, namespace!.length > 3);
    } else if (isFunction(value)) {
      $prop(el, prop as keyof T, value);
    } else if (prop in el) {
      el[prop as keyof T] = value;
    } else {
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
  newValue = flattenArray(newValue, []);

  const oldNodes = hydrating
      ? claimArray(parent, before)
      : isArray(oldValue)
      ? (oldValue as Node[])
      : null,
    newNodes: Node[] = [];

  if (resolveArray(newNodes, newValue, oldNodes, isTracked)) {
    effect(() => void (oldValue = insert(parent, newNodes, oldValue, before, true)));
    return (() => oldValue) as RenderResult;
  }

  if (hydrating) {
    if (newNodes.length === 0) {
      return null;
    } else {
      return oldNodes as Node[];
    }
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
    oldValue && removeNode(parent, oldValue, null, before);
    appendNodes(parent, newNodes);
  }

  return newNodes;
}

function claimArray(parent: Node, before?: Node | null): Node[] {
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
  oldNode: RenderResult,
  before?: Node | null,
  isTracked = false
) {
  const result = renderVnode(newNode);
  // Fast path for DOM nodes which are the most common result.
  if (isDOMNode(result)) {
    return insertDOMNode(parent, result, oldNode, before);
  } else {
    return insert(parent, result, oldNode, before, isTracked);
  }
}

type RenderedVNode = JSX.Element[] | ReadSignal<JSX.Element> | Node | null;

const vnodeCache = new WeakMap<VNode, RenderedVNode>();

function renderVnode(node: VNode): RenderedVNode {
  if (vnodeCache.has(node)) {
    return vnodeCache.get(node)!;
  }

  let result: RenderedVNode;

  if (isString(node.type)) {
    result = createElement(node as VNode<string>);
  } else if (isCustomElementConstructor(node.type)) {
    result = createCustomElement(node.type, node as VNode<CustomElementConstructor>);
  } else {
    result = peek(() => resolveNode((node.type as JSX.Component<any>)(node), null));
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
  if (hydrating || newNode === oldNode) {
    // no-op
  } else if (before || isArray(oldNode)) {
    if (!isUndefined(before)) {
      return removeNode(parent, oldNode, newNode, before);
    }

    removeNode(parent, oldNode, newNode, null);
  } else if (!oldNode || !parent.firstChild) {
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
  if (hydrating) {
    return claimNode<Text>();
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
        const nextNode = unwrapDeep(newNode);
        isDynamic =
          resolveArray(
            rendered,
            isArray(nextNode) ? nextNode : [nextNode],
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
    return renderVnode(newNode);
  } else if (isCustomElementConstructor(newNode)) {
    if (isCustomElement(oldNode) && oldNode.constructor === newNode) {
      return oldNode;
    } else {
      return createCustomElement(newNode);
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
