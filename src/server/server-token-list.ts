const separatorRE = /\s+/;

/**
 * Server-side token list for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/classList}
 */
export class ServerTokenList {
  #tokens = new Set<string>();

  static parse(value: string) {
    return value.trim().split(separatorRE);
  }

  get length() {
    return this.#tokens.size;
  }

  get tokens() {
    return this.#tokens;
  }

  get value() {
    return this.toString();
  }

  set value(value: string) {
    this.#tokens.clear();
    this.parse(value);
  }

  get values() {
    return [...this.#tokens];
  }

  add(...tokens: string[]): void {
    for (const token of tokens) {
      this.#tokens.add(token);
    }
  }

  contains(token: string): boolean {
    return this.#tokens.has(token);
  }

  remove(token: string) {
    this.#tokens.delete(token);
  }

  replace(token: string, newToken: string): boolean {
    if (!this.#tokens.has(token)) return false;
    this.#tokens.delete(token);
    this.#tokens.add(newToken);
    return true;
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== true && (this.#tokens.has(token) || force === false)) {
      this.#tokens.delete(token);
      return false;
    } else {
      this.#tokens.add(token);
      return true;
    }
  }

  parse(attribute: string) {
    const list = ServerTokenList.parse(attribute);
    for (const token of list) this.add(token);
  }

  toString() {
    return Array.from(this.#tokens).join(" ");
  }
}
