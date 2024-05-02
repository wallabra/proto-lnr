import Vec2 from 'victor';

export class Cannonball {
  constructor(game, shipOwner, params) {
    this.game = game;
    this.instigator = shipOwner;
    this.phys = this.game.makePhysObj(shipOwner.cannonballSpawnSpot(), params);
    this.dying = false;
  }
  
  // -- phys util getters
  get vel() {
    return this.phys.vel;
  }
  
  set vel(vel) {
    this.phys.vel = vel;
  }
  
  get floor() {
    return this.phys.floor;
  }
  
  get height() {
    return this.phys.height;
  }
  
  get pos() {
    return this.phys.pos;
  }
  
  get size() {
    return this.phys.size;
  }
  
  get angle() {
    return this.phys.angle;
  }
  
  get weight() {
    return this.phys.weight;
  }
  // --
  
  get damageFactor() {
    // TODO: make depend on munition type
    return 15;
  }
  
  get damage() {
    return this.damageFactor * (1 + this.vel.length());
  }
  
  destroy() {
    this.dying = true;
    this.phys.dying = true;
  }
  
  touchingShip(ship) {
    if (Math.abs(this.height - ship.height) > 0.6) {
      return 0;
    }
    
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
    if (this.height < Math.max(this.game.waterLevel, this.phys.floor)) {
      this.destroy();
    }
  }
  
  tick(deltaTime) {
    this.checkTerrainCollision();
    this.checkShipCollisions(deltaTime);
  }
}