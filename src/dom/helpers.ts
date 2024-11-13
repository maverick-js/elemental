import { effect, onDispose, type Dispose, type ReadSignal } from "@maverick-js/signals";
import type { InferCustomElementEvents, TargetedEventHandler } from "./events";
import { currentHostElement, throwIfNoHostElement } from "./lifecycle";
import type { CustomElement } from "./create-custom-element";
import type { StyleProp } from "../core/types";
import { noop } from "../utils/is";
import { ELEMENTAL } from "../core/symbols";

/**
 * Returns the current host element.
 */
export function getHost(): CustomElement {
  if (__DEV__) throwIfNoHostElement(getHost.name);
  return currentHostElement!;
}

/**
 * Returns the shadow root attached to the current host element.
 */
export function getShadowRoot(): ShadowRoot {
  if (__DEV__) throwIfNoHostElement(getShadowRoot.name);

  if (__DEV__ && !currentHostElement!.shadowRoot) {
    throw new Error(
      `[${ELEMENTAL}]: The host element does not have a shadow root. Make sure to attach one using the 'shadowRoot' option.`
    );
  }

  return currentHostElement!.shadowRoot!;
}

/**
 * Observe the given value signal and update the text content of the element.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent}
 */
export function $text(el: Element, text: ReadSignal<string | number>): Dispose {
  if (__SERVER__) {
    el.textContent = text() + "";
    return noop;
  }

  return effect(() => void (el.textContent = text() + ""));
}

/**
 * Observe the given value signal and update the inner HTML of the element.
 *
 * ⚠️ This function is not safe to use with user-generated content as it can lead to XSS attacks.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML}
 */
export function $html(el: Element, html: ReadSignal<string>): Dispose {
  if (__SERVER__) {
    el.innerHTML = html();
    return noop;
  }

  return effect(() => void (el.innerHTML = html()));
}

/**
 * Observe the given value signal and update the attribute with the given name. Falsy values except
 * `''` and `0` will remove the attribute.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function $attr(el: Element, name: string, value: ReadSignal<unknown>): Dispose {
  if (__SERVER__) {
    setAttribute(el, name, value());
    return noop;
  }

  return effect(() => setAttribute(el, name, value()));
}

/**
 * Observe the given value signal and update the property with the given name.
 */
export function $prop<T, P extends keyof T>(
  instance: T,
  prop: P,
  value: ReadSignal<T[P]>
): Dispose {
  if (__SERVER__) {
    instance[prop] = value();
    return noop;
  }

  return effect(() => void (instance[prop] = value()));
}

/**
 * Observe the given value signal and update the class list with the given name. Falsy values will
 * remove the class from the list.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/classList}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function $class(el: HTMLElement, name: string, value: ReadSignal<unknown>): Dispose {
  if (__SERVER__) {
    toggleClass(el, name, value());
    return noop;
  }

  return effect(() => toggleClass(el, name, value()));
}

/**
 * Observe the given value signal and update the style with the given name. Falsy values except
 * `''` and `0` will remove the style.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function $style(el: HTMLElement, name: StyleProp, value: ReadSignal<unknown>): Dispose {
  if (__SERVER__) {
    setStyle(el, name, value());
    return noop;
  }

  return effect(() => setStyle(el, name, value()));
}

/**
 * Adds an event listener for the given `type` and returns a function which can be invoked to
 * remove the event listener.
 *
 * 🔔 The listener is automatically removed if the current scope is disposed!
 */
export function $listen<
  Target extends EventTarget,
  Events = InferCustomElementEvents<Target>,
  Type extends keyof Events = keyof Events
>(
  target: Target,
  type: Type & string,
  handler: TargetedEventHandler<Target, Events[Type] extends Event ? Events[Type] : Event>,
  options?: AddEventListenerOptions | boolean
): Dispose {
  if (__SERVER__) return noop;
  target.addEventListener(type, handler as any, options);
  return onDispose(() => target.removeEventListener(type, handler as any, options));
}

/**
 * Sets or removes the given attribute `value`. Falsy values except `0` will remove the attribute.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function setAttribute(el: Element, name: string, value: unknown) {
  if (!value && value !== "" && value !== 0) {
    el.removeAttribute(name);
  } else {
    const attrValue = value === true ? "" : value + "";
    if (el.getAttribute(name) !== attrValue) {
      el.setAttribute(name, attrValue);
    }
  }
}

/**
 * Sets or removes the given style with the given `value`. Falsy values will remove it.
 *
 * This function supports CSS variables as props and appropriately updates them using
 * `style.setProperty` and `style.removeProperty`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function setStyle(el: HTMLElement, prop: StyleProp, value: unknown) {
  if (!value && value !== 0) {
    if ((prop as string)[0] === "-") {
      el.style.removeProperty(prop as string);
    } else {
      // @ts-expect-error
      el.style[prop] = "";
    }
  } else if ((prop as string)[0] === "-") {
    el.style.setProperty(prop as string, value + "");
  } else {
    // @ts-expect-error
    el.style[prop] = value + "";
  }
}

/**
 * Toggles the given class `name`. Falsy values will remove the class from the list.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/classList}
 * @see {@link https://developer.mozilla.org/en-US/docs/Glossary/Falsy}
 */
export function toggleClass(el: Element, name: string, value: unknown) {
  el.classList[value ? "add" : "remove"](name);
}
