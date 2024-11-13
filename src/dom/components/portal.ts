import { computed, effect, isFunction, onDispose, scoped } from "@maverick-js/signals";
import type { JSX } from "../../jsx/jsx";
import type { Reactive } from "../../core/types";
import { isString } from "../../utils/is";
import { createRoot } from "../render/create-root";

export type PortalTarget = Element | string | null;

export interface PortalProps {
  to: Reactive<PortalTarget>;
  children: JSX.Element;
}

export function Portal({ to, children }: PortalProps) {
  if (isFunction(to)) {
    const $target = computed(() => resolvePortalTarget(to()));
    effect(() => void portal($target(), children));
  } else {
    portal(resolvePortalTarget(to), children);
  }
}

export function portal(target: Element | null, children: JSX.Element) {
  if (!target) return;

  const container = document.createElement("div");
  container.style.display = "contents";
  container.setAttribute("data-portal", "");

  const root = createRoot(container);
  root.render(children);

  target.appendChild(container);

  scoped(() => {
    onDispose(() => void target.removeChild(container));
  }, root.scope);

  return root;
}

export function resolvePortalTarget(target: PortalTarget) {
  return isString(target) ? document.querySelector(target) : target;
}
