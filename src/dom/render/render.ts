import { currentHostElement, throwIfNoHostElement } from "../lifecycle";
import type { JSX } from "../../jsx/jsx";
import type { NonReactive } from "../../core/types";
import { createRoot } from "./create-root";

export type RenderedNode = Node | Node[] | null;

export type RenderResult = NonReactive<RenderedNode>;

/**
 * Renders the given JSX element into the current host element. If a shadow root is present, the
 * element will be rendered into it, otherwise it will be rendered into the host element itself.
 */
export function render(children: JSX.Element) {
  if (__DEV__) throwIfNoHostElement(render.name);
  const root = createRoot(currentHostElement!.shadowRoot ?? currentHostElement!);
  root.render(children);
  return root;
}
