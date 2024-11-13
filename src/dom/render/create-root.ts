import { createScope, scoped, type Scope } from "@maverick-js/signals";
import type { JSX } from "../../jsx/jsx";
import { removeNode, insert } from "./insert";
import type { RenderResult } from "./render";

/**
 * Creates a new root instance for rendering JSX elements into the given container.
 */
export function createRoot(container: Node): Root {
  return new Root(container);
}

export class Root {
  #scope: Scope | null = null;
  #currentNode: RenderResult = null;

  readonly container: Node;

  /**
   * Current render scope. Each time `render` is called a new scope is created and the previous
   * scope is disposed.
   */
  get scope() {
    return this.#scope;
  }

  constructor(container: Node) {
    this.container = container;
  }

  render(node: JSX.Element): void {
    this.#dispose();
    scoped(() => {
      this.#currentNode = insert(this.container, node, this.#currentNode);
    }, (this.#scope = createScope()));
  }

  unmount() {
    this.#dispose();
    removeNode(this.container, this.#currentNode);
  }

  #dispose() {
    this.#scope?.dispose();
    this.#scope = null;
  }
}
