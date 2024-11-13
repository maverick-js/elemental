import { ELEMENTAL } from "../core/symbols";

export const SETUP_SYMBOL = Symbol(`${ELEMENTAL}.setup`);

export const READY_CALLBACKS_SYMBOL = Symbol.for(`${ELEMENTAL}.callbacks.ready`);

export const CONNECT_CALLBACKS_SYMBOL = Symbol.for(`${ELEMENTAL}.callbacks.connect`);

export const DISCONNECT_CALLBACKS_SYMBOL = Symbol(`${ELEMENTAL}.callbacks.disconnect`);

export const ATTRIBUTES_SYMBOL = Symbol.for(`${ELEMENTAL}.attributes`);

export const DEFINED_SYMBOL = Symbol.for(`${ELEMENTAL}.defined`);
