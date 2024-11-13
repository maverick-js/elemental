import { createError } from "../utils/error";
import type { CustomElement } from "./create-custom-element";
import { CONNECT_CALLBACKS_SYMBOL, DISCONNECT_CALLBACKS_SYMBOL } from "./symbols";

export let currentHostElement: CustomElement | null = null;

export function setHostElement(element: CustomElement<any> | null) {
  currentHostElement = element;
}

export function onConnect(callback: () => unknown) {
  if (__SERVER__) return;
  if (__DEV__) throwIfNoHostElement(onConnect.name);
  currentHostElement?.[CONNECT_CALLBACKS_SYMBOL].push(callback);
}

export function onDisconnect(callback: () => unknown) {
  if (__SERVER__) return;
  if (__DEV__) throwIfNoHostElement(onDisconnect.name);
  currentHostElement?.[DISCONNECT_CALLBACKS_SYMBOL].push(callback);
}

export function throwIfNoHostElement(hook: string) {
  if (!__DEV__ || currentHostElement) return;
  throw createError(
    `No host element. The \`${hook}\` function can only be called inside a component's \`setup\` function.`
  );
}
