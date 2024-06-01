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

  constructor(
    ai: AIController,
    mapper: AIStates,
    args: Exclude<S, AIStartArgs>,
  ) {
    this.ai = ai;
    this.default = mapper.start;
    this.mapper = mapStates(mapper.states);
    this.state = this.mapper.get(mapper.start);
    this.stateName = mapper.start;
    this.startState(null, args);
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

    const res = this.state.aiTick({
      ai,
      ship,
      play,
      game,
      dHeight,
      soonPos,
      deltaTime,
    });
    if (res == null) return;
    const { next, args } = res as AIJump<unknown & AIStartArgs>;

    if (!this.mapper.has(next)) {
      throw new Error(
        `AI state ${this.stateName} tried to jump to unknown state ${next}`,
      );
      return;
    }

    if (this.state.free != null) this.state.free();
    this.state = this.mapper.get(next);
    this.startState(this.stateName, args || null);
    this.stateName = next;
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
    this.stateMachine.tick(deltaTime);
  }
}
