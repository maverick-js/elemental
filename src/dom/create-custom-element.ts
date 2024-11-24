import { createScope, scoped, signal, type Scope, type WriteSignal } from "@maverick-js/signals";
import type { ReadSignalRecord, WriteSignalRecord } from "../core/types";
import { inferToProp, type AttributeConverterMap, type Attributes } from "./attrs";
import { setHostElement, type ConnectCallback, type DisconnectCallback } from "./lifecycle";
import { isString } from "../utils/is";
import { camelToKebabCase } from "../utils/string";
import {
  ATTRIBUTES_SYMBOL,
  CONNECT_CALLBACKS_SYMBOL,
  DEFINED_SYMBOL,
  DISCONNECT_CALLBACKS_SYMBOL,
  READY_CALLBACKS_SYMBOL,
  SETUP_SYMBOL,
} from "./symbols";
import type { CustomElementEventTarget } from "./events";
import { attachDeclarativeShadowDOM, attachShadow } from "./utils/shadow-dom";
import type { JSX } from "../jsx/jsx";
import { isCustomElementDefined } from "./define-custom-element";
import { hydrating } from "./render/hydrate-root";
import { ELEMENTAL } from "../core/symbols";
import { isCustomElementNode, isCustomElementSetup } from "./is";
import { CustomServerElement } from "../server";

const enum ReadyState {
  Idle = 0,
  Pending = 1,
  Setup = 2,
}

export interface CustomElementOptions<Props = {}> {
  /** The name of the custom element (e.g., my-element). */
  readonly name: string;
  /** Property initialization. */
  readonly props: Props;
  /** Custom property to attribute mappings and value conversions. */
  readonly attrs?: Attributes<Props>;
  /**
   * Option to define shadow DOM attachment mode:
   *
   * - If `true`, attaches a shadow root with default options.
   * - If `ShadowRootInit`, attaches with the specified configuration.
   */
  readonly shadowRoot?: true | ShadowRootInit;
  /** Setup hook. */
  setup(
    this: CustomElement<Props> | CustomServerElement<Props>,
    context: SetupContext<Props>
  ): void;
}

export interface SetupContext<Props = {}> {
  $props: ReadSignalRecord<Props>;
}

export interface CustomElementConstructor<Props = {}, Events = {}> {
  readonly managedAttribute: string;
  readonly options: CustomElementOptions<Props>;
  readonly [ATTRIBUTES_SYMBOL]: AttributeConverterMap<Props> | null;
  [DEFINED_SYMBOL]: boolean;
  new (): CustomElement<Props, Events>;
}

export type CustomElement<Props = {}, Events = {}> = Props &
  HTMLElement &
  CustomElementEventTarget<Events> & {
    readonly scope: Scope;
    readonly $props: WriteSignalRecord<Props>;
    readonly jsx: JSX.CustomElementAttributes<Props, Events>;

    /** 0 = Idle, 1 = Pending, 2 = Setup */
    readonly readyState: number;

    // Callbacks.
    readonly [READY_CALLBACKS_SYMBOL]: Array<() => void>;
    readonly [CONNECT_CALLBACKS_SYMBOL]: Array<ConnectCallback>;
    readonly [DISCONNECT_CALLBACKS_SYMBOL]: Array<DisconnectCallback>;

    [SETUP_SYMBOL](): void;

    connectedCallback?(): void;
    disconnectedCallback?(): void;
    adoptedCallback?(): void;
    attributeChangedCallback?(name: string, oldValue: string, newValue: string): void;

    destroy(): void;
  };

export function createCustomElement<T extends CustomElementConstructor<any, any>>(
  ctor: T
): InstanceType<T> {
  if (__SERVER__) {
    return new CustomServerElement(ctor) as any;
  }

  return document.createElement(ctor.options.name) as InstanceType<T>;
}

export function createCustomElementClass<Props = {}, Events = {}>(
  options: CustomElementOptions<Props>
): CustomElementConstructor<Props, Events> {
  const BaseClass = __SERVER__ ? CustomServerElement : HTMLElement;

  class CustomElement extends BaseClass {
    static readonly options: CustomElementOptions<Props> = options;
  }

  // Declare props on the prototype.
  for (const name of Object.keys(options.props as {})) {
    Object.defineProperty(CustomElement.prototype, name, {
      get() {
        return this.$props[name]();
      },
      set(value) {
        this.$props[name].set(value);
      },
    });
  }

  return CustomElement as unknown as CustomElementConstructor<Props, Events>;
}

export class HTMLCustomElement<Props = {}> extends HTMLElement implements CustomElement {
  static readonly managedAttribute = `data-${ELEMENTAL}-managed`;
  static readonly options: CustomElementOptions<any>;

  static [ATTRIBUTES_SYMBOL]: AttributeConverterMap<any> | null = null;
  static [DEFINED_SYMBOL] = false;

  readonly scope: Scope = createScope();
  readonly $props!: ReadSignalRecord<Props>;
  readonly jsx!: any;

  readonly [READY_CALLBACKS_SYMBOL]: Array<() => void> = [];
  readonly [CONNECT_CALLBACKS_SYMBOL]: Array<ConnectCallback> = [];
  readonly [DISCONNECT_CALLBACKS_SYMBOL]: Array<DisconnectCallback> = [];

  #state = ReadyState.Idle;
  #connectScope: Scope | null = null;
  #destroyed = false;

  get #ctor() {
    return this.constructor as CustomElementConstructor<Props>;
  }

  get #isManaged() {
    return this.hasAttribute(this.#ctor.managedAttribute);
  }

  get readyState() {
    return this.#state;
  }

  static get observedAttributes(): string[] {
    const propNames = Object.keys(this.options.props);
    if (!propNames.length) return [];

    if (!this[ATTRIBUTES_SYMBOL]) {
      const map: AttributeConverterMap<any> = new Map(),
        attrs = this.options.attrs;

      for (const propName of propNames) {
        let attr = attrs?.[propName],
          attrName = isString(attr) ? attr : !attr ? attr : attr?.attr;

        if (attrName === false) continue;
        if (!attrName) attrName = camelToKebabCase(propName);

        map.set(attrName, {
          prop: propName,
          toProp:
            (attr && !isString(attr) && attr?.toProp) || inferToProp(this.options.props[propName]),
        });
      }

      this[ATTRIBUTES_SYMBOL] = map;
    }

    return Array.from(this[ATTRIBUTES_SYMBOL].keys()) as string[];
  }

  constructor() {
    super();

    if (this.#ctor.options.shadowRoot) {
      if (hydrating) attachDeclarativeShadowDOM(this);
      if (!this.shadowRoot) attachShadow(this, this.#ctor.options.shadowRoot);
    }

    scoped(() => {
      // @ts-expect-error - override readonly.
      this.$props = this.#createProps(this.#ctor.options.props);
    }, this.scope);
  }

  #createProps(init: Props) {
    const signals = {} as Record<keyof Props, WriteSignal<any>>;

    for (const name of Object.keys(init as {}) as Array<keyof Props>) {
      signals[name] = signal(init[name]);
    }

    return signals;
  }

  #connect() {
    if (this.#isManaged) return;

    if (this.#state !== ReadyState.Idle) return;

    this.#state = ReadyState.Pending;

    const parent = this.#findParent();

    if (parent && (!isCustomElementDefined(parent.localName) || !isCustomElementSetup(parent))) {
      this.#waitForParent(parent);
      return;
    }

    this.#attach(parent);
  }

  #findParent() {
    let node: Node | null = this.parentNode;

    while (node) {
      if (isCustomElementNode(node)) return node;
      node = node.parentNode;
    }

    return null;
  }

  async #waitForParent(parent: CustomElement) {
    await window.customElements.whenDefined(parent.localName);

    if (parent.readyState !== ReadyState.Setup) {
      await new Promise<void>((resolve) => parent[READY_CALLBACKS_SYMBOL].push(resolve));
    }

    this.#attach(parent);
  }

  #attach(parent: CustomElement | null) {
    // Skip setting up if we disconnected while waiting for parent to connect.
    if (!this.isConnected) return;

    if (parent) {
      parent.scope.append(this.scope);
    }

    this.#setup();
  }

  #setup() {
    this.#readAttributes();
    this[SETUP_SYMBOL]();
    this.connectedCallback();
  }

  #readAttributes() {
    const attrs = this.#ctor[ATTRIBUTES_SYMBOL];

    if (!attrs) return;

    for (const attr of this.attributes) {
      let converter = attrs.get(attr.name as keyof Props);
      if (converter && converter.toProp) {
        (this.$props as WriteSignalRecord<Props>)[converter.prop].set(
          converter.toProp(this.getAttribute(attr.name), null)
        );
      }
    }
  }

  [SETUP_SYMBOL]() {
    scoped(() => {
      setHostElement(this);
      this.#ctor.options.setup.call(this as unknown as CustomElement<Props>, {
        $props: this.$props,
      });
      setHostElement(null);
    }, this.scope);

    this.#state = ReadyState.Setup;
  }

  connectedCallback() {
    if (this.#destroyed) return;

    if (this.#state !== ReadyState.Setup) {
      this.#connect();
      return;
    }

    // Could be called once element is no longer connected.
    if (!this.isConnected) return;

    for (const callback of this[READY_CALLBACKS_SYMBOL]) callback();
    this[READY_CALLBACKS_SYMBOL].length = 0;

    this.#connectScope = createScope();
    this.scope.append(this.#connectScope);

    for (const callback of this[CONNECT_CALLBACKS_SYMBOL]) {
      scoped(callback.bind(this), this.#connectScope);
    }
  }

  disconnectedCallback() {
    if (this.#destroyed) return;

    this.#connectScope?.dispose();
    this.#connectScope = null;

    for (const callback of this[DISCONNECT_CALLBACKS_SYMBOL]) {
      callback.call(this);
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this.#destroyed) return;

    const converter = this.#ctor[ATTRIBUTES_SYMBOL]?.get(name as keyof Props);

    if (converter) {
      (this as any)[converter.prop] = converter.toProp(newValue, oldValue);
    }
  }

  destroy() {
    if (this.#destroyed) return;

    if (this.isConnected) this.disconnectedCallback();

    this.scope.dispose();

    this[CONNECT_CALLBACKS_SYMBOL].length = 0;
    this[DISCONNECT_CALLBACKS_SYMBOL].length = 0;

    this.#destroyed = true;
  }
}
