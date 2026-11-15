// Consequence Threads: when the player changes a choice, threads link that choice to every
// meter it moved.
//
//   Encoding   icon (badge at the meter end) + line pattern + colour, never colour alone
//   Timing     each thread draws in 300 ms (ease-out, 60 ms stagger), holds 1.4 s, fades 300 ms
//   Reduced    prefers-reduced-motion: no lines or animation; the source and moved meters get an
//              instant highlight outline instead (also applied in normal mode)
import { svg, uid } from './dom';
import { iconPaths } from './icons';
import { CHANNELS, COLORS, type Meter } from './tokens';

export const THREAD_TIMING = { drawMs: 300, staggerMs: 60, holdMs: 1400, fadeMs: 300, highlightMs: 1600 } as const;

export interface ThreadTarget {
  meter: Meter;
  el: Element;
  /** Did the value go up or down? */
  direction: 'up' | 'down';
}

export interface ThreadLayer {
  show(source: Element, targets: ThreadTarget[]): void;
  clear(): void;
  destroy(): void;
}

interface Pt {
  x: number;
  y: number;
}

/** Cubic Bezier from the source to a target; horizontal when side by side, vertical when stacked. */
export function threadPath(
  src: DOMRect,
  dst: DOMRect,
  index: number,
  count = 1,
): { d: string; end: Pt; badge: Pt } {
  const sideBySide = dst.left >= src.right - 8;
  if (sideBySide) {
    // Fan the start points along the source's edge so several threads do not stack on one point.
    const t = count > 1 ? index / (count - 1) : 0.5;
    const a: Pt = { x: src.right, y: src.top + src.height * (0.2 + 0.6 * t) };
    const b: Pt = { x: dst.left, y: dst.top + dst.height / 2 };
    const dx = Math.max(40, (b.x - a.x) / 2);
    return {
      d: `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`,
      end: b, badge: { x: b.x - 16, y: b.y },
    };
  }
  const below = dst.top >= src.bottom - 8;
  const a: Pt = { x: Math.min(src.right - 8, src.left + 28 + index * 14), y: below ? src.bottom : src.top };
  const b: Pt = { x: Math.min(dst.right - 8, dst.left + 28 + index * 14), y: below ? dst.top : dst.bottom };
  const dy = Math.max(30, Math.abs(b.y - a.y) / 2) * (below ? 1 : -1);
  return {
    d: `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`,
    end: b, badge: { x: b.x, y: b.y + (below ? -16 : 16) },
  };
}

export function createThreadLayer(host: HTMLElement, opts: { reducedMotion: () => boolean }): ThreadLayer {
  const overlay = svg('svg', { class: 'threads', 'aria-hidden': 'true', focusable: 'false' });
  host.append(overlay);
  let timers: ReturnType<typeof setTimeout>[] = [];
  const highlighted = new Set<Element>();

  const later = (fn: () => void, ms: number): void => {
    timers.push(setTimeout(fn, ms));
  };

  const clearThreads = (): void => {
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
  };

  const unhighlightAll = (): void => {
    for (const el of highlighted) el.classList.remove('meter--changed', 'source--active');
    highlighted.clear();
  };

  const clear = (): void => {
    for (const t of timers) clearTimeout(t);
    timers = [];
    clearThreads();
    unhighlightAll();
  };

  const mark = (el: Element, cls: string): void => {
    el.classList.add(cls);
    highlighted.add(el);
  };

  const badge = (meter: Meter, at: Pt, direction: 'up' | 'down', delayMs: number): SVGGElement => {
    const color = CHANNELS[meter].color;
    const g = svg('g', { class: 'thread-badge', transform: `translate(${at.x} ${at.y})`, style: `animation-delay:${delayMs}ms` });
    g.append(svg('circle', { r: 13, fill: COLORS.surface, stroke: color, 'stroke-width': 2 }));
    const iconG = svg('g', {
      transform: 'translate(-6 -6) scale(0.75)', fill: 'none', stroke: color,
      'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    for (const d of iconPaths(meter)) iconG.append(svg('path', { d }));
    g.append(iconG);
    // Direction triangle: up = more, down = less.
    g.append(
      svg('path', {
        d: 'M0 -4 L4.5 3 L-4.5 3 Z', fill: color,
        transform: `translate(19 0)${direction === 'down' ? ' rotate(180)' : ''}`,
      }),
    );
    return g;
  };

  const show = (source: Element, targets: ThreadTarget[]): void => {
    clear();
    if (targets.length === 0) return;

    // Instant highlight: always applied, and the only feedback when reduced motion is on.
    mark(source, 'source--active');
    for (const t of targets) mark(t.el, 'meter--changed');
    later(unhighlightAll, THREAD_TIMING.highlightMs);
    if (opts.reducedMotion()) return;

    const srcRect = source.getBoundingClientRect();
    const W = window.innerWidth;
    const H = window.innerHeight;
    overlay.setAttribute('viewBox', `0 0 ${W} ${H}`);
    targets.forEach((t, i) => {
      const ch = CHANNELS[t.meter];
      const geo = threadPath(srcRect, t.el.getBoundingClientRect(), i, targets.length);
      const maskId = uid('thread-mask');
      const delay = i * THREAD_TIMING.staggerMs;
      const fadeAt = delay + THREAD_TIMING.drawMs + THREAD_TIMING.holdMs;

      // The visible line is dashed (the channel pattern); a solid mask path reveals it in 300 ms.
      const mask = svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H });
      mask.append(
        svg('path', {
          d: geo.d, pathLength: 1, class: 'thread-reveal', fill: 'none', stroke: '#fff', 'stroke-width': 8,
          style: `animation-delay:${delay}ms; animation-duration:${THREAD_TIMING.drawMs}ms`,
        }),
      );
      const line = svg('path', {
        d: geo.d, class: 'thread-line', fill: 'none', stroke: ch.color, 'stroke-width': 3,
        'stroke-linecap': 'round', mask: `url(#${maskId})`,
        'stroke-dasharray': ch.dash || null,
      });
      const g = svg('g', {
        class: 'thread', 'data-channel': t.meter, 'data-direction': t.direction,
        style: `animation-delay:${fadeAt}ms; animation-duration:${THREAD_TIMING.fadeMs}ms`,
      });
      g.append(mask, line, badge(t.meter, geo.badge, t.direction, delay + THREAD_TIMING.drawMs));
      overlay.append(g);
    });
    later(clearThreads, THREAD_TIMING.staggerMs * targets.length + THREAD_TIMING.drawMs + THREAD_TIMING.holdMs + THREAD_TIMING.fadeMs + 50);
  };

  // Threads are positioned at change time; scrolling would misalign them, so drop them.
  const onScroll = (): void => clearThreads();
  window.addEventListener('scroll', onScroll, { passive: true });

  return {
    show,
    clear,
    destroy: () => {
      clear();
      window.removeEventListener('scroll', onScroll);
      overlay.remove();
    },
  };
}

/** Exported for the DOM-less tests that only need the class used for the hint. */
export const CHANGED_CLASS = 'meter--changed';
