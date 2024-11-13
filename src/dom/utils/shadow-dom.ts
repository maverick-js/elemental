import { isHTMLTemplateElement } from "./node";

export function attachShadow(element: HTMLElement, init: true | ShadowRootInit) {
  return element.attachShadow(init === true ? { mode: "open" } : init);
}

export function getShadowRootMode(init: true | ShadowRootInit): ShadowRootMode {
  return init === true ? "open" : init.mode;
}

/**
 * Polyfill for attaching the Declarative Shadow DOM to the given element.
 *
 * @see {@link https://web.dev/articles/declarative-shadow-dom}
 */
export function attachDeclarativeShadowDOM(element: HTMLElement) {
  const template = element.firstElementChild;
  if (!isHTMLTemplateElement(template)) return;

  const mode = template?.getAttribute("shadowrootmode") as ShadowRootMode;
  if (!mode) return;

  const shadowRoot = element.attachShadow({ mode });
  shadowRoot.appendChild(template.content);

  template.remove();
}
