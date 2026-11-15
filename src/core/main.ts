// Entry point: builds the store, injects colour tokens, mounts the app.
//   ?seed=NN   fixes the mission's luck (handy for demos and tests; seed 16 fails a Light launch).
//   ?demo=1    opens Demo Mode: a ready-made design and seed that ends in Recovered (real simulate() results).
import '@/ui/styles.css';
import { LUNAR_RECON } from '@/content';
import { createSave } from '@/save/storage';
import { decodeShare, isShareHash } from '@/share/code';
import { mountLaunch } from '@/scenes/mount';
import { mountApp } from '@/ui/app';
import { tokensToCss } from '@/ui/tokens';
import { wirePersistence } from './persist';
import { createGameStore } from './store';

const style = document.createElement('style');
style.textContent = tokensToCss();
document.head.append(style);

const params = new URLSearchParams(window.location.search);
const fromUrl = params.get('seed');
const fixedSeed = fromUrl !== null && fromUrl.trim() !== '' && Number.isFinite(Number(fromUrl)) ? Number(fromUrl) : null;
const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;

const save = createSave(); // falls back to memory when the browser blocks storage
const store = createGameStore({ mission: LUNAR_RECON, newSeed: () => fixedSeed ?? randomSeed() });
const demo = params.get('demo') === '1';
if (demo) store.getState().startDemo();
wirePersistence(store, save);

// Share links: #v=1&seed=...  An opened link lands on the Design Bay; a bad one starts a normal game with a message.
// The hash is cleared afterwards so a refresh returns to the player's own progress instead of reopening the link.
function openShareLink(): void {
  const hash = window.location.hash;
  if (!isShareHash(hash)) return;
  const r = decodeShare(hash, LUNAR_RECON);
  if (r.ok) store.getState().loadShared(r.share, r.adjusted);
  else store.getState().setShareNotice(`That link could not be opened: ${r.reason} Starting a normal game instead.`);
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
if (!demo) openShareLink();
window.addEventListener('hashchange', () => { if (!store.getState().demo) openShareLink(); });

const root = document.getElementById('app');
if (root) mountApp(root, store, { mountLaunch, save, autoTutorial: !demo });
