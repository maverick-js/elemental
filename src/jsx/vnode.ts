import { ELEMENTAL } from "../core/symbols";
import type { CustomElementConstructor } from "../dom/create-custom-element";
import type { JSX } from "./jsx";

const VNODE_SYMBOL = Symbol.for(`${ELEMENTAL}.vnode`);

export type VNodeType =
  | keyof HTMLElementTagNameMap
  | keyof SVGElementTagNameMap
  | CustomElementConstructor
  | JSX.Component<any>
  | (string & {});

export interface VNode<Type extends VNodeType = VNodeType> {
  readonly type: Type;
  readonly props: Record<string, unknown>;
  readonly style?: JSX.CSSStyleProperties;
  readonly ref?: JSX.Ref<Node> | JSX.RefArray<Node>;
  readonly children: Array<JSX.Element>;
}

export const h = createVNode;

export function createVNode<T extends VNodeType>(
  type: T,
  {
    ref,
    style,
    ...props
  }: T extends CustomElementConstructor<infer Props, infer Events>
    ? JSX.CustomElementAttributes<Props, Events>
    : T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : Record<string, unknown> = {} as any,
  ...children: JSX.Element[]
): VNode {
  return {
    constructor: VNODE_SYMBOL,
    type,
    props,
    ref,
    style,
    children,
  } as unknown as VNode;
}

export function isVNode(value: unknown): value is VNode {
  return value != null && (value as any).constructor === VNODE_SYMBOL;
}
