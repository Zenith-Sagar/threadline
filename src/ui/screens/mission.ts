// Mission Control: the flight itself, one orbit per tick (~0.5 s). The mission pauses when the solar
// storm arrives and the player chooses a response; everything before that orbit is identical whatever
// they choose (the sim guarantees it). Controls: Pause/Resume, Skip to the decision, Skip to the end.
// The whole phase takes about 7 s of ticking plus however long the player takes to decide.
import type { SimFrame } from '@/data/schemas/types';
import { RESPONSE_IDS, listResponses, responseLabel, storageMbOf } from '@/sim';
import { compact, h } from '../dom';
import { icon, type IconName } from '../icons';
import { r0 } from '../format';
import { tag } from '../labels';
import { view, type Status } from '../meter-model';
import { createMeterRow } from '../meter-row';
import { describeResponse, describeSharedRisk } from '../response-text';
import type { Ctx, Screen } from './types';

export const TICK_MS = 500;

type Phase = 'running' | 'deciding' | 'finished';

const FRAME_ICON: Record<SimFrame['status'], IconName> = { ok: 'ok', 'safe-mode': 'bad', 'storage-full': 'tight' };
const FRAME_TEXT: Record<SimFrame['status'], string> = { ok: 'OK', 'safe-mode': 'Safe mode', 'storage-full': 'Storage full' };

export function createMissionScreen(ctx: Ctx): Screen {
  const { store } = ctx;
  const s0 = store.getState();
  const { mission } = s0;
  const pauseOrbit = s0.pauseOrbit;
  const nameOf = (id: string): string => mission.instruments.find((i) => i.id === id)?.name ?? id;

  const frames = (): SimFrame[] => store.getState().result?.trace ?? [];
  let revealed = 0;
  let decided = false;
  let chosenLabel: string | null = null;
  let paused = false;
  let phase: Phase = 'running';

  const heading = h('h1', { tabindex: -1 }, 'Mission Control');
  const statusLine = h('p', { class: 'mission-status-line' });
  const timeline = h('ol', { class: 'orbit-timeline', 'aria-label': 'Orbits' });
  const choiceNote = h('p', { class: 'hint', hidden: true });

  const powerRow = createMeterRow(view('power', 'Battery', ['SIMPLIFIED PHYSICS'], { frac: 1, status: 'idle', statusText: 'Ready', text: 'Waiting for orbit 1' }));
  const dataRow = createMeterRow(view('data', 'Data storage', ['GAME MODEL'], { frac: 0, status: 'idle', statusText: 'Ready', text: 'Waiting for orbit 1' }));
  const sciRow = createMeterRow(view('science', 'Science so far', ['GAME MODEL'], { frac: 0, status: 'idle', statusText: 'Ready', text: 'Waiting for orbit 1' }));
  const instList = h('ul', { class: 'instrument-state', 'aria-label': 'Instruments' });

  // ---- Controls -------------------------------------------------------------------------------
  const pauseBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false' });
  const skipBtn = h('button', { type: 'button', class: 'btn' });
  const controls = h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Playback' }, pauseBtn, skipBtn);

  // ---- Decision and finish panels --------------------------------------------------------------
  const decisionSlot = h('div');
  const finishSlot = h('div');

  const el = h(
    'section',
    { class: 'screen screen--mission', 'data-phase': 'running', 'data-revealed': '0' },
    heading,
    statusLine,
    controls,
    decisionSlot,
    finishSlot,
    h(
      'div',
      { class: 'mission-grid' },
      h('div', null, h('h2', null, 'Orbits'), timeline, choiceNote),
      h('div', { class: 'mission-side' }, h('h2', null, 'Spacecraft'), h('div', { class: 'meters' }, powerRow.el, dataRow.el, sciRow.el), h('h3', null, 'Instruments'), instList),
    ),
  );

  // ---- Rendering -------------------------------------------------------------------------------
  const cell = (o: number, f: SimFrame | undefined): HTMLElement => {
    const isStormWarning = phase === 'deciding' && pauseOrbit === o;
    if (!f || o > revealed) {
      return h(
        'li',
        { class: `orbit-cell orbit-cell--future${isStormWarning ? ' orbit-cell--storm' : ''}`, 'data-orbit': String(o) },
        h('span', { class: 'orbit-num' }, `Orbit ${o}`),
        isStormWarning
          ? h('span', { class: 'cell-line' }, icon('storm', 16), 'Storm warning')
          : h('span', { class: 'cell-line' }, icon('idle', 16), 'Not flown yet'),
      );
    }
    const bad = f.status !== 'ok';
    return h(
      'li',
      { class: `orbit-cell${bad ? ' orbit-cell--bad' : ''}${f.stormActive ? ' orbit-cell--storm' : ''}`, 'data-orbit': String(o), 'data-status': f.status },
      h('span', { class: 'orbit-num' }, `Orbit ${o}`),
      h('span', { class: 'cell-line' }, icon(FRAME_ICON[f.status], 16), FRAME_TEXT[f.status]),
      f.stormActive ? h('span', { class: 'cell-line' }, icon('storm', 16), `Storm, array ${r0(f.arrayW)} W`) : null,
      f.damagedIds.length > 0 ? h('span', { class: 'cell-line' }, icon('bad', 16), `Damaged: ${f.damagedIds.map(nameOf).join(', ')}`) : null,
    );
  };

  const instrumentStates = (shown: SimFrame[]): HTMLElement[] => {
    const damaged = new Set(shown.flatMap((f) => f.damagedIds));
    const last = shown[shown.length - 1];
    return (store.getState().design.instruments).map((id) => {
      let icn: IconName = 'idle';
      let text = 'Ready';
      if (damaged.has(id)) { icn = 'bad'; text = 'Damaged by radiation'; }
      else if (last) {
        if (last.status === 'safe-mode') { icn = 'bad'; text = 'Off: safe mode'; }
        else if (last.status === 'storage-full') { icn = 'tight'; text = 'Paused: storage full'; }
        else if (last.activeIds.includes(id)) { icn = 'ok'; text = 'Running'; }
        else { icn = 'tight'; text = 'Off: you switched it off'; }
      }
      return h('li', null, icon(icn, 16), h('span', null, `${nameOf(id)}: `, h('strong', null, text)));
    });
  };

  const render = (): void => {
    const all = frames();
    const total = all.length;
    const shown = all.slice(0, revealed);
    const last = shown[shown.length - 1];
    const s = store.getState();
    el.dataset['phase'] = phase;
    el.dataset['revealed'] = String(revealed);

    statusLine.textContent =
      phase === 'finished' ? `Mission complete: ${total} orbits flown.`
      : phase === 'deciding' ? `Paused before orbit ${pauseOrbit}: a solar storm is arriving.`
      : revealed === 0 ? `About to start orbit 1 of ${total}.`
      : `Orbit ${revealed} of ${total}${paused ? ' (paused)' : ''}`;

    timeline.replaceChildren(...Array.from({ length: total }, (_, i) => cell(i + 1, all[i])));

    // Meters
    const usableWh = s.design.batteryWh * mission.bus.usableBatteryFrac;
    const capacity = storageMbOf(s.design, mission);
    if (last) {
      if (last.status === 'safe-mode') {
        powerRow.update(view('power', 'Battery', ['SIMPLIFIED PHYSICS'], { frac: 0, status: 'bad', statusText: 'Safe mode', text: `The battery ran out on orbit ${last.orbit}, so the instruments were off.` }));
      } else {
        const frac = usableWh > 0 ? last.batteryAfterEclipseWh / usableWh : 0;
        const status: Status = frac < 0.15 ? 'tight' : 'ok';
        powerRow.update(view('power', 'Battery', ['SIMPLIFIED PHYSICS'], {
          frac, status,
          text: `${r0(frac * 100)}% of the usable battery left after the eclipse on orbit ${last.orbit}.${last.stormActive ? ` The storm cut the array to ${r0(last.arrayW)} W.` : ''}`,
        }));
      }
      const sent = shown.reduce((sum, f) => sum + f.downlinkedMb, 0);
      const full = last.status === 'storage-full';
      const dfrac = capacity > 0 ? last.storageEndMb / capacity : 1;
      dataRow.update(view('data', 'Data storage', ['GAME MODEL'], {
        frac: full ? 1 : dfrac, status: full ? 'bad' : dfrac > 0.85 ? 'tight' : 'ok', statusText: full ? 'Storage full' : undefined,
        text: `${r0(last.storageEndMb)} of ${r0(capacity)} Mb stored. ${r0(sent)} Mb sent to Earth so far.`,
      }));
      const perOrbit = (ids: string[]): number => ids.reduce((sum, id) => sum + (mission.instruments.find((i) => i.id === id)?.science ?? 0), 0);
      const got = shown.reduce((sum, f) => sum + (f.status === 'ok' ? perOrbit(f.activeIds) : 0), 0);
      const potential = perOrbit(s.design.instruments) * total;
      sciRow.update(view('science', 'Science so far', ['GAME MODEL'], {
        frac: potential > 0 ? got / potential : 0, status: 'ok', statusText: 'Collecting', text: `${r0(got)} points collected so far.`,
      }));
    }
    instList.replaceChildren(...instrumentStates(shown));

    // Controls
    controls.hidden = phase !== 'running';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause', 16), paused ? 'Resume' : 'Pause');
    skipBtn.replaceChildren(icon('arrow', 16), decided || pauseOrbit === null ? 'Skip to the end' : 'Skip to the storm decision');

    choiceNote.hidden = chosenLabel === null;
    if (chosenLabel !== null) choiceNote.textContent = `Your storm response: ${chosenLabel}.`;
  };

  const stopAt = (): number => {
    const total = frames().length;
    return decided || pauseOrbit === null ? total : Math.min(total, Math.max(0, pauseOrbit - 1));
  };

  const showDecision = (): void => {
    const s = store.getState();
    const options = listResponses(s.design, mission, s.seed);
    const storm = mission.storm;
    const title = h('h2', { tabindex: -1 }, `Solar storm warning: orbit ${pauseOrbit}`);
    const intro = storm
      ? h(
          'p',
          null,
          `A solar storm reaches the Moon on orbit ${pauseOrbit} and lasts ${Math.floor(storm.durationOrbits)} orbits. Your solar array will make about ${r0(storm.arrayFactor * 100)}% of its usual power. Instruments that stay on can be damaged by radiation. `,
          tag('GAME MODEL'),
        )
      : h('p', null, 'A solar storm is arriving.');
    const list = h(
      'ul',
      { class: 'response-list' },
      ...options.map((o) => {
        const t = describeResponse(o);
        return h(
          'li',
          { class: 'response', id: `response-${o.id}`, 'data-response': o.id },
          h('h3', null, o.label),
          h('dl', null, h('dt', null, 'Costs'), h('dd', null, t.cost), h('dt', null, 'Risks'), h('dd', null, t.exposure), h('dt', null, 'Power'), h('dd', null, t.power)),
          h('div', { class: 'tags' }, tag('GAME MODEL'), tag('SIMPLIFIED PHYSICS')),
        );
      }),
    );
    // Phase 7, finding F4: the three Choose buttons live in ONE row, outside the cards. On a phone that row sticks to the
    // bottom of the screen while the decision is on screen, so the player can read the cards and choose without hunting
    // for a button. Each button points at its card (aria-describedby), so a screen reader still reads its cost and risk.
    const chooseRow = h(
      'div',
      { class: 'choose-row', role: 'group', 'aria-label': 'Choose your storm response' },
      ...options.map((o) =>
        h('button', {
          type: 'button', class: 'btn', 'data-choose': o.id, 'aria-describedby': `response-${o.id}`,
          onclick: () => decide(o.id as (typeof RESPONSE_IDS)[number], o.label),
        }, `Choose: ${o.label}`),
      ),
    );
    decisionSlot.replaceChildren(
      ...compact([
        h('section', { class: 'panel storm-panel', 'aria-labelledby': 'storm-title' }, title, intro, h('p', { class: 'storm-risk' }, describeSharedRisk(options), ' ', tag('GAME MODEL')), list, chooseRow, h('p', { class: 'hint' }, 'There is no recommended answer. Each choice trades science, power and radiation risk, and the best one depends on your design.')),
      ]),
    );
    title.id = 'storm-title';
    title.focus();
  };

  const showFinish = (): void => {
    const total = frames().length;
    const btn = h('button', { type: 'button', class: 'btn btn--primary', onclick: () => store.getState().finishMission() }, icon('rocket', 18), 'See the outcome');
    finishSlot.replaceChildren(
      h('section', { class: 'panel', 'aria-label': 'Mission complete' }, h('h2', null, 'Mission complete'), h('p', null, `All ${total} orbits are done. Next: what happened, and why.`), h('div', { class: 'btn-row' }, btn)),
    );
    btn.focus();
  };

  const announceFrame = (o: number): void => {
    const f = frames()[o - 1];
    if (!f) return;
    const bits: string[] = [];
    if (f.status === 'safe-mode') bits.push('safe mode, instruments off');
    if (f.status === 'storage-full') bits.push('storage full, instruments paused');
    if (f.damagedIds.length > 0) bits.push(`${f.damagedIds.map(nameOf).join(' and ')} damaged by radiation`);
    if (bits.length > 0) ctx.announce(`Orbit ${o}: ${bits.join('; ')}.`);
  };

  /** Decide what phase we are in after the revealed count changed. Returns true when the phase changed. */
  const settle = (): boolean => {
    const before = phase;
    if (revealed >= stopAt()) phase = !decided && pauseOrbit !== null ? 'deciding' : 'finished';
    else phase = 'running';
    return before !== phase;
  };

  const onPhaseChange = (): void => {
    if (phase === 'deciding') {
      showDecision();
      ctx.announce(`Solar storm warning on orbit ${pauseOrbit}. Choose a response.`);
    } else if (phase === 'finished') {
      decisionSlot.replaceChildren();
      showFinish();
      ctx.announce('Mission complete.');
    }
  };

  const decide = (id: (typeof RESPONSE_IDS)[number], label: string): void => {
    store.getState().chooseResponse(id);
    decided = true;
    chosenLabel = label || responseLabel(id);
    paused = false;
    decisionSlot.replaceChildren();
    phase = 'running';
    ctx.announce(`You chose: ${chosenLabel}. The mission continues.`);
    settle();
    render();
    // settle() changes `phase` through the closure, which the compiler cannot see.
    if ((phase as Phase) === 'finished') onPhaseChange();
    else pauseBtn.focus();
  };

  const tick = (): void => {
    if (paused || phase !== 'running') return;
    if (revealed < stopAt()) {
      revealed += 1;
      announceFrame(revealed);
    }
    const changed = settle();
    render();
    if (changed) onPhaseChange();
  };

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    ctx.announce(paused ? 'Paused.' : 'Resumed.');
    render();
  });
  skipBtn.addEventListener('click', () => {
    revealed = stopAt();
    const changed = settle();
    render();
    if (changed) onPhaseChange();
  });

  settle();
  render();
  if (phase !== 'running') onPhaseChange();
  const timer = setInterval(tick, TICK_MS);

  return { el, heading, destroy: () => clearInterval(timer) };
}
