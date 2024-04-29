//@flow

/// Basic placeholder AI
export class AIController {
  constructor(ship: Ship) {
    this.possessed = ship;
  }
  
  tick(game, deltaTime) {
    if (game.terrain.heightAt(this.possessed.pos.x, this.possessed.pos.y) > game.waterLevel * 0.2) {
      let dHeight = this.possessed.heightGradient(game);
      this.possessed.steer(dHeight.invert().angle() - this.possessed.angle);
      this.possessed.thrustForward(deltaTime, 0.2);
    }
    else {
      this.possessed.thrustForward(deltaTime, 0.6);
    }
  }
}