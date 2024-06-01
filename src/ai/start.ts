import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "./defs";
import { Pickup } from "../objects/pickup";
import { Ship } from "../objects/ship";
import { EngageStartArgs } from "./states/engage";
import { SeekCrateStartArgs } from "./states/seekcrate";
import { Nullish } from "utility-types";

export class StartState implements AIHandler<AIStartArgs> {
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

  aiTick(args: AITickArgs): AIJump<unknown & AIStartArgs> | Nullish {
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
