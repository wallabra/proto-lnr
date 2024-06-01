import { AIStartArgs, AITickArgs, AIHandler, AIJump } from "../defs";
import { Ship } from "../../objects/ship";
import { angDiff } from "../../util";

export interface EngageStartArgs extends AIStartArgs {
  target: Ship;
}

export class EngageState implements AIHandler<EngageStartArgs, AITickArgs> {
  name: string = "engage";
  target: Ship | null;

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
