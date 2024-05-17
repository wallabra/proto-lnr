import Vec2 from "victor";
import { angDiff } from "./util";
import { Ship } from "./objects/ship";
import { PlayState } from "./superstates/play";
import Pickup from "./objects/pickup";

/// Basic placeholder AI
export class AIController {
  game: PlayState;
  possessed: Ship;
  dying: boolean;
  seeking: Pickup | null;

  constructor(game: PlayState, ship: Ship) {
    this.game = game;
    this.possessed = ship;
    this.dying = false;
  }

  tick(deltaTime: number) {
    const game = this.game;
    const dHeight = this.possessed.heightGradient();
    const soonPos = this.possessed.vel.add(this.possessed.pos);
    if (
      game.terrain != null &&
      game.terrain.heightAt(soonPos.x, soonPos.y) > game.waterLevel * 0.8
    ) {
      this.possessed.steer(deltaTime, dHeight.invert().angle());
      this.possessed.thrustForward(deltaTime, 0.2);
    } else {
      if (this.possessed.lastInstigator != null) {
        const dist = this.possessed.lastInstigator.pos
          .clone()
          .subtract(this.possessed.pos)
          .length();
        const airtime = this.possessed.shotAirtime(deltaTime, dist);
        const targetSoonPos = this.possessed.lastInstigator.pos
          .clone()
          .add(
            this.possessed.lastInstigator.vel.multiply(Vec2(airtime, airtime)),
          );
        const targetOffs = targetSoonPos.clone().subtract(this.possessed.pos);
        const steerAngle = targetSoonPos.clone().subtract(soonPos).angle();
        const targetAngle = targetOffs.angle();
        const targetDist = targetOffs.length();
        if (
          Math.abs(angDiff(this.possessed.angle, targetAngle)) <
            Math.atan(
              (this.possessed.lastInstigator.size +
                this.possessed.lastInstigator.lateralCrossSection) /
                2 /
                targetDist,
            ) &&
          targetDist < this.possessed.maxShootRange
        ) {
          this.possessed.tryShoot(targetDist);
        }
        this.possessed.steer(deltaTime, steerAngle);
        if (
          this.possessed.pos
            .clone()
            .subtract(this.possessed.lastInstigator.pos)
            .length() > 200 &&
          Math.abs(angDiff(this.possessed.angle, steerAngle)) < Math.PI
        ) {
          this.possessed.thrustForward(deltaTime, 1.0);
        } else {
          this.possessed.thrustForward(deltaTime, -0.4);
        }
      }
      if (
        this.possessed.lastInstigator == null ||
        soonPos.clone().subtract(this.possessed.lastInstigator.pos).length() >
          400
      ) {
        if (this.possessed.pos.length() > 1500) {
          // steer toward 0,0
          this.possessed.steer(
            deltaTime * 0.25,
            this.possessed.pos.clone().invert().angle(),
          );
        }
        if (!this.seeking) {
          for (const pickup of this.possessed.play.tickables) {
            if (!(pickup instanceof Pickup)) continue;
            if (
              pickup.phys.pos.clone().subtract(this.possessed.pos).length() >
              300
            )
              continue;
            this.seeking = pickup;
            break;
          }
        }
        if (this.seeking) {
          this.possessed.steer(
            deltaTime * 0.5,
            this.seeking.phys.pos.clone().subtract(this.possessed.pos).angle(),
          );
          this.possessed.thrustForward(deltaTime, 0.8);
        } else {
          this.possessed.thrustForward(deltaTime, 0.4);
        }
      }
    }
  }
}
