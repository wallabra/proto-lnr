import { Nullish } from "utility-types";
import { Pickup } from "../../objects/pickup";
import { commonPaths } from "../commonpaths";
import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";
import { ShipItem } from "../../inventory";

export interface SeekCrateStartArgs extends AIStartArgs {
  crate: Pickup<unknown & ShipItem>;
}

export class SeekCrateState implements AIHandler<SeekCrateStartArgs> {
  name: string = "seekCrate";

  crate: Pickup<unknown & ShipItem> | null;

  start(args: SeekCrateStartArgs) {
    this.crate = args.crate;
  }

  free() {
    this.crate = null;
  }

  aiTick(args: AITickArgs): Nullish | AIJump<AIStartArgs> {
    if (this.crate.dying) {
      return { next: "start", immediate: true };
    }

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    const { ship, deltaTime, soonPos } = args;
    const seekAngle = this.crate.phys.pos.clone().subtract(soonPos).angle();
    ship.steer(deltaTime * 0.5, seekAngle);
    ship.thrustForward(deltaTime, 0.6);
  }
}
