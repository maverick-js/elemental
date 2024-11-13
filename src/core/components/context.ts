import { createContext, provideContext } from "../context";
import type { JSX } from "../../jsx/jsx";

export interface ContextProvider<T> {
  (props: ContextProviderProps<T>): JSX.Element;
}

export interface ContextProviderProps<T> {
  value: T;
  children: JSX.Element;
}

export function createContextProvider<T>(): ContextProvider<T> {
  const context = createContext<T>();
  return function Provider({ value, children }) {
    provideContext(context, value);
    return children;
  };
}