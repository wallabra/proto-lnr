import Vec2 from "victor";
import { angDiff } from "./util";
import { Ship } from "./objects/ship";
import { PlayState } from "./superstates/play";

/// Basic placeholder AI
export class AIController {
  game: PlayState;
  possessed: Ship;
  dying: boolean;

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
          .subtract(this.possessed.pos);
        const airtime = this.possessed.shotAirtime(deltaTime, dist);
        const targetSoonPos = this.possessed.lastInstigator.pos
          .clone()
          .add(
            this.possessed.lastInstigator.vel.multiply(Vec2(airtime, airtime)),
          );
        const targetOffs = targetSoonPos
          .clone()
          .subtract(this.possessed.pos);
        const steerAngle = targetSoonPos
          .clone()
          .subtract(soonPos)
          .angle();
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
          dist < this.possessed.maxShootRange
        ) {
          this.possessed.tryShoot(dist);
        } else {
          this.possessed.steer(deltaTime, steerAngle);
        }
        if (
          this.possessed.pos
            .clone()
            .subtract(this.possessed.lastInstigator.pos)
            .length() > 200
        ) {
          this.possessed.thrustForward(deltaTime, 0.01);
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
        this.possessed.thrustForward(deltaTime, 0.6);
      }
    }
  }
}
