import type { JSX } from "../../jsx/jsx";

import { createRoot, type Root } from "./create-root";

export let hydrating = false;

export function setHydrating(isHydrating: boolean) {
  hydrating = isHydrating;
}

/**
 * Hydrates the given JSX element into the container node, returning a new root instance.
 */
export function hydrateRoot(container: Node, node: JSX.Element): Root {
  try {
    setHydrating(true);
    const root = createRoot(container);
    root.render(node);
    return root;
  } finally {
    setHydrating(false);
  }
}
