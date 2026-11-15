// Guided first run: a pure state machine. No DOM, no store: it only turns observations of the game
// (which screen, how many instruments, how many threads were drawn...) into "which step is showing".
//
// Five steps, each ONE sentence and ONE action, learn-by-doing:
//   1 pick instruments   2 watch a thread draw   3 auto-size fuel   4 launch   5 read one cause chain
// The panel is dismissable at every step. Finishing OR dismissing it persists "seen" so it never nags again.
// It can be re-opened any time from the "How to play" button (event: start).
export type TutorialScreen = 'title' | 'brief' | 'design' | 'launch' | 'mission' | 'outcome' | 'diff';

export interface TutorialStep {
  id: 'instruments' | 'thread' | 'fuel' | 'launch' | 'chain';
  /** One sentence. */
  text: string;
  /** The single action, as a short label. */
  action: string;
  /** Screen the panel is shown on. */
  screen: TutorialScreen;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'instruments', text: 'Tick three instrument cards to put them on your spacecraft.', action: 'Tick three instruments', screen: 'design' },
  { id: 'thread', text: 'Move the Battery slider a little and watch a thread draw to the meters it changes.', action: 'Move the Battery slider', screen: 'design' },
  { id: 'fuel', text: 'Press Auto-size fuel so your spacecraft carries enough propellant.', action: 'Press Auto-size fuel', screen: 'design' },
  { id: 'launch', text: 'Press Launch when the launch check says you are ready.', action: 'Press Launch', screen: 'design' },
  { id: 'chain', text: 'Read the first cause chain: it traces what happened back to one of your choices.', action: 'Press Got it', screen: 'outcome' },
];

export interface Observation {
  screen: TutorialScreen;
  instrumentCount: number;
  /** Counter: how many times the thread layer has drawn (or highlighted, with reduced motion). */
  threadsDrawn: number;
  /** Which control caused the most recent thread: 'instrument', 'battery', 'array', 'storage', 'vehicle' or 'fuel'. */
  threadControl: string | null;
  /** Counter: how many times Auto-size fuel was pressed. */
  autoSizes: number;
}

export interface TutorialState {
  status: 'idle' | 'active' | 'done' | 'dismissed';
  /** Index into TUTORIAL_STEPS while active. */
  step: number;
  /** Counter values when the current step began (a step completes on the next change after that). */
  threadBase: number;
  fuelBase: number;
}

export type TutorialEvent =
  | { type: 'start'; obs: Observation }
  | { type: 'observe'; obs: Observation }
  | { type: 'ack' }
  | { type: 'skip' };

export const initialTutorial = (): TutorialState => ({ status: 'idle', step: 0, threadBase: 0, fuelBase: 0 });

const PAST_DESIGN: TutorialScreen[] = ['launch', 'mission', 'outcome', 'diff'];

/** Has the current step's action been done? */
function stepDone(state: TutorialState, obs: Observation): boolean {
  switch (TUTORIAL_STEPS[state.step]?.id) {
    case 'instruments': return obs.instrumentCount >= 3;
    // The thread that finishes drawing right after the third instrument was ticked belongs to step 1, so only a
    // thread from a slider-type control counts (the step asks for the Battery slider; any power or storage control is fine).
    case 'thread': return obs.threadsDrawn > state.threadBase && obs.threadControl !== null && obs.threadControl !== 'instrument';
    case 'fuel': return obs.autoSizes > state.fuelBase;
    case 'launch': return PAST_DESIGN.includes(obs.screen);
    default: return false; // 'chain' ends with an explicit "Got it"
  }
}

/** Move forward through every step whose action is already done. Never goes backwards. */
function settle(state: TutorialState, obs: Observation): TutorialState {
  let s = state;
  // A player who races ahead (launches early) jumps straight to the step that fits the screen they are on.
  if (s.status === 'active' && s.step < 3 && PAST_DESIGN.includes(obs.screen)) s = { ...s, step: 3 };
  for (let guard = 0; guard < TUTORIAL_STEPS.length && s.status === 'active' && stepDone(s, obs); guard++) {
    const next = s.step + 1;
    s = { ...s, step: next, threadBase: obs.threadsDrawn, fuelBase: obs.autoSizes };
  }
  // Leaving the outcome for the rewind diff means the player went on without needing the last step.
  if (s.status === 'active' && s.step >= 4 && obs.screen === 'diff') s = { ...s, status: 'done' };
  return s;
}

export function reduceTutorial(state: TutorialState, event: TutorialEvent): TutorialState {
  switch (event.type) {
    case 'start':
      return settle(
        { status: 'active', step: 0, threadBase: event.obs.threadsDrawn, fuelBase: event.obs.autoSizes },
        event.obs,
      );
    case 'observe':
      return state.status === 'active' ? settle(state, event.obs) : state;
    case 'ack':
      return state.status === 'active' && state.step >= 4 ? { ...state, status: 'done' } : state;
    case 'skip':
      return state.status === 'active' ? { ...state, status: 'dismissed' } : state;
  }
}

/** The step to show on this screen, or null (panel hidden). */
export function visibleStep(state: TutorialState, screen: TutorialScreen): TutorialStep | null {
  if (state.status !== 'active') return null;
  const step = TUTORIAL_STEPS[state.step];
  return step && step.screen === screen ? step : null;
}

/** True once the tutorial should never auto-open again. */
export const tutorialFinished = (s: TutorialState): boolean => s.status === 'done' || s.status === 'dismissed';
