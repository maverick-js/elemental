import type { JSX } from "../../jsx/jsx";

export interface FragmentProps {
  children: JSX.Element;
}

export function Fragment({ children }: FragmentProps) {
  return children;
}
