//@flow
const Vec2 = require('victor');

export class Player {
  constructor(ship: Ship) {
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.registerActions();
  }
  
  steer(offs, deltaTime) {
    let targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }
  
  approach(offs, deltaTime) {  
    let dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, dot + 1 / 2);
  }
  
  inputEvent(name, event) {
    if (name == 'shoot') {
      this.inputState = 'shoot';
    }
  }
  
  registerAction(name, callback) {
    this.actions.push((deltaTime) => {
      if (this.inputState == name) {
        this.inputState = null;
        callback(deltaTime)
      }
    });
  }
    
  registerActions() {
    this.registerAction('shoot', (deltaTime) => {
      let ms = window.mouseState;
      this.possessed.tryShoot(Vec2(ms.x, ms.y).length());
    });
  }
    
  doAction(deltaTime) {
    this.actions.forEach((act) => act());
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
    if (this.possessed.dying) {
      return;
    }

    this.doSteer(deltaTime);
    this.doAction(deltaTime);
  }
}