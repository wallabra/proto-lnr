//@flow
var Vec2 = require('victor');

export class Ship {
  constructor(size) {
    this.pos = Vec2(0, 0);
    this.lastPos = Vec2(-2, 0);
    this.size = size || 8.0;
    this.angle = 0;
    this.angVel = 0;
    this.age = 0;
  }
  
  get thrust() {
    // TODO: depend on ship makeup
    return 0.4;
  }
  
  get weight() {
    // TODO: depend on ship makeup
    return 5;
  }
  
  get lateralCrossSection() {
    // TODO: depend on ship makeup
    return 2;
  }
  
  get waterDrag() {
    // TODO: proper drag calculations, maybe vary depending on water depth or smth
    return 0.9;
  }
  
  get vel() {
    return this.pos.clone().subtract(this.lastPos);
  }
  
  get drag() {
    let drag = this.waterDrag;
    let alpha = 1 - Math.abs(Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()));
    let cs = this.size * (1 + alpha * (this.lateralCrossSection - 1));
    
    return drag * cs / this.weight;
  }
  
  steer(angleTarg) {
    let angOffs = (angleTarg - this.angVel);
    
    if (Math.abs(angOffs) > Math.PI / 5) {
      angOffs = Math.PI / 5 * Math.sign(angOffs);
    }
    
    this.angVel += angOffs * this.vel.length();
  }
  
  applyForce(deltaTime, force) {
    this.lastPos.subtract(force.clone().divide(Vec2(this.weight, this.weight)));
  }
  
  thrustForward(deltaTime, amount) {
    if (amount > 1) {
      amount = 1;
    }
    
    else if (amount < -1) {
      amount = -1;
    }

    let thrust = this.thrust * amount;
    this.applyForce(deltaTime, Vec2(1, 0).rotateBy(this.angle).multiply(Vec2(thrust, thrust)));
  }
  
  physAngle(deltaTime) {
    this.angle += this.angVel * deltaTime;
    this.angVel -= this.angVel * this.waterDrag * deltaTime;
    this.angle = this.angle % (Math.PI * 2);
  }
  
  physVel(deltaTime) {
    let lastPos = this.pos.clone();
    this.pos = this.pos.clone().multiply(Vec2(2, 2)).subtract(this.lastPos);
    this.lastPos = lastPos;
  }
  
  physDrag(deltaTime) {
    let drag = this.drag;
    let currVel = this.vel;
    let slow = Vec2(deltaTime * drag, deltaTime * drag).multiply(currVel);

    this.lastPos.add(slow);
  }
  
  // TODO: split physics code into separate subsystem, integrated w/ ships & other objects
  tick(deltaTime) {
    this.age += deltaTime;
    this.physAngle(deltaTime);
    this.physVel(deltaTime);
    // TODO: check collisions
    this.physDrag(deltaTime);
  }
}