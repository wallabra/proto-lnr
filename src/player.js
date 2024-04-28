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
  
  tick(deltaTime) {
    if (window.mouseX == null) {
      return;
    }
    
    let offs = Vec2(window.mouseX, window.mouseY);
    
    if (offs.length() < 100) {
      // close enough
      return;
    }
    
    this.steer(offs, deltaTime);
    this.approach(offs, deltaTime);
  }
}