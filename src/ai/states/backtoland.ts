import { Nullish } from "utility-types";
import { commonPaths } from "../commonpaths";
import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";

export class BackToLandState implements AIHandler<AIStartArgs> {
  name: string = "backToLand";

  aiTick(args: AITickArgs): Nullish | AIJump<AIStartArgs> {
    const { ship, deltaTime } = args;

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    if (ship.pos.length() <= 1200) return { next: "start" };

    // steer toward 0,0
    const dirvec = ship.pos.clone().invert();
    ship.steer(deltaTime * 0.25, dirvec.angle());
    ship.thrustForward(deltaTime, ship.angNorm.dot(dirvec.norm()) * 0.2);
  }
}
