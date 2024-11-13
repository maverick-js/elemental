import { createScope, scoped, signal, type WriteSignal } from "@maverick-js/signals";
import { ServerAttributes } from "./server-attributes";
import { ServerStyleDeclaration } from "./server-style-declaration";
import { ServerTokenList } from "./server-token-list";
import { DEFINED_SYMBOL, SETUP_SYMBOL } from "../dom/symbols";
import type { CustomElement, CustomElementConstructor } from "../dom/create-custom-element";
import { setHostElement } from "../dom/lifecycle";
import type { ReadSignalRecord } from "../core/types";
import { escapeHTML } from "./escape";

/**
 * Low-resolution HTMLElement for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement}
 */
export class HTMLServerElement {
  readonly attributes = new ServerAttributes();
  readonly style = new ServerStyleDeclaration();
  readonly classList = new ServerTokenList();

  #content = "";

  readonly tagName: string;
  readonly localName: string;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
    this.localName = tagName.toLowerCase();
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

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
}

/**
 * Low-resolution HTML Custom Element for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements}
 */
export class HTMLCustomServerElement<Props = {}> extends HTMLServerElement {
  static [DEFINED_SYMBOL] = true;

  readonly scope = createScope();
  readonly $props!: ReadSignalRecord<Props>;

  constructor(readonly ctor: CustomElementConstructor<Props>) {
    super(ctor.options.name);
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
      this.ctor.options.setup.call(this as unknown as CustomElement<Props>, {
        $props: this.$props,
      });
      setHostElement(null);
    }, this.scope);
  }

  destroy() {
    this.scope.dispose();
  }
}
