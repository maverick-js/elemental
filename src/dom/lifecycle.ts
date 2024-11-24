import type { CustomServerElement } from "../server";
import { createError } from "../utils/error";
import type { CustomElement } from "./create-custom-element";
import { CONNECT_CALLBACKS_SYMBOL, DISCONNECT_CALLBACKS_SYMBOL } from "./symbols";

export let currentHostElement: CustomElement | CustomServerElement | null = null;

export function setHostElement(element: CustomElement | CustomServerElement<any> | null) {
  currentHostElement = element;
}

export interface ConnectCallback {
  (this: CustomElement): void;
}

export interface DisconnectCallback {
  (this: CustomElement): void;
}

export function onConnect(callback: ConnectCallback) {
  if (__SERVER__) return;
  if (__DEV__) throwIfNoHostElement(onConnect.name);
  (currentHostElement as CustomElement)?.[CONNECT_CALLBACKS_SYMBOL].push(callback);
}

export function onDisconnect(callback: DisconnectCallback) {
  if (__SERVER__) return;
  if (__DEV__) throwIfNoHostElement(onDisconnect.name);
  (currentHostElement as CustomElement)?.[DISCONNECT_CALLBACKS_SYMBOL].push(callback);
}

export function throwIfNoHostElement(hook: string) {
  if (!__DEV__ || currentHostElement) return;
  throw createError(
    `No host element. The \`${hook}\` function can only be called inside a component's \`setup\` function.`
  );
}
