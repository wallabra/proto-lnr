var Vec2 = require('victor');

export class Ship {
  constructor(size) {
    this.pos = new Vec2(0, 0);
    this.vel = new Vec2(0, 0);
    this.size = size || 20.0;
  }
  
  // TODO: split physics code into separate subsystem, integrated w/ ships & other objects
  tick(deltaTime) {
    this.pos += this.vel * deltaTime;
    // TODO: check collisions
    // TODO: apply friction
  }
}