// Tiny DOM helpers. No framework: screens build elements once and update them in place.
export type Child = Node | string | number | null | undefined | false;
export type AttrValue = string | number | boolean | null | undefined | ((ev: Event) => void);
export type Attrs = Record<string, AttrValue>;

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(el: Element, attrs: Attrs | null): void {
  if (!attrs) return;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key.startsWith('aria-') || key.startsWith('data-')) {
      el.setAttribute(key, String(value)); // aria-*="false" is meaningful
    } else if (value === false) {
      continue;
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (typeof value !== 'function') {
      el.setAttribute(key, String(value));
    }
  }
}

function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

let counter = 0;
/** Unique id for aria-labelledby / aria-describedby wiring. */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Drop nulls so optional children can be passed to Node.append / replaceChildren. */
export function compact(nodes: (Node | null | undefined | false)[]): Node[] {
  return nodes.filter((n): n is Node => n !== null && n !== undefined && n !== false);
}
