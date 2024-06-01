import { Nullish } from "utility-types";
import { commonPaths } from "../commonpaths";
import { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";

export class FollowState implements AIHandler<AIStartArgs> {
  name: string = "follow";

  aiTick(args: AITickArgs): Nullish | AIJump<AIStartArgs> {
    const { ship, deltaTime } = args;

    if (ship.following == null) return { next: "start", immediate: true };

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    const following = ship.following;
    const offs = following.pos.clone().subtract(ship.pos);
    const dist = offs.length();
    if (
      dist <=
      130 +
        ship.size * ship.lateralCrossSection +
        following.size * following.lateralCrossSection
    )
      return { next: "start" };

    // follow
    ship.steer(deltaTime, offs.angle());
    ship.thrustForward(deltaTime, ship.angNorm.dot(offs.norm()) * 0.3);
  }
}
