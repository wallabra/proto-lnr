//@flow
const Vec2 = require('victor');

export class Cannonball {
  constructor(game, shipOwner, params) {
    this.instigator = shipOwner;
    this.phys = this.game.makePhysObj(pos || Vec2(0, 0), params);
    this.game = game;
    this.dying = false;
  }
  
  get pos() {
    return this.phys.pos;
  }
  
  get size() {
    // TODO: make depend on munition type
    return this.phys.size;
  }
  
  get airDrag() {
    // TODO: make depend on munition type
    return 0.02;
  }
  
  get weight() {
    // TODO: make depend on munition type
    return 8;
  }
  
  get damageFactor() {
    // TODO: make depend on munition type
    return 15;
  }
  
  get damage() {
    return this.damageFactor * (1 + this.vel.length());
  }
  
  get vel() {
    return this.pos.clone().subtract(this.lastPos);
  }
  
  set vel(vel) {
    this.lastPos = this.pos.clone().subtract(vel);
  }
  
  get gravity() {
    return 2;
  }
  
  physAirDrag(deltaTime) {
    let drag = this.airDrag / this.weight;
    this.vel = this.vel.clone().subtract(this.vel.multiply(Vec2(drag, drag)));
    this.vspeed = this.vspeed - this.vspeed * drag * deltaTime;
  }
  
  physVel(deltaTime) {
    let lastPos = this.pos.clone();
    this.pos = this.pos.clone().multiply(Vec2(2, 2)).subtract(this.lastPos);
    this.lastPos = lastPos;
  }
  
  destroy() {
    this.dying = true;
  }
  
  physGravity(deltaTime) {
    this.height += this.vspeed * deltaTime;
    this.vspeed -= this.gravity * deltaTime;
    
    if (this.height < game.waterLevel) {
      this.destroy();
    }
  }
  
  touchingShip(ship) {
    let angle2 = this.pos.clone().subtract(ship.pos).angle();
    let r1 = this.size;
    let r2 = ship.intermediaryRadius(angle2);
    
    let dist = this.pos.clone().subtract(ship.pos).length();
    
    if (dist > r1 + r2) {
      return 0;
    }
    
    return r1 + r2 - dist;
  }
  
  checkShipCollision(deltaTime, ship) {
    let closeness = this.touchingShip(ship);
    if (closeness <= 0) {
      return false;
    }
    
    ship.setInstigator(this.instigator);
    ship.damageShip(this.damage);
    if (ship.dying) {
      this.instigator.killScore++;
    }
    this.destroy();
    
    return true;
  }
  
  checkShipCollisions(deltaTime) {
    if (this.height > 4) {
      return;
    }
    
    for (let ship of this.game.ships) {
      if (ship === this.instigator) {
        continue;
      }
      
      if (this.checkShipCollision(deltaTime, ship)) {
        break;
      }
    }
  }
  
  checkTerrainCollision() {
    if (this.height < this.game.terrain.heightAt(this.pos.x, this.pos.y)) {
      this.destroy();
    }
  }
  
  tick(deltaTime) {
    if (this.dying) {
      return;
    }
    
    this.physGravity(deltaTime);
    this.physVel(deltaTime);
    this.checkTerrainCollision();
    
    if (this.dying) {
      return;
    }
    
    this.checkShipCollisions(deltaTime);
    
    if (this.dying) {
      return;
    }
    
    this.physAirDrag(deltaTime);
  }
}