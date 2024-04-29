//@flow
const Vec2 = require('victor');

export class Player {
  constructor(ship: Ship) {
    this.possessed = ship;
  }
  
  steer(offs, deltaTime) {
    let targ = offs.angle() - this.possessed.angle;
    let angleOffs = (targ + Math.PI) % (Math.PI * 2) - Math.PI;
    this.possessed.steer(angleOffs);
  }
  
  approach(offs, deltaTime) {  
    let dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, dot + 1 / 2);
  }
  
  doSteer(deltaTime) {
    if (!window.mouseState.steering) {
      return;
    }
    
    let offs = Vec2(window.mouseState.x, window.mouseState.y);
    
    if (offs.length() < this.possessed.size * this.possessed.lateralCrossSection * 2) {
      // close enough
      return;
    }
    
    this.steer(offs, deltaTime);
    this.approach(offs, deltaTime);
  }
  
  tick(deltaTime) {
    this.doSteer(deltaTime);
  }
}