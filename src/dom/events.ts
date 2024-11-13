import { onDispose } from "@maverick-js/signals";
import type { CustomElement } from "./create-custom-element";
import { createError } from "../utils/error";

export type IsCustomEventDetailRequired<Event> = Event extends CustomEvent<infer Detail>
  ? Detail extends void | undefined | never
    ? true
    : false
  : false;

export type InferCustomEventDetail<Event> = Event extends CustomEvent<infer Detail>
  ? Detail
  : never;

export type InferCustomEventInit<Event> = IsCustomEventDetailRequired<Event> extends true
  ? EventInit & { detail: InferCustomEventDetail<Event> }
  : EventInit;

export type EventRecord = Record<string, Event>;

export interface EventHandler<E = Event> {
  (this: never, event: E): void;
}

export type TargetedEventHandler<T extends EventTarget, E extends Event> = EventHandler<
  TargetedEvent<T, E>
>;

export type TargetedEvent<T extends EventTarget = EventTarget, E = Event> = Omit<
  E,
  "currentTarget"
> & {
  readonly currentTarget: T;
};

export type InferCustomElementEvents<Target> = Target extends CustomElement<any, infer Events>
  ? Events & HTMLElementEventMap
  : HTMLElementEventMap;

export interface CustomElementEventTarget<Events> {
  addEventListener<K extends keyof Events>(
    type: K,
    listener: (this: HTMLElement, ev: Events[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof Events>(
    type: K,
    listener: (this: HTMLElement, ev: Events[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
}

export class EventsController<
  Target extends EventTarget,
  Events = InferCustomElementEvents<Target>
> {
  #target: Target;
  #controller: AbortController;

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  constructor(target: Target) {
    this.#target = target;
    this.#controller = new AbortController();
    onDispose(this.abort.bind(this));
  }

  add<Type extends keyof Events>(
    type: Type,
    handler: TargetedEventHandler<Target, Events[Type] extends Event ? Events[Type] : Event>,
    options?: AddEventListenerOptions
  ) {
    if (this.signal.aborted) throw createError("aborted");

    this.#target.addEventListener(type as any, handler as any, {
      ...options,
      signal: options?.signal ? anySignal(this.signal, options.signal) : this.signal,
    });

    return this;
  }

  remove<Type extends keyof Events>(
    type: Type,
    handler: TargetedEventHandler<Target, Events[Type] extends Event ? Events[Type] : Event>
  ) {
    this.#target.removeEventListener(type as any, handler as any);
    return this;
  }

  abort(reason?: string) {
    this.#controller.abort(reason);
  }
}

/**
 * Returns an `AbortSignal` that will abort when any of the given signals are aborted.
 */
export function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController(),
    options = { signal: controller.signal };

  function onAbort(event: Event) {
    controller.abort((event.target as AbortSignal).reason);
  }

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }

    signal.addEventListener("abort", onAbort, options);
  }

  return controller.signal;
}
