// Design Bay: pick 3 of 6 instruments, one launcher, battery, array and fuel.
// Live meters on the right, Consequence Threads linking each choice to the meters it moves.
// The simulation is never run here; only the read-only preview is used.
import { RANGES, type GameState } from '@/core/store';
import type { Instrument, LaunchVehicle, ResponseId } from '@/data/schemas/types';
import {
  RESPONSE_IDS, diffDesigns, diffInterventions, listResponses, previewMission, responseLabel, storageMbOf, stormOrbit,
} from '@/sim';
import { compact, h, svg, uid } from '../dom';
import { icon } from '../icons';
import { money, r0 } from '../format';
import { tag } from '../labels';
import { computeMeters, detailRows, METER_ORDER, type MeterView } from '../meter-model';
import { createMeterRow, type MeterRow } from '../meter-row';
import { describeResponse } from '../response-text';
import { changedControl, movedMeters, type ControlId } from '../thread-map';
import { describeChange } from '../announce-model';
import { createThreadLayer } from '../threads';
import { CHANNELS, type Meter } from '../tokens';
import { term } from '../tooltip';
import type { Ctx, Screen } from './types';

interface SliderRow {
  el: HTMLElement;
  input: HTMLInputElement;
  output: HTMLOutputElement;
  sync(value: number): void;
}

function makeSlider(opts: {
  label: string; range: { min: number; max: number; step: number }; unit: string; note: string;
  onInput: (value: number) => void; spoken: (value: number) => string; extra?: HTMLElement;
}): SliderRow {
  const id = uid('slider');
  const noteId = `${id}-note`;
  const input = h('input', {
    type: 'range', id, min: opts.range.min, max: opts.range.max, step: opts.range.step,
    'aria-describedby': noteId,
  });
  const output = h('output', { for: id });
  input.addEventListener('input', () => opts.onInput(Number(input.value)));
  const el = h(
    'div',
    { class: 'slider-row' },
    h('div', { class: 'slider-head' }, h('label', { for: id }, opts.label), output),
    input,
    h('p', { class: 'slider-note', id: noteId }, opts.note),
    opts.extra,
  );
  return {
    el, input, output,
    sync(value) {
      if (input.value !== String(value)) input.value = String(value);
      output.textContent = `${r0(value)} ${opts.unit}`;
      input.setAttribute('aria-valuetext', opts.spoken(value));
    },
  };
}

const riskWord = (reliability: number): string => (reliability < 0.92 ? 'higher' : reliability < 0.96 ? 'medium' : 'lowest');

export function createDesignScreen(ctx: Ctx): Screen {
  const { store } = ctx;
  const mission = store.getState().mission;
  const wanted = mission.rules.instrumentCount;

  const heading = h('h1', { tabindex: -1 }, 'Design Bay');

  // ---- Rewind banner -----------------------------------------------------------------------------
  const rewindTitle = h('h2', null, icon('rewind', 20), 'Rewind: change a decision');
  const rewindBody = h('div');

  // Storm response picker: only while rewinding. Built once so the radios keep keyboard focus.
  const respLegend = h('legend', null, 'Storm response');
  const respEls = new Map<ResponseId, { input: HTMLInputElement; title: HTMLElement; desc: HTMLElement }>();
  const respList = h('div', { class: 'response-choices' });
  for (const id of RESPONSE_IDS) {
    const nameId = uid('resp');
    const input = h('input', { type: 'radio', name: 'storm-response', value: id, 'aria-labelledby': nameId });
    const title = h('span', { class: 'resp-title', id: nameId }, responseLabel(id));
    const desc = h('span', { class: 'resp-desc' });
    input.addEventListener('change', () => {
      if (input.checked) store.getState().setResponse(id);
    });
    respEls.set(id, { input, title, desc });
    respList.append(h('label', { class: 'response-choice', 'data-response': id }, input, h('span', null, title, desc)));
  }
  const respHint = h('p', { class: 'hint' });
  const responseSet = h('fieldset', { class: 'response-pick', hidden: true }, respLegend, respHint, respList);
  const rewindBox = h('section', { class: 'rewind', hidden: true, 'aria-label': 'Rewind' }, rewindTitle, rewindBody, responseSet);

  // ---- Instruments -------------------------------------------------------------------------------
  const instCount = h('span', null, `0 of ${wanted} chosen`);
  const instEls = new Map<string, { wrap: HTMLElement; input: HTMLInputElement }>();
  const instGrid = h('div', { class: 'choices-grid' });
  const makeInstrument = (inst: Instrument): void => {
    const nameId = uid('inst');
    const descId = `${nameId}-desc`;
    const input = h('input', { type: 'checkbox', 'aria-labelledby': nameId, 'aria-describedby': descId });
    const wrap = h(
      'div',
      { class: 'choice', 'data-instrument': inst.id },
      input,
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, h('span', { id: nameId }, inst.name), h('span', { class: 'state' }, icon('check', 14), 'Selected')),
        h(
          'div',
          { id: descId },
          h(
            'dl',
            null,
            h('dt', null, 'Benefit'), h('dd', null, `+${r0(inst.science)} science per orbit`),
            h('dt', null, 'Cost'), h('dd', null, `${r0(inst.powerW)} W of power`),
          ),
          h('p', { class: 'why' }, inst.why),
          h('p', { class: 'extra' }, `${r0(inst.massKg)} kg, ${money(inst.costM)}, ${r0(inst.dataMbPerOrbit)} Mb of data per orbit`),
        ),
        tag('GAME MODEL'),
      ),
    );
    input.addEventListener('change', () => {
      const ok = store.getState().toggleInstrument(inst.id);
      if (!ok) {
        input.checked = false;
        ctx.announce(`You already have ${wanted} instruments. Remove one first.`);
      }
    });
    instEls.set(inst.id, { wrap, input });
    instGrid.append(wrap);
  };
  mission.instruments.forEach(makeInstrument);
  const instSet = h(
    'fieldset',
    null,
    h('legend', null, `Instruments: pick ${wanted} of ${mission.instruments.length} (`, instCount, ')'),
    h('p', { class: 'hint' }, 'Each instrument collects science, but uses power, weight and money.'),
    instGrid,
  );
  instSet.setAttribute('data-coach', 'instruments');

  // ---- Launcher ----------------------------------------------------------------------------------
  const vehEls = new Map<string, { wrap: HTMLElement; input: HTMLInputElement }>();
  const vehGrid = h('div', { class: 'choices-grid' });
  const makeVehicle = (v: LaunchVehicle): void => {
    const nameId = uid('veh');
    const descId = `${nameId}-desc`;
    const input = h('input', { type: 'radio', name: 'launcher', value: v.id, 'aria-labelledby': nameId, 'aria-describedby': descId });
    const wrap = h(
      'div',
      { class: 'choice', 'data-vehicle': v.id },
      input,
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-title' }, h('span', { id: nameId }, v.name), h('span', { class: 'state' }, icon('check', 14), 'Selected')),
        h(
          'div',
          { id: descId },
          h(
            'dl',
            null,
            h('dt', null, 'Benefit'), h('dd', null, `Lifts up to ${r0(v.capacityKg)} kg`),
            h('dt', null, 'Cost'), h('dd', null, money(v.costM)),
            h('dt', null, 'Launch risk'), h('dd', null, riskWord(v.reliability)),
          ),
          h('p', { class: 'why' }, v.why),
          h('p', { class: 'extra' }, `Succeeds about ${r0(v.reliability * 100)} in 100 launches`),
        ),
        tag('GAME MODEL'),
      ),
    );
    input.addEventListener('change', () => {
      if (input.checked) store.getState().setVehicle(v.id);
    });
    vehEls.set(v.id, { wrap, input });
    vehGrid.append(wrap);
  };
  mission.vehicles.forEach(makeVehicle);
  const vehSet = h(
    'fieldset',
    null,
    h('legend', null, 'Launcher'),
    h('p', { class: 'hint' }, 'The ', term('launcher', 'launcher'), ' must be able to lift your spacecraft, fuel included.'),
    vehGrid,
  );

  // ---- Power and fuel ----------------------------------------------------------------------------
  const battery = makeSlider({
    label: 'Battery', range: RANGES.batteryWh, unit: 'Wh',
    note: 'A bigger battery gets through eclipses. It adds weight and cost.',
    onInput: (v) => store.getState().setBattery(v), spoken: (v) => `${r0(v)} watt-hours`,
  });
  const array = makeSlider({
    label: 'Solar array', range: RANGES.arrayW, unit: 'W',
    note: 'A bigger array refills the battery faster in sunlight. It adds weight and cost.',
    onInput: (v) => store.getState().setArray(v), spoken: (v) => `${r0(v)} watts`,
  });
  const autoBtn = h(
    'button',
    {
      type: 'button', class: 'btn',
      onclick: () => {
        store.getState().autoSizeFuel();
        ctx.announce(`Fuel set to ${store.getState().design.propellantKg} kilograms.`);
      },
    },
    icon('fuel', 18),
    'Auto-size fuel',
  );
  autoBtn.setAttribute('data-coach', 'auto-fuel');
  const fuel = makeSlider({
    label: 'Fuel', range: RANGES.propellantKg, unit: 'kg',
    note: 'More fuel gives more margin, but fuel is weight the launcher must lift.',
    onInput: (v) => store.getState().setPropellant(v), spoken: (v) => `${r0(v)} kilograms`,
    extra: h('div', { class: 'btn-row' }, autoBtn, tag('UNVERIFIED PLACEHOLDER')),
  });
  battery.el.setAttribute('data-coach', 'battery');
  const powerSet = h('fieldset', null, h('legend', null, 'Power and fuel'), battery.el, array.el, fuel.el);
  const storage = makeSlider({
    label: 'Data storage', range: RANGES.storageMb, unit: 'Mb',
    note: `Instruments keep their data on board until the link sends it home (${r0(mission.bus.downlinkMbPerOrbit)} Mb per orbit). If storage fills, the instruments pause. More storage adds weight and cost.`,
    onInput: (v) => store.getState().setStorage(v), spoken: (v) => `${r0(v)} megabits`,
    extra: h('div', { class: 'btn-row' }, tag('GAME MODEL')),
  });
  const dataSet = h('fieldset', null, h('legend', null, 'Data'), storage.el);

  // ---- Meters, validity, detail ------------------------------------------------------------------
  const rows = new Map<Meter, MeterRow>();
  const meterList = h('div', { class: 'meters', role: 'group', 'aria-label': 'Live results' });
  const initial = computeMeters(previewMission(store.getState().design, mission), mission);
  for (const v of initial) {
    const row = createMeterRow(v);
    rows.set(v.id, row);
    meterList.append(row.el);
  }
  const legend = h(
    'ul',
    { class: 'thread-legend', 'aria-label': 'What the thread patterns mean' },
    ...METER_ORDER.map((m) =>
      h(
        'li',
        null,
        icon(m, 16),
        svg(
          'svg',
          { class: 'swatch', viewBox: '0 0 44 8', 'aria-hidden': 'true' },
          svg('line', { x1: 2, y1: 4, x2: 42, y2: 4, stroke: CHANNELS[m].color, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': CHANNELS[m].dash || null }),
        ),
        CHANNELS[m].label,
      ),
    ),
  );

  const validityTitle = h('h2', { tabindex: -1 });
  const validityBody = h('div');
  const validity = h('section', { class: 'panel validity', 'aria-label': 'Launch check' }, validityTitle, validityBody);

  const launchBtn = h('button', { type: 'button', class: 'btn btn--primary', onclick: () => void store.getState().launch() });
  launchBtn.setAttribute('data-coach', 'launch');
  const detailBtn = h('button', { type: 'button', class: 'btn drawer-toggle', 'aria-expanded': 'false' });
  const detailPanel = h('div', { class: 'drawer panel', id: uid('drawer'), hidden: true });
  detailBtn.setAttribute('aria-controls', detailPanel.id);
  let detailOpen = false;
  const setDetail = (open: boolean): void => {
    detailOpen = open;
    detailBtn.setAttribute('aria-expanded', String(open));
    detailBtn.replaceChildren(h('span', null, 'Engineering detail'), icon(open ? 'up' : 'down', 16));
    detailPanel.hidden = !open;
    grid.dataset['detail'] = open ? 'on' : 'off';
  };
  detailBtn.addEventListener('click', () => {
    setDetail(!detailOpen);
    render(store.getState());
  });

  const statusCol = h(
    'aside',
    { class: 'status-col', 'aria-label': 'Results' },
    h('div', { class: 'panel' }, h('h2', null, 'Live results'), meterList, legend),
    validity,
    h('div', { class: 'btn-row' }, launchBtn),
    detailBtn,
    detailPanel,
  );
  const grid = h('div', { class: 'design-grid', 'data-detail': 'off' }, h('div', { class: 'choices-col' }, instSet, vehSet, powerSet, dataSet), statusCol);
  setDetail(false);

  const el = h(
    'section',
    { class: 'screen screen--design' },
    heading,
    h('p', null, 'Change anything. The results update as you go, and threads show which results each choice moved.'),
    rewindBox,
    grid,
  );

  // ---- Consequence Threads -----------------------------------------------------------------------
  const layer = createThreadLayer(el, { reducedMotion: ctx.reducedMotion });
  let prevDesign = store.getState().design;
  let prevMeters: MeterView[] = initial;
  let burstBase: MeterView[] | null = null;
  let burstCtrl: ControlId | null = null;
  let burstTimer: ReturnType<typeof setTimeout> | undefined;
  let latestMeters: MeterView[] = initial;
  let burstPrev: ReturnType<typeof previewMission> | null = null;

  /** Name used in the spoken sentence for a thread ("Radar sounder: adds 38 W of load to Power, ..."). */
  const controlLabel = (c: ControlId): string => {
    switch (c.kind) {
      case 'instrument': return mission.instruments.find((i) => i.id === c.id)?.name ?? 'Instrument';
      case 'vehicle': return mission.vehicles.find((v) => v.id === store.getState().design.vehicle)?.name ?? 'Launcher';
      case 'battery': return 'Battery';
      case 'array': return 'Solar array';
      case 'storage': return 'Data storage';
      case 'fuel': return 'Fuel';
    }
  };

  const sourceEl = (c: ControlId): Element => {
    switch (c.kind) {
      case 'instrument': return instEls.get(c.id)?.wrap ?? el;
      case 'vehicle': return vehEls.get(store.getState().design.vehicle)?.wrap ?? el;
      case 'battery': return battery.el;
      case 'array': return array.el;
      case 'storage': return storage.el;
      case 'fuel': return fuel.el;
    }
  };
  const fire = (): void => {
    burstTimer = undefined;
    if (!burstBase || !burstCtrl) return;
    const moved = movedMeters(burstBase, latestMeters);
    burstBase = null;
    const before = burstPrev;
    burstPrev = null;
    if (moved.length === 0) return;
    const names = moved.map((m) => rows.get(m.meter)?.el.querySelector('.meter-name')?.textContent ?? m.meter);
    // Every thread is also spoken: one debounced sentence per change (the 180 ms burst below), never one per tick.
    ctx.announce(before ? describeChange(controlLabel(burstCtrl), before, previewMission(store.getState().design, mission)) : `Updated: ${names.join(', ')}.`);
    layer.show(
      sourceEl(burstCtrl),
      moved.flatMap((m) => {
        const row = rows.get(m.meter);
        return row ? [{ meter: m.meter, el: row.el, direction: m.direction }] : [];
      }),
    );
    store.getState().noteThread(burstCtrl.kind); // the guided first run watches this counter (also fires with reduced motion)
  };

  // ---- Rendering ---------------------------------------------------------------------------------
  let lastValid: boolean | null = null;
  let lastBlocked = store.getState().blockedLaunches;

  /** The storm response picker: costs and risks from the model, no recommendation. */
  const renderResponses = (s: GameState): void => {
    const storm = s.mission.storm ? stormOrbit(s.seed, s.mission) : null;
    responseSet.hidden = storm === null;
    if (storm === null) return;
    respLegend.textContent = `Storm response (the storm reaches the Moon on orbit ${storm})`;
    respHint.textContent = 'You can also change what you did during the storm. The storm and the dice rolls stay exactly the same.';
    const options = listResponses(s.design, s.mission, s.seed);
    const current = s.interventions.find((i) => i.orbit === storm)?.response ?? 'ride-out';
    const last = s.baseline?.interventions.find((i) => i.orbit === storm)?.response ?? 'ride-out';
    for (const [id, e] of respEls) {
      const opt = options.find((o) => o.id === id);
      e.input.checked = id === current;
      e.title.textContent = `${opt ? opt.label : responseLabel(id)}${id === last ? ' (your last choice)' : ''}`;
      if (opt) {
        const t = describeResponse(opt);
        e.desc.textContent = ` ${t.cost} ${t.risk} ${t.power}`;
      } else {
        e.desc.textContent = ' Fix the design to see the costs and risks.';
      }
    }
  };

  const renderRewind = (s: GameState): void => {
    if (!s.baseline) { rewindBox.hidden = true; return; }
    rewindBox.hidden = false;
    const base = s.baseline.result;
    const changes = [
      ...diffDesigns(s.baseline.design, s.design, s.mission),
      ...diffInterventions(s.baseline.interventions, s.interventions, s.design, s.mission),
    ];
    renderResponses(s);
    rewindBody.replaceChildren(
      ...compact([
      h(
        'p',
        null,
        `Last flight: ${base.tier ?? 'no result'}, ${base.scores['scienceYield']?.value ?? 0}% of the science collected. The `,
        term('seed', 'seed'),
        ` is the same (${s.seed}), so the luck is the same. Only your choices change.`,
      ),
      s.rewindFocus ? h('p', null, icon('arrow', 14), ' Start with the decision outlined in orange.') : null,
      changes.length === 0
        ? h('p', { class: 'hint' }, "You haven't changed anything yet.")
        : h('ul', { 'aria-label': 'Changes so far' }, ...changes.map((c) => h('li', null, `${c.label}: ${c.from} to ${c.to}`))),
      changes.length > 1 ? h('p', { class: 'hint' }, 'You changed more than one decision, so the comparison will mix causes. Changing one at a time is clearer.') : null,
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', onclick: () => s.cancelRewind() }, 'Cancel rewind')),
      ]),
    );
  };

  const focusClass = (s: GameState): void => {
    for (const { wrap } of [...instEls.values(), ...vehEls.values()]) wrap.classList.remove('focus-decision');
    for (const row of [battery, array, fuel, storage]) row.el.classList.remove('focus-decision');
    responseSet.classList.remove('focus-decision');
    const k = s.rewindFocus;
    if (!k || !s.baseline) return;
    if (k.startsWith('instrument:')) instEls.get(k.slice('instrument:'.length))?.wrap.classList.add('focus-decision');
    else if (k === 'vehicle') vehEls.get(s.design.vehicle)?.wrap.classList.add('focus-decision');
    else if (k === 'battery') battery.el.classList.add('focus-decision');
    else if (k === 'array') array.el.classList.add('focus-decision');
    else if (k === 'fuel') fuel.el.classList.add('focus-decision');
    else if (k === 'storage') storage.el.classList.add('focus-decision');
    else if (k === 'response') responseSet.classList.add('focus-decision');
  };

  function render(s: GameState): void {
    const preview = previewMission(s.design, s.mission);
    const views = computeMeters(preview, s.mission);
    latestMeters = views;
    for (const v of views) rows.get(v.id)?.update(v);

    const full = s.design.instruments.length >= wanted;
    for (const [id, { wrap, input }] of instEls) {
      const on = s.design.instruments.includes(id);
      input.checked = on;
      const blocked = full && !on;
      wrap.classList.toggle('choice--full', blocked);
      input.setAttribute('aria-disabled', String(blocked));
    }
    instCount.textContent = `${s.design.instruments.length} of ${wanted} chosen`;
    for (const [id, { input }] of vehEls) input.checked = s.design.vehicle === id;
    battery.sync(s.design.batteryWh);
    array.sync(s.design.arrayW);
    fuel.sync(s.design.propellantKg);
    storage.sync(storageMbOf(s.design, s.mission));

    // Launch check (never a modal)
    const v = preview.validity;
    validity.classList.toggle('validity--ok', v.ok);
    validity.classList.toggle('validity--bad', !v.ok);
    validityTitle.replaceChildren(icon(v.ok ? 'ok' : 'bad', 20), v.ok ? 'Ready to launch' : 'Cannot launch because:');
    validityBody.replaceChildren(
      ...compact(
        v.ok
          ? [
              h('p', null, 'Every check passes. Press Launch when you are ready.'),
              preview.brownoutOrbits.length > 0
                ? h('p', { class: 'hint' }, `Heads up: the forecast shows safe mode on orbit ${preview.brownoutOrbits[0]}, which will cost some science. You can still launch.`)
                : null,
            ]
          : [
              h('ul', null, ...v.reasons.map((x) => h('li', null, x))),
              v.fixes.length > 0 ? h('p', null, h('strong', null, 'How to fix it:')) : null,
              v.fixes.length > 0 ? h('ul', null, ...v.fixes.map((x) => h('li', null, x))) : null,
            ],
      ),
    );
    if (lastValid !== null && lastValid !== v.ok) {
      ctx.announce(v.ok ? 'Ready to launch.' : `Cannot launch: ${v.reasons.length} problem${v.reasons.length === 1 ? '' : 's'}.`);
    }
    lastValid = v.ok;
    launchBtn.setAttribute('aria-disabled', String(!v.ok));
    launchBtn.replaceChildren(icon(s.baseline ? 'rewind' : 'rocket', 18), s.baseline ? 'Run the mission again' : 'Launch');
    if (!v.ok) launchBtn.setAttribute('aria-describedby', validityTitle.id || (validityTitle.id = uid('validity')));
    else launchBtn.removeAttribute('aria-describedby');

    if (s.blockedLaunches !== lastBlocked) {
      lastBlocked = s.blockedLaunches;
      validityTitle.focus();
    }

    renderRewind(s);
    focusClass(s);

    if (detailOpen) {
      const rowsData = detailRows(preview, s.design, s.mission);
      detailPanel.replaceChildren(
        h(
          'dl',
          null,
          ...rowsData.flatMap((row) => [
            h('dt', null, row.term ? term(row.label, row.term) : row.label, ...row.labels.map(tag)),
            h('dd', null, row.value),
          ]),
        ),
      );
    }

    // Threads: coalesce bursts (slider drags) into one set of threads 180 ms after the last change.
    const ctrl = changedControl(prevDesign, s.design);
    if (ctrl) {
      if (!burstBase) {
        burstBase = prevMeters;
        burstPrev = previewMission(prevDesign, mission);
      }
      burstCtrl = ctrl;
      if (burstTimer) clearTimeout(burstTimer);
      burstTimer = setTimeout(fire, 180);
    }
    prevDesign = s.design;
    prevMeters = views;
  }

  render(store.getState());
  const unsubscribe = store.subscribe((s) => render(s));
  return {
    el, heading,
    destroy: () => {
      unsubscribe();
      if (burstTimer) clearTimeout(burstTimer);
      layer.destroy();
    },
  };
}
