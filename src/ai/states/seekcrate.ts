import { Pickup } from "../../objects/pickup";
import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";

export interface SeekCrateStartArgs extends AIStartArgs {
  crate: Pickup;
}

export class SeekCrateState
  implements AIHandler<SeekCrateStartArgs, AITickArgs>
{
  name: string = "seekCrate";

  crate: Pickup | null;

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
