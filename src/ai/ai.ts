import { Ship } from "../objects/ship";
import { PlayState } from "../superstates/play";
import { DEFAULT_AI_STATES } from "./default";
import { UnknownAIHandler, AIStartArgs, AIJump } from "./defs";

function mapStates(
  states: (new () => UnknownAIHandler)[],
): Map<string, UnknownAIHandler> {
  return states
    .map((S) => new S())
    .reduce((map, state) => map.set(state.name, state), new Map());
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
  stateName: string;
  nextChange: number;
  pendingChange: AIJump<unknown & AIStartArgs> | null;

  constructor(
    ai: AIController,
    mapper: AIStates,
    args: Exclude<S, AIStartArgs>,
  ) {
    this.ai = ai;
    this.default = mapper.start;
    this.mapper = mapStates(mapper.states);
    this.nextChange = null;
    this.jumpToState(this.default, args);
  }

  private startState<S extends AIStartArgs>(
    from: string | null,
    args: Exclude<S, AIStartArgs>,
  ) {
    if (this.state.start != null)
      this.state.start({
        ai: this.ai,
        ship: this.ai.possessed,
        from: from,
        ...args,
      });
  }

  tick(deltaTime: number) {
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
      this.pendingChange = nextJump ?? null;
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
    if (this.stateName === undefined) this.stateName = next;

    if (!this.mapper.has(next)) {
      throw new Error(
        `AI state ${this.stateName} tried to jump to unknown state ${next}`,
      );
      return;
    }

    const newState = this.mapper.get(next);
    if (newState === this.state) return;

    this.nextChange = Date.now() + 500;
    if (this.state != null && this.state.free != null) this.state.free();

    this.state = newState;
    this.startState(from, args ?? null);
    this.stateName = next;
    this.pendingChange = null;
  }
}

export class AIController {
  game: PlayState;
  possessed: Ship;
  dying: boolean;
  stateMachine: AIStateMachine<unknown & AIStartArgs>;

  constructor(
    game: PlayState,
    ship: Ship,
    stateMapper: AIStates = DEFAULT_AI_STATES,
  ) {
    this.game = game;
    this.possessed = ship;
    this.dying = false;
    this.stateMachine = new AIStateMachine(this, stateMapper, null);
  }

  tick(deltaTime: number) {
    if (this.possessed.dying) {
      this.dying = true;
      return;
    }

    this.stateMachine.tick(deltaTime);
  }
}
