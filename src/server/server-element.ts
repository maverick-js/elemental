import { createScope, scoped, signal, type WriteSignal } from "@maverick-js/signals";
import { ServerAttributes } from "./server-attributes";
import { ServerStyleDeclaration } from "./server-style-declaration";
import { ServerTokenList } from "./server-token-list";
import { DEFINED_SYMBOL, SETUP_SYMBOL } from "../dom/symbols";
import type { CustomElementOptions } from "../dom/create-custom-element";
import { setHostElement } from "../dom/lifecycle";
import type { ReadSignalRecord } from "../core/types";
import { escapeHTML } from "./escape";
import { SERVER_ELEMENT_SYMBOL, SERVER_SHADOW_ROOT_SYMBOL } from "./symbols";

/**
 * HTMLElement for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement}
 */
export class HTMLServerElement {
  readonly [SERVER_ELEMENT_SYMBOL] = true;

  readonly classList = new ServerTokenList();
  readonly style = new ServerStyleDeclaration();
  readonly attributes = new ServerAttributes({
    classList: this.classList,
    style: this.style,
  });

  #content = "";
  #shadowRoot: ServerShadowRoot | null = null;

  readonly tagName: string;
  readonly localName: string;

  get className() {
    return this.classList.toString();
  }

  set className(tokens: string) {
    this.classList.value = tokens;
  }

  get shadowRoot() {
    return this.#shadowRoot;
  }

  constructor(localName: string) {
    this.tagName = localName.toUpperCase();
    this.localName = localName;
  }

  get textContent() {
    return escapeHTML(this.#content);
  }

  set textContent(text: string) {
    this.#content = escapeHTML(text);
  }

  get innerHTML() {
    return this.#content;
  }

  set innerHTML(html: string) {
    this.#content = html;
  }

  getAttribute(name: string): string | null {
    return this.attributes.getAttribute(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.setAttribute(name, value);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.hasAttribute(name);
  }

  removeAttribute(name: string): void {
    return this.attributes.removeAttribute(name);
  }

  attachShadow(init: ShadowRootInit) {
    this.#shadowRoot = new ServerShadowRoot(init, this);
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
}

export interface CustomServerElementConstructor<Props = {}> {
  readonly managedAttribute: string;
  readonly options: CustomElementOptions<Props>;
  [DEFINED_SYMBOL]: boolean;
  new (): CustomServerElement<Props>;
}

/**
 * Custom Element for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements}
 */
export class CustomServerElement<Props = {}> extends HTMLServerElement {
  static [DEFINED_SYMBOL] = true;

  readonly scope = createScope();
  readonly $props!: ReadSignalRecord<Props>;

  constructor(readonly ctor: CustomServerElementConstructor<Props>) {
    super(ctor.options.name);

    const { shadowRoot } = ctor.options;
    if (shadowRoot) {
      this.attachShadow(shadowRoot === true ? { mode: "open" } : shadowRoot);
    }

    this.$props = this.#createProps(ctor.options.props);
  }

  #createProps(init: Props) {
    const signals = {} as Record<keyof Props, WriteSignal<any>>;

    for (const name of Object.keys(init as {}) as Array<keyof Props>) {
      signals[name] = signal(init[name]);
    }

    return signals;
  }

  [SETUP_SYMBOL]() {
    scoped(() => {
      setHostElement(this);
      this.ctor.options.setup.call(this, {
        $props: this.$props,
      });
      setHostElement(null);
    }, this.scope);
  }

  destroy() {
    this.scope.dispose();
  }

  override toString() {
    return (
      `<${this.localName}${this.attributes.toString()} ${this.ctor.managedAttribute}>` +
      (this.shadowRoot ? this.shadowRoot.toString() : "") +
      this.innerHTML +
      `</${this.localName}>`
    );
  }
}

/**
 * Shadow Root for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot}
 */
export class ServerShadowRoot {
  readonly [SERVER_SHADOW_ROOT_SYMBOL] = true;
  readonly mode: ShadowRootMode;
  readonly host: HTMLServerElement;

  #content = "";

  get textContent() {
    return escapeHTML(this.#content);
  }

  set textContent(text: string) {
    this.#content = escapeHTML(text);
  }

  get innerHTML() {
    return this.#content;
  }

  set innerHTML(html: string) {
    this.#content = html;
  }

  constructor(init: ShadowRootInit, host: HTMLServerElement) {
    this.mode = init.mode;
    this.host = host;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }

  toString() {
    if (!this.innerHTML) return "";
    return `<template shadowrootmode="${this.mode}">${this.innerHTML}</template>`;
  }
}
