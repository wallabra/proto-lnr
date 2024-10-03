import { Ship } from "../objects/ship";
import { PlayState } from "../superstates/play";
import { DEFAULT_AI_STATES } from "./default";
import { UnknownAIHandler, AIStartArgs, AIJump } from "./defs";

function mapStates(
  states: (new () => UnknownAIHandler)[],
): Map<string, UnknownAIHandler> {
  return states
    .map((S) => new S())
    .reduce((map, state) => map.set(state.name, state), new Map()) as Map<
    string,
    UnknownAIHandler
  >;
}

export interface AIStates {
  start: string;
  states: (new () => UnknownAIHandler)[];
}

class AIStateMachine<S extends AIStartArgs = AIStartArgs> {
  ai: AIController;
  state: UnknownAIHandler;
  mapper: Map<string, UnknownAIHandler>;
  default: string;
  stateName: string | null;
  nextChange: number | null;
  pendingChange: AIJump | null;

  constructor(
    ai: AIController,
    mapper: AIStates,
    args?: Exclude<S, AIStartArgs>,
  ) {
    this.ai = ai;
    this.default = mapper.start;
    this.mapper = mapStates(mapper.states);
    this.nextChange = null;
    this.stateName = null;
    this.jumpToState(this.default, args ?? ({} as Exclude<S, AIStartArgs>));
  }

  private startState<S extends AIStartArgs>(
    from: string | null,
    args: Exclude<S, AIStartArgs>,
  ) {
    if (this.state.start != null)
      this.state.start({
        ...args,
        from,
        ai: this.ai,
        ship: this.ai.possessed,
      });
  }

  tick(deltaTime: number) {
    if (this.stateName == null) return;

    const ai = this.ai;
    const play = ai.game;
    const game = play.game;
    const ship = ai.possessed;
    const dHeight = ship.heightGradient();
    const soonPos = ship.vel.add(ship.pos);

    const thisJump = this.state.aiTick({
      ai,
      ship,
      play,
      game,
      dHeight,
      soonPos,
      deltaTime,
      state: this.state,
      stateName: this.stateName,
    });
    const nextJump = thisJump ?? this.pendingChange;
    if (nextJump == null) return;

    if (
      this.nextChange != null &&
      Date.now() < this.nextChange &&
      !nextJump.immediate
    ) {
      this.pendingChange = nextJump;
      return;
    }

    const { next, args } = nextJump;
    this.jumpToState(next, args);
  }

  jumpToState<A extends AIStartArgs>(
    next: string,
    args?: Exclude<A, AIStartArgs>,
  ) {
    const from = this.stateName;

    if (!this.mapper.has(next)) {
      throw new Error(
        `AI state ${this.stateName != null ? this.stateName : "(null)"} tried to jump to unknown state ${next}`,
      );
      return;
    }

    const newState = this.mapper.get(next);
    if (newState == null || newState === this.state) return;

    this.nextChange = Date.now() + 500;
    if (this.stateName != null && this.state.free != null) this.state.free();
    //console.log(from, "->", next, "::", this.ai);

    this.stateName = next;
    this.state = newState;
    this.startState<A>(from, args ?? ({} as Exclude<A, AIStartArgs>)); // only valid if A *is* AIStartArgs, but whatever
    this.stateName = next;
    this.pendingChange = null;
  }
}

export class AIController {
  game: PlayState;
  possessed: Ship;
  dying = false;
  stateMachine: AIStateMachine;

  constructor(
    game: PlayState,
    ship: Ship,
    stateMapper: AIStates = DEFAULT_AI_STATES,
  ) {
    this.game = game;
    this.possessed = ship;
    this.stateMachine = new AIStateMachine(this, stateMapper);
  }

  tick(deltaTime: number) {
    if (this.possessed.dying) {
      this.dying = true;
      return;
    }

    this.stateMachine.tick(deltaTime);
  }
}
