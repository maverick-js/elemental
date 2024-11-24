import { isString } from "../utils/is";
import { camelToKebabCase } from "../utils/string";

const propRE = /\s*:\s*/;
const delimiterRE = /\s*;\s*/;

/**
 * CSS style declaration for server-side rendering.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style}
 */
export class ServerStyleDeclaration {
  #tokens = new Map<string, string>();

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

  constructor() {
    return new Proxy<ServerStyleDeclaration>(this, {
      set(target, prop, value, receiver) {
        if (isString(prop) && !(prop in target)) {
          const name = prop[0] === "-" ? prop : camelToKebabCase(prop);
          if (!value && value !== 0) {
            target.removeProperty(name);
          } else {
            target.setProperty(name, value + "");
          }
        }

        return Reflect.set(target, prop, value, receiver);
      },
    });
  }

  getPropertyValue(prop: string): string {
    return this.#tokens.get(prop) ?? "";
  }

  setProperty(prop: string, value: string | null) {
    this.#tokens.set(prop, value ?? "");
  }

  removeProperty(prop: string): string {
    const value = this.#tokens.get(prop);
    this.#tokens.delete(prop);
    return value ?? "";
  }

  parse(attribute: string, resolveName?: (name: string) => string) {
    const styles = attribute.trim().split(delimiterRE);
    for (let i = 0; i < styles.length; i++) {
      if (styles[i] === "") continue;
      const [name, value] = styles[i]!.split(propRE);
      if (name && value) this.setProperty(resolveName?.(name) ?? name, value);
    }
  }

  toString() {
    if (this.#tokens.size === 0) return "";

    let result = "";

    for (const [name, value] of this.#tokens) {
      result += `${name}: ${value};`;
    }

    return result;
  }
}
