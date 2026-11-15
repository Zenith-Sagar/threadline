// Display preferences, applied as attributes on <html> so CSS does the rest (see styles.css and tokens.ts):
//   data-theme="contrast"  high-contrast colours      data-text="large" | "larger"  bigger text
// The controls live in the app footer (app.ts); the values are saved through the SaveStore.
import type { Prefs, TextSize } from '@/save/storage';

export const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Large' },
  { id: 'larger', label: 'Larger' },
];

export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  if (prefs.contrast) root.setAttribute('data-theme', 'contrast');
  else root.removeAttribute('data-theme');
  if (prefs.textSize === 'normal') root.removeAttribute('data-text');
  else root.setAttribute('data-text', prefs.textSize);
}
