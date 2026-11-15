// Phaser launch scene: a procedural, asset-free animation (rectangles, triangles, circles).
// Loaded lazily by src/scenes/mount.ts. It knows nothing about the game store or the simulation:
// it receives a LaunchPlan and reports captions and completion through LaunchCallbacks.
//
// Timeline (base time; scaled if plan.durationMs differs):
//   success 10 s:  0 countdown, 2 ignition, 3 liftoff, 5 max stress, 7 stage separation, 8.5 release
//   failure  9 s:  0 countdown, 2 ignition, 3 liftoff, 5.2 thrust loss, 6.2 flight ended safely, 7.6 aftermath
// No full-screen flashes; the only bright moment is one soft expanding ring at ~600 ms.
import Phaser from 'phaser';
import type { LaunchCallbacks, LaunchHandle, LaunchPlan } from './launch-contract';
import { beatIndexAt, LAUNCH_MS, launchBeats, type Beat } from './launch-plan';

const W = 960;
const H = 540;
const PAD_Y = 450;
const DAY = 0x5aa0e0;
const SPACE = 0x0b1020;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const easeIn = (t: number): number => t * t;
const mix = (c1: number, c2: number, t: number): number => {
  const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t));
  const g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t));
  const b = Math.round(lerp(c1 & 255, c2 & 255, t));
  return (r << 16) | (g << 8) | b;
};

interface Puff { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }
interface Shard { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number }

class LaunchScene extends Phaser.Scene {
  private readonly plan: LaunchPlan;
  private readonly cb: LaunchCallbacks;
  private readonly beats: Beat[];
  private readonly k: number;
  private g!: Phaser.GameObjects.Graphics;
  private t = 0;
  private startedAt = -1;
  private beatIdx = -1;
  private finished = false;
  private shook = false;
  private terminated = false;
  private terminatedAt = 0;
  private stars: { x: number; y: number; r: number }[] = [];
  private puffs: Puff[] = [];
  private shards: Shard[] = [];
  private rocketX = W / 2;
  private rocketY = PAD_Y;

  constructor(plan: LaunchPlan, cb: LaunchCallbacks, beats: Beat[]) {
    super('launch');
    this.plan = plan;
    this.cb = cb;
    this.beats = beats;
    this.k = plan.durationMs / (plan.outcome === 'success' ? LAUNCH_MS.success : LAUNCH_MS.failure);
  }

  create(): void {
    this.g = this.add.graphics();
    this.game.canvas?.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: Math.random() * W, y: Math.random() * (PAD_Y - 40), r: 0.8 + Math.random() * 1.4 });
    }
  }

  skip(): void {
    if (this.finished) return;
    this.finished = true;
    this.cb.onDone('skipped');
  }

  override update(_time: number, delta: number): void {
    if (this.finished) return;
    // Wall-clock timeline: the launch lasts its planned 8-12 s at ANY frame rate. Every visual below is a
    // pure function of elapsed time, so a slow frame just skips ahead instead of stretching the launch.
    // (A per-frame delta clock took ~16-20 s at 15 fps in testing, and would on a slow phone.)
    if (this.startedAt < 0) this.startedAt = performance.now();
    this.t = performance.now() - this.startedAt;
    const bt = this.t / this.k; // base time in ms

    const idx = beatIndexAt(this.beats, this.t);
    if (idx !== this.beatIdx) {
      this.beatIdx = idx;
      const caption = this.beats[idx]?.caption;
      if (caption) this.cb.onPhase(caption);
    }
    if (!this.shook && bt >= 2000 && !this.plan.reducedMotion) {
      this.shook = true;
      this.cameras.main.shake(900, 0.004);
    }

    this.drawFrame(bt, delta);

    if (this.t >= this.plan.durationMs) {
      this.finished = true;
      this.cb.onDone('finished');
    }
  }

  // --- drawing -------------------------------------------------------------------------------
  private altitude(bt: number): number {
    const failAt = this.plan.outcome === 'failure' ? 6200 : 9000;
    const t = clamp01((Math.min(bt, failAt) - 3000) / 6000);
    return easeIn(t);
  }

  private drawFrame(bt: number, delta: number): void {
    const g = this.g;
    g.clear();
    const alt = this.altitude(bt);

    // Sky and stars
    const sky = mix(DAY, SPACE, clamp01(alt * 1.7));
    g.fillStyle(sky, 1);
    g.fillRect(-30, -30, W + 60, H + 60); // oversized so camera shake never shows the page background
    const starAlpha = clamp01((alt - 0.3) / 0.4);
    if (starAlpha > 0) {
      g.fillStyle(0xffffff, starAlpha);
      for (const s of this.stars) g.fillCircle(s.x, s.y, s.r);
    }

    // Ground and pad scroll away
    const groundY = PAD_Y + alt * 1100;
    if (groundY < H) {
      g.fillStyle(0x2c3550, 1);
      g.fillRect(-30, groundY, W + 60, H - groundY + 30);
      g.fillStyle(0x4a5578, 1);
      g.fillRect(W / 2 - 70, groundY - 6, 140, 6);
      g.fillStyle(0x6b78a8, 1);
      g.fillRect(W / 2 + 40, groundY - 120, 8, 120); // launch tower
    }

    // Moon appears once the spacecraft is released
    if (this.plan.outcome === 'success' && bt > 7000) {
      const a = clamp01((bt - 7000) / 2000);
      g.fillStyle(0xcfd6ea, a);
      g.fillCircle(780, 120, 46);
      g.fillStyle(0xaab3cf, a);
      g.fillCircle(765, 108, 9);
      g.fillCircle(796, 132, 6);
      g.fillCircle(772, 138, 5);
    }

    // Rocket position: lifts off, then holds near upper-middle while the world scrolls
    const rise = easeOut(clamp01(alt * 2.2));
    this.rocketY = lerp(PAD_Y, 200, rise);
    const burning = bt >= 2000 && !this.terminated && (this.plan.outcome === 'failure' || bt < 7000);

    // Failure: thrust loss -> tilt -> flight ended safely
    let tilt = 0;
    if (this.plan.outcome === 'failure' && bt >= 5200) tilt = clamp01((bt - 5200) / 1000) * 0.5;
    if (this.plan.outcome === 'failure' && bt >= 6200 && !this.terminated) this.terminate();

    this.updatePuffs(bt, delta, burning);
    this.drawPuffs();

    if (!this.terminated) {
      if (this.plan.outcome === 'success' && bt >= 7000) this.drawSeparation(bt);
      else this.drawRocket(this.rocketX, this.rocketY, tilt, burning, bt);
    } else {
      this.drawDebris(bt, delta);
    }

    // Quiet fade at the end of a failure, so the outcome card arrives calmly
    if (this.plan.outcome === 'failure' && bt > 7600) {
      g.fillStyle(0x0b1020, clamp01((bt - 7600) / 1400) * 0.7);
      g.fillRect(0, 0, W, H);
    }
  }

  private drawRocket(x: number, y: number, tilt: number, burning: boolean, bt: number): void {
    const g = this.g;
    const rot = (px: number, py: number): [number, number] => {
      const c = Math.cos(tilt);
      const s = Math.sin(tilt);
      return [x + px * c - py * s, y + px * s + py * c];
    };
    const poly = (color: number, pts: [number, number][]): void => {
      g.fillStyle(color, 1);
      const p = pts.map(([px, py]) => rot(px, py));
      const [a, b, c, ...rest] = p;
      if (!a || !b || !c) return;
      g.fillTriangle(a[0], a[1], b[0], b[1], c[0], c[1]);
      for (const d of rest) g.fillTriangle(a[0], a[1], c[0], c[1], d[0], d[1]);
    };
    if (burning) {
      const flicker = this.plan.reducedMotion ? 0 : Math.sin(bt / 60) * 4;
      const weak = this.plan.outcome === 'failure' && bt >= 5200 ? 0.45 : 1;
      const len = (46 + flicker) * weak;
      poly(0xffb020, [[-9, 60], [9, 60], [0, 60 + len]]);
      poly(0xfff1b8, [[-4, 60], [4, 60], [0, 60 + len * 0.6]]);
    }
    poly(0xe8ecf8, [[-14, -50], [14, -50], [14, 60], [-14, 60]]); // body
    poly(0xff6b7a, [[-14, -50], [14, -50], [0, -84]]); // nose cone
    poly(0x4dd8ff, [[-7, -20], [7, -20], [7, -4], [-7, -4]]); // window
    poly(0xff6b7a, [[-14, 32], [-30, 66], [-14, 60]]); // fins
    poly(0xff6b7a, [[14, 32], [30, 66], [14, 60]]);
  }

  private drawSeparation(bt: number): void {
    const g = this.g;
    const t = (bt - 7000) / 1000; // seconds since separation
    // Spent stage falls away and tumbles
    const sy = this.rocketY + 20 + t * t * 140;
    if (sy < H + 80) {
      g.fillStyle(0xaab3cf, 1);
      g.fillRect(this.rocketX - 14, sy, 28, 70);
    }
    // Spacecraft drifts up and toward the Moon
    const px = this.rocketX + t * 70;
    const py = this.rocketY - 40 - t * 40;
    g.fillStyle(0xe8ecf8, 1);
    g.fillRect(px - 10, py - 8, 20, 16);
    g.fillStyle(0x4dd8ff, 1);
    g.fillRect(px - 36, py - 3, 22, 6);
    g.fillRect(px + 14, py - 3, 22, 6);
  }

  private terminate(): void {
    this.terminated = true;
    this.terminatedAt = this.t / this.k;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.shards.push({
        x: this.rocketX, y: this.rocketY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, size: 5 + Math.random() * 9,
      });
    }
    if (!this.plan.reducedMotion) this.cameras.main.shake(500, 0.006);
  }

  private drawDebris(bt: number, delta: number): void {
    const g = this.g;
    const dt = Math.min(delta, 50) / 1000;
    // One soft expanding ring (no flicker)
    const ringT = clamp01((bt - this.terminatedAt) / 600);
    if (ringT < 1) {
      g.lineStyle(4, 0xffb020, 0.6 * (1 - ringT));
      g.strokeCircle(this.rocketX, this.rocketY, 20 + ringT * 90);
    }
    g.fillStyle(0xe8ecf8, 0.9);
    for (const s of this.shards) {
      s.vy += 220 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      const c = Math.cos(s.rot) * s.size;
      const n = Math.sin(s.rot) * s.size;
      g.fillTriangle(s.x - c, s.y - n, s.x + c, s.y + n, s.x - n, s.y + c);
    }
  }

  private updatePuffs(bt: number, delta: number, burning: boolean): void {
    if (this.plan.reducedMotion) return;
    const dt = Math.min(delta, 50) / 1000;
    if (burning) {
      for (let i = 0; i < 2 && this.puffs.length < 90; i++) {
        this.puffs.push({
          x: this.rocketX + (Math.random() - 0.5) * 14, y: this.rocketY + 62,
          vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 80,
          age: 0, life: 0.9 + Math.random() * 0.5, size: 6 + Math.random() * 8,
        });
      }
    }
    for (const p of this.puffs) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    void bt;
  }

  private drawPuffs(): void {
    for (const p of this.puffs) {
      const a = 0.5 * (1 - p.age / p.life);
      this.g.fillStyle(0xe8ecf8, a);
      this.g.fillCircle(p.x, p.y, p.size * (1 + p.age));
    }
  }
}

export interface PhaserLaunchOptions {
  /** Test hook: boots the scene without a renderer. */
  headless?: boolean;
}

export function startPhaserLaunch(
  container: HTMLElement,
  plan: LaunchPlan,
  cb: LaunchCallbacks,
  opts: PhaserLaunchOptions = {},
): LaunchHandle {
  const scene = new LaunchScene(plan, cb, launchBeats(plan));
  const game = new Phaser.Game({
    type: opts.headless ? Phaser.HEADLESS : Phaser.AUTO,
    parent: container,
    width: W,
    height: H,
    backgroundColor: '#0B1020',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
  });
  return {
    skip: () => scene.skip(),
    destroy: () => game.destroy(true),
  };
}
