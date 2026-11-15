// Guards for accessibility rules that live in CSS (a DOM test cannot measure layout).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles.css', 'utf8');
// Match a rule that STARTS a line, so "button, .btn { ... }" is not mistaken for the ".btn { ... }" rule.
const rule = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^${escaped} \\{`, 'm').exec(css);
  if (!m) throw new Error(`missing rule: ${selector}`);
  return css.slice(m.index, css.indexOf('}', m.index));
};

describe('touch targets are at least 44 px', () => {
  it('buttons', () => {
    expect(rule('.btn')).toMatch(/min-height:\s*44px/);
    expect(rule('.btn')).toMatch(/min-width:\s*44px/);
    expect(rule('.link-btn')).toMatch(/min-height:\s*44px/);
  });
  it('sliders and glossary terms', () => {
    expect(rule('input[type="range"]')).toMatch(/height:\s*44px/);
    expect(rule('.term')).toMatch(/min-height:\s*44px/);
    expect(rule('.term')).toMatch(/min-width:\s*44px/);
  });
  it('summary toggles and the footer motion switch (found by the real-browser audit)', () => {
    expect(rule('summary')).toMatch(/min-height:\s*44px/);
    expect(rule('.app-footer label')).toMatch(/min-height:\s*44px/);
  });
  it('choice cards', () => {
    expect(rule('.card')).toMatch(/min-height:\s*44px/);
  });
});

describe('focus and motion', () => {
  it('has a visible focus ring', () => {
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*3px solid var\(--accent\)/);
  });
  it('turns off animation for prefers-reduced-motion and the in-app switch', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.reduce-motion \*/);
  });
  it('draws threads in 300 ms with ease-out', () => {
    expect(rule('.thread-reveal')).toMatch(/300ms ease-out/);
  });
});

describe('two-column layout from tablet width', () => {
  it('switches at 720 px', () => {
    expect(css).toMatch(/@media \(min-width: 720px\)\s*\{\s*\.design-grid/);
  });
});

describe('affordances found in the screenshot review', () => {
  it('draws a disclosure arrow on <summary> (display:flex removes the native marker)', () => {
    expect(css).toMatch(/summary::after\s*\{/);
    expect(css).toMatch(/details\[open\] > summary::after\s*\{/);
  });
  it('keeps the glossary underline next to the text, not at the bottom of the 44 px target', () => {
    expect(rule('.term')).toMatch(/text-decoration:\s*underline dotted/);
    expect(rule('.term')).not.toMatch(/border-bottom/);
  });
});

describe('Phase 7 finding F4: the storm decision needs less scrolling on a phone', () => {
  it('the Choose buttons sit in one row that is sticky at the bottom on narrow screens only', () => {
    expect(css).toMatch(/\.choose-row \{ display: grid;/); // wide screens: a normal grid under the cards
    const mobile = /@media \(max-width: 719px\) \{\s*\.choose-row \{[^}]*position: sticky; bottom: 0;/.exec(css);
    expect(mobile, 'the sticky rule must be inside the narrow-screen media query').not.toBeNull();
    expect(rule('.choose-row')).not.toMatch(/position:\s*sticky/); // the base rule is NOT sticky
  });
  it('keeps 44 px touch targets on the Choose buttons', () => {
    expect(rule('.choose-row .btn')).toMatch(/min-height:\s*44px/);
  });
  it('the old per-card button row is gone (the buttons moved out of the cards)', () => {
    expect(css).not.toMatch(/\.response \.btn-row/);
  });
});

describe('Phase 6 finding F1: the unverified-placeholder badge stays visible on phones', () => {
  it('the compact-meter rule hides every tag EXCEPT the unverified-placeholder badge', () => {
    expect(css).toMatch(/\.status-col \.meter \.tag:not\(\[data-label="UNVERIFIED PLACEHOLDER"\]\)/);
    expect(css).not.toMatch(/\.status-col \.meter \.tags\s*[,{]/); // the old rule hid the whole tag row
  });
});
