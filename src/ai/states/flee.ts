import { Ship } from "../../objects/ship";
import { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";

export interface FleeStartArgs extends AIStartArgs {
  target: Ship;
}

export class FleeState implements AIHandler<FleeStartArgs> {
  name = "flee";
  target: Ship;

  start(args: FleeStartArgs) {
    this.target = args.target;
  }

  free() {
    this.target = null;
  }

  aiTick(args: AITickArgs): AIJump {
    const { ship, deltaTime } = args;

    if (this.target == null || this.target.dying) {
      return { next: "start", immediate: true };
    }

    const target = this.target;
    const offs = ship.pos.clone().subtract(target.pos);
    const dist = offs.length();

    if (dist > (target.maxShootRange ?? 500) * 2.5) {
      return { next: "start" };
    }

    ship.steer(deltaTime, offs.angle());
    ship.thrustForward(deltaTime, ship.angNorm.dot(offs.norm()));
  }
}
