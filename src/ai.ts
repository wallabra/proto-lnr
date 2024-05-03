import { angDiff } from "./util.js";

/// Basic placeholder AI
export class AIController {
  constructor(ship: Ship) {
    this.possessed = ship;
    this.lastDamage = 0.5;
  }

  tick(game: Game, deltaTime: number) {
    if (
      game.terrain.heightAt(this.possessed.pos.x, this.possessed.pos.y) >
      game.waterLevel * 0.9
    ) {
      const dHeight = this.possessed.heightGradient(game);
      this.possessed.steer(deltaTime, dHeight.invert().angle());
      this.possessed.thrustForward(deltaTime, 0.2);
    } else {
      if (this.possessed.lastInstigator != null) {
        const targetAngle = this.possessed.lastInstigator.pos
          .clone()
          .subtract(this.possessed.pos)
          .angle();
        if (
          Math.abs(angDiff(this.possessed.angle, targetAngle)) < Math.PI / 6 &&
          this.possessed.pos
            .clone()
            .subtract(this.possessed.lastInstigator.pos)
            .length() < 250
        ) {
          this.possessed.tryShoot();
        } else {
          this.possessed.steer(deltaTime, targetAngle);
        }
      }
      this.possessed.thrustForward(deltaTime, 0.6);
    }
  }
}