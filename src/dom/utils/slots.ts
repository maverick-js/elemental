/**
 * Returns elements assigned to the given slot in the shadow root. Filters out all nodes
 * which are not an element.
 *
 * @param el - The element containing the slot.
 * @param name - The name of the slot (optional).
 */
export function getSlottedChildren(el: HTMLElement, name?: string): Element[] {
  const selector = name ? `slot[name="${name}"]` : "slot:not([name])",
    slot = el.shadowRoot?.querySelector(selector) as HTMLSlotElement | null,
    childNodes = slot?.assignedNodes({ flatten: true }) ?? [];

  return childNodes.filter((node) => node.nodeType == 1) as Element[];
}
