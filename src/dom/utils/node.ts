/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node}
 */
export function isDOMNode(node: unknown): node is Node {
  return node instanceof Node;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template}
 */
export function isHTMLTemplateElement(node: any): node is HTMLTemplateElement {
  return node && node instanceof HTMLTemplateElement;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType}
 */
export function isElementNodeType(node: Node): node is Element {
  return node.nodeType === 1;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType}
 */
export function isTextNodeType(node: Node): node is Text {
  return node.nodeType === 3;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType}
 */
export function isCommentNodeType(node: Node): node is Comment {
  return node.nodeType === 8;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType}
 */
export function isFragmentNodeType(node: Node): node is DocumentFragment {
  return node.nodeType === 11;
}

/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Comment}
 */
export function createComment(data: string): Comment {
  return document.createComment(data);
}

export function createTextNode(text: unknown): Text {
  return document.createTextNode(text + "");
}
