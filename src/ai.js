//@flow

/// Basic placeholder AI
export class AIController {
  constructor(ship: Ship) {
    this.possessed = ship;
    this.lastDamage = 0.5;
  }
  
  tick(game, deltaTime) {
    if (game.terrain.heightAt(this.possessed.pos.x, this.possessed.pos.y) > game.waterLevel * 0.2) {
      let dHeight = this.possessed.heightGradient(game);
      this.possessed.steer(deltaTime, dHeight.invert().angle() - this.possessed.angle);
      this.possessed.thrustForward(deltaTime, 0.2);
    }
    else {
      if (this.possessed.lastInstigator != null) {
        let targetAngle = this.possessed.lastInstigator.pos.clone().subtract(this.possessed.pos).angle();
        if (Math.abs((targetAngle - this.possessed.angle + Math.PI) % (Math.PI * 2) - Math.PI) < Math.PI / 4) {
          this.possessed.tryShoot();
        } else {
          this.possessed.steer(deltaTime, targetAngle);
        }
      }
      this.possessed.thrustForward(deltaTime, 0.6);
    }
  }
}