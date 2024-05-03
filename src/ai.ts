import Vec2 from "victor";
import { angDiff } from "./util.ts";
import { Game } from "./game.ts";
import { Ship } from "./objects/ship.ts";

/// Basic placeholder AI
export class AIController {
  game: Game;
  possessed: Ship;
  dying: boolean;

  constructor(game: Game, ship: Ship) {
    this.game = game;
    this.possessed = ship;
    this.dying = false;
  }

  tick(deltaTime: number) {
    const game = this.game;
    const dHeight = this.possessed.heightGradient();
    let soonPos = this.possessed.vel.add(this.possessed.pos);
    if (
      game.terrain != null &&
      game.terrain.heightAt(soonPos.x, soonPos.y) >
        game.waterLevel * 0.7
    ) {
      this.possessed.steer(deltaTime, dHeight.invert().angle());
      this.possessed.thrustForward(deltaTime, 0.2);
    } else {
      if (this.possessed.lastInstigator != null) {
        const airtime = this.possessed.shotAirtime();
        const steerAngle = this.possessed.lastInstigator.pos
          .clone()
          .add(
            this.possessed.lastInstigator.vel.multiply(Vec2(airtime, airtime)),
          )
          .subtract(soonPos)
          .angle();
        const targetAngle = this.possessed.lastInstigator.pos
          .clone()
          .add(
            this.possessed.lastInstigator.vel.multiply(Vec2(airtime, airtime)),
          )
          .subtract(this.possessed.pos)
          .angle();
        const dist = this.possessed.lastInstigator.pos
          .clone()
          .subtract(this.possessed.pos)
          .length();
        if (
          Math.abs(angDiff(this.possessed.angle, targetAngle)) <
            Math.atan(
              (this.possessed.lastInstigator.size +
                this.possessed.lastInstigator.lateralCrossSection) /
                2 /
                dist,
            ) &&
          this.possessed.pos
            .clone()
            .subtract(this.possessed.lastInstigator.pos)
            .length() < this.possessed.maxShootRange
        ) {
          this.possessed.tryShoot(dist);
        } else {
          this.possessed.steer(deltaTime, steerAngle);
        }
      }
      if (
        this.possessed.lastInstigator == null ||
        soonPos.clone()
          .subtract(this.possessed.lastInstigator.pos)
          .length() > 400
      ) {
        if (
          game.terrain != null &&
          game.terrain.heightAt(this.possessed.pos.x, this.possessed.pos.y) <
            game.waterLevel * 0.001
        ) {
          // steer toward shallow water
          this.possessed.steer(deltaTime, dHeight.angle());
        }
        this.possessed.thrustForward(deltaTime, 0.6);
      }
    }
  }
}
