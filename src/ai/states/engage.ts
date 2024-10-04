import type { AIStartArgs, AITickArgs, AIHandler, AIJump } from "../defs";
import type { Ship } from "../../objects/ship";
import { angDiff } from "../../util";
import { commonPaths } from "../commonpaths";
import type { Nullish } from "utility-types";

export interface EngageStartArgs extends AIStartArgs {
  target: Ship;
}

export class EngageState implements AIHandler<EngageStartArgs> {
  name = "engage";
  target: Ship | null;

  start(args: EngageStartArgs) {
    this.target = args.target;
  }

  free() {
    this.target = null;
  }

  aiTick(args: AITickArgs): Nullish | AIJump {
    const { target } = this;
    const { ship, deltaTime, soonPos } = args;

    const commonNext = commonPaths(args);
    if (commonNext != null && commonNext.next != this.name) return commonNext;

    if (
      target == null ||
      target !== ship.lastInstigator ||
      target.dying ||
      target.makeup.hullDamage > target.makeup.make.maxDamage
    ) {
      return { next: "start", immediate: true };
    }

    const dist = target.pos.clone().subtract(ship.pos).length();
    const airtime = ship.shotAirtime(dist) || 0;
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
