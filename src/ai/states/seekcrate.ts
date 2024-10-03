import type { Nullish } from "utility-types";
import type { Pickup } from "../../objects/pickup";
import { commonPaths } from "../commonpaths";
import type { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";
import type { ShipItem } from "../../inventory";

export interface SeekCrateStartArgs extends AIStartArgs {
  crate: Pickup<ShipItem>;
}

export class SeekCrateState implements AIHandler<SeekCrateStartArgs> {
  name = "seekCrate";

  crate: Pickup<ShipItem> | null;

  start(args: SeekCrateStartArgs) {
    this.crate = args.crate;
  }

  free() {
    this.crate = null;
  }

  aiTick(args: AITickArgs): Nullish | AIJump {
    if (this.crate == null || this.crate.dying) {
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
