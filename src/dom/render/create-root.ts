import { createScope, scoped, type Scope } from "@maverick-js/signals";
import type { JSX } from "../../jsx/jsx";
import { removeNode, insert } from "./insert";
import type { RenderResult } from "./render";
import { HTMLServerElement, renderToString, ServerShadowRoot } from "../../server";

/**
 * Creates a new root instance for rendering JSX elements into the given container.
 */
export function createRoot<T extends Node | HTMLServerElement | ServerShadowRoot>(
  container: T
): Root<T> {
  return new Root<T>(container);
}

export class Root<T extends Node | HTMLServerElement | ServerShadowRoot> {
  #scope: Scope | null = null;
  #currentNode: RenderResult = null;

  readonly container: T;

  /**
   * Current render scope. Each time `render` is called a new scope is created and the previous
   * scope is disposed.
   */
  get scope() {
    return this.#scope;
  }

  constructor(container: T) {
    this.container = container;
  }

  render(node: JSX.Element): void {
    this.#dispose();
    scoped(() => {
      if (__SERVER__) {
        (this.container as HTMLServerElement | ServerShadowRoot).innerHTML = renderToString(node);
      } else {
        this.#currentNode = insert(this.container as Node, node, this.#currentNode);
      }
    }, (this.#scope = createScope()));
  }

  unmount() {
    if (__SERVER__) {
      this.#dispose();
    } else {
      this.#dispose();
      removeNode(this.container as Node, this.#currentNode);
    }
  }

  #dispose() {
    this.#scope?.dispose();
    this.#scope = null;
  }
}
