import { isFunction } from "@maverick-js/signals";
import type { JSX } from "../../jsx/jsx";
import { createError } from "../../utils/error";
import { isNull } from "../../utils/is";
import { currentHostElement } from "../lifecycle";
import { $prop, $style, setStyle } from "../helpers";
import { setElementProps } from "../render/insert";
import { setServerElementProps, type CustomServerElement } from "../../server";
import type { CustomElement } from "../create-custom-element";

export interface HostProps extends Omit<JSX.IntrinsicElementAttributes<HTMLElement>, "ref"> {
  children?: JSX.Element;
}

export function Host({ innerHTML, style, children, ...props }: HostProps) {
  const host = currentHostElement;

  if (!host) {
    if (__DEV__) {
      throw createError(
        `No host element, \`<Host>\` must be used at the root of a custom element \`render\` function.`
      );
    } else {
      return null;
    }
  }

  if (__SERVER__) {
    setServerElementProps(host as CustomServerElement, props);
  } else {
    setElementProps(host as CustomElement, props);
  }

  if (style) {
    for (const prop of Object.keys(style)) {
      const value = (style as any)[prop];
      if (isFunction(value)) {
        $style(host, prop, value);
      } else {
        setStyle(host, prop, value);
      }
    }
  }

  if (!isNull(innerHTML)) {
    if (isFunction(innerHTML)) {
      $prop(host, "innerHTML", innerHTML);
    } else {
      host.innerHTML = innerHTML;
    }

    return;
  }

  return children;
}
