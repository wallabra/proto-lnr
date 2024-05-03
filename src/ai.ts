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
    if (
      game.terrain != null &&
      game.terrain.heightAt(this.possessed.pos.x, this.possessed.pos.y) >
        game.waterLevel * 0.9
    ) {
      const dHeight = this.possessed.heightGradient();
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
          .subtract(this.possessed.pos.clone().add(this.possessed.vel))
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
        this.possessed.pos
          .clone()
          .add(this.possessed.vel)
          .subtract(this.possessed.lastInstigator.pos)
          .length() > 400
      ) {
        this.possessed.thrustForward(deltaTime, 0.6);
      }
    }
  }
}
