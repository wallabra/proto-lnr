import type { Nullish } from "utility-types";
import { commonPaths } from "../commonpaths";
import type { AIHandler, AIStartArgs, AITickArgs, AIJump } from "../defs";

export class FollowState implements AIHandler<AIStartArgs> {
  name = "follow";

  aiTick(args: AITickArgs): Nullish | AIJump {
    const { ship, deltaTime } = args;

    if (ship.following == null) return { next: "start", immediate: true };

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    const following = ship.following;
    const offs = following.pos.clone().subtract(ship.pos);
    const dist = offs.length();
    const baseRadii =
      ship.size * ship.lateralCrossSection +
      following.size * following.lateralCrossSection;
    if (dist <= 130 + baseRadii) return { next: "start" };

    // follow
    ship.steer(deltaTime, offs.angle());
    ship.thrustForward(
      deltaTime,
      ship.angNorm.dot(offs.norm()) * dist > 300 + baseRadii ? 1 : 0.3,
    );
  }
}
