import { angDiff } from "./util";
import { Ship } from "./objects/ship";
import { PlayState } from "./superstates/play";
import { Pickup } from "./objects/pickup";
import { Game } from "./game";
import Vec2 from "victor";

type UnknownAIHandler = AIHandler<unknown & AIStartArgs, unknown & AITickArgs>;

export interface AIJump<A extends AIStartArgs = AIStartArgs> {
  next: string;
  args?: Exclude<A, AIStartArgs>;
}

export interface AIStartArgs {
  ai: AIController;
  ship: Ship;
  from: string | null;
}

export interface AITickArgs {
  ai: AIController;
  ship: Ship;
  game: Game;
  play: PlayState;
  soonPos: Vec2;
  dHeight: number;
  deltaTime: number;
}

export interface AIHandler<
  StartArgs extends AIStartArgs,
  TickArgs extends AITickArgs,
> {
  name: string;
  start?(args: StartArgs);
  free?();
  aiTick(args: TickArgs): AIJump<unknown & AIStartArgs> | void;
}

interface EngageStartArgs extends AIStartArgs {
  target: Ship;
}

class EngageState implements AIHandler<EngageStartArgs, AITickArgs> {
  name: string = "engage";
  target: Ship;

  start(args: EngageStartArgs) {
    this.target = args.target;
  }

  free() {
    this.target = null;
  }

  aiTick(args: AITickArgs): void | AIJump<unknown & AIStartArgs> {
    const { target } = this;
    const { ship, deltaTime, soonPos } = args;

    if (
      target !== ship.lastInstigator ||
      target.dying ||
      target.makeup.hullDamage > target.makeup.make.maxDamage
    ) {
      return { next: "start" };
    }

    const dist = target.pos.clone().subtract(ship.pos).length();
    const airtime = ship.shotAirtime(dist);
    const targetSoonPos = target.pos
      .clone()
      .add(target.vel.multiplyScalar(airtime));
    const targetOffs = targetSoonPos.clone().subtract(ship.pos);
    const steerAngle = targetSoonPos.clone().subtract(soonPos).angle();
    const targetAngle = targetOffs.angle();
    const targetDist = targetOffs.length();

    if (
      ship.maxShootRange != null &&
      Math.abs(angDiff(ship.angle, targetAngle)) <
        ship.maxSpread() * 0.6 +
          Math.atan(
            (target.size + target.lateralCrossSection) / 2 / targetDist,
          ) &&
      targetDist < ship.maxShootRange
    ) {
      ship.tryShoot(targetDist);
    }

    ship.steer(deltaTime, steerAngle);

    if (
      ship.pos.clone().subtract(target.pos).length() > 200 &&
      Math.abs(angDiff(ship.angle, steerAngle)) < Math.PI
    ) {
      ship.thrustForward(deltaTime, 1.0);
    } else {
      ship.thrustForward(deltaTime, -0.4);
    }
  }
}

class BackToLandState implements AIHandler<AIStartArgs, AITickArgs> {
  name: string = "backToLand";

  aiTick(args: AITickArgs): void | AIJump<AIStartArgs> {
    const { ship, deltaTime } = args;

    if (ship.pos.length() <= 1500 || ship.lastInstigator != null)
      return { next: "start" };

    // steer toward 0,0
    ship.steer(deltaTime * 0.25, ship.pos.clone().invert().angle());
  }
}

interface SeekCrateStartArgs extends AIStartArgs {
  crate: Pickup;
}

class SeekCrateState implements AIHandler<SeekCrateStartArgs, AITickArgs> {
  name: string = "seekCrate";

  crate: Pickup;

  start(args: SeekCrateStartArgs) {
    this.crate = args.crate;
  }

  free() {
    this.crate = null;
  }

  aiTick(args: AITickArgs): void | AIJump<AIStartArgs> {
    if (this.crate.dying) {
      this.crate = null;
      return { next: "start" };
    }

    const { ship, deltaTime, soonPos } = args;
    const seekAngle = this.crate.phys.pos.clone().subtract(soonPos).angle();
    ship.steer(deltaTime * 0.5, seekAngle);
    ship.thrustForward(deltaTime, 0.8);
  }
}

class StartState implements AIHandler<AIStartArgs, AITickArgs> {
  name: string = "start";

  private findPickupCrate(args: AITickArgs) {
    const { ship, play } = args;
    const pos = ship.pos;
    for (const pickup of play.tickables) {
      if (!(pickup instanceof Pickup)) continue;
      if (pickup.phys.pos.clone().subtract(pos).length() > 300) continue;
      return pickup;
    }
  }
  private roam(deltaTime: number, ship: Ship) {
    ship.thrustForward(deltaTime, 0.4);
  }

  aiTick(args: AITickArgs): AIJump<unknown & AIStartArgs> | void {
    const { play, soonPos, ship, deltaTime } = args;

    if (
      play.terrain != null &&
      play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.8
    )
      return { next: "backToLand" };

    if (ship.lastInstigator != null && ship.makeup.nextReadyCannon != null)
      return {
        next: "engage",
        args: { target: ship.lastInstigator },
      } as AIJump<EngageStartArgs>;

    if (ship.pos.length() > 1500) return { next: "backToLand" };

    const foundCrate = this.findPickupCrate(args);
    if (foundCrate)
      return {
        next: "seekCrate",
        args: { crate: foundCrate },
      } as AIJump<SeekCrateStartArgs>;

    this.roam(deltaTime, ship);
  }
}

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

export const DEFAULT_AI_STATES: AIStates = {
  start: "start",
  states: [StartState, SeekCrateState, EngageState, BackToLandState],
};

export class AIController {
  game: PlayState;
  possessed: Ship;
  dying: boolean;
  stateMachine: AIStateMachine<unknown & AIStartArgs>;

  constructor(game: PlayState, ship: Ship, stateMapper: AIStates = DEFAULT_AI_STATES) {
    this.game = game;
    this.possessed = ship;
    this.dying = false;
    this.stateMachine = new AIStateMachine(this, stateMapper, null);
  }

  tick(deltaTime: number) {
    this.stateMachine.tick(deltaTime);
  }
}
