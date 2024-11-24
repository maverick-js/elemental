import { escapeHTML } from "./escape";
import type { ServerStyleDeclaration } from "./server-style-declaration";
import type { ServerTokenList } from "./server-token-list";

export interface ServerAttributesInit {
  classList?: ServerTokenList;
  style?: ServerStyleDeclaration;
}

/**
 * Server-side attributes for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes}
 */
export class ServerAttributes {
  #tokens = new Map<string, string>();
  #classList: ServerTokenList | null = null;
  #style: ServerStyleDeclaration | null = null;

  get length() {
    return this.#tokens.size;
  }

  get tokens() {
    return this.#tokens;
  }

  constructor(init?: ServerAttributesInit) {
    if (init) {
      const { classList, style } = init;
      if (classList) this.#classList = classList;
      if (style) this.#style = style;
    }
  }

  getAttribute(name: string): string | null {
    if (this.#classList && name === "class") {
      return this.#classList.toString();
    } else if (this.#style && name === "style") {
      return this.#style.toString();
    } else {
      return this.#tokens.get(name) ?? null;
    }
  }

  hasAttribute(name: string) {
    if (this.#classList && name === "class") {
      return this.#classList.length > 0;
    } else if (this.#style && name === "style") {
      return this.#style.length > 0;
    } else {
      return this.#tokens.has(name);
    }
  }

  setAttribute(name: string, value: string) {
    if (this.#classList && name === "class") {
      this.#classList.value = value;
    } else if (this.#style && name === "style") {
      this.#style.value = value;
    } else {
      this.#tokens.set(name, value + "");
    }
  }

  removeAttribute(name: string) {
    if (this.#classList && name === "class") {
      this.#classList.value = "";
    } else if (this.#style && name === "style") {
      this.#style.value = "";
    } else {
      this.#tokens.delete(name);
    }
  }

  toString() {
    let result = "";

    if (this.#classList) {
      const value = this.#classList.toString();
      if (value) result += ` class="${escapeHTML(value, true)}"`;
    }

    if (this.#style) {
      const value = this.#style.toString();
      if (value) result += ` style="${escapeHTML(value, true)}"`;
    }

    for (const [name, value] of this.#tokens) {
      result += ` ${name}="${escapeHTML(value, true)}"`;
    }

    return result;
  }
}
