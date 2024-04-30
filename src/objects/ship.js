//@flow
var Vec2 = require('victor');

export class Ship {
  constructor(game, pos, params) {
    params = params || {};
    params.size = params.size || 12;
    this.game = game;
    this.phys = this.game.makePhysObj(pos || Vec2(0, 0), params);
    this.damage = 0;
    this.dying = false;
    this.shootCooldown = 0;
    this.wannaShoot = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;

    this.dragMixin();
  }
  
  dragMixin() {
    let ship = this;
    this.phys.waterDrag = function() {
      let alpha = 1 - Math.abs(Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()));
      let cs = this.size * (1 + alpha * (ship.lateralCrossSection - 1));
      return this.baseDrag * cs;
    }
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

  get instigMemory() {
    return 12;
  }
  
  setInstigator(instigator) {
    let instigTime = Date.now();
    if (this.isntigator != null && instigTime - this.lastInstigTime < 1000 * this.instigMemory) {
      return;
    }
    this.lastInstigator = instigator;
    this.lastInstigTime = instigTime;
  }

  damageShip(damage) {
    this.damage += Math.max(0, damage);
    
    if (this.damage > this.maxDmg) {
      this.die();
    }
  }
  
  tryShoot() {
    if (this.shootCooldown > 0) {
      // can't shoot, waiting on cooldown
      return;
    }
    
    this.wannaShoot = true;
    this.shootCooldown = this.shootRate;
  }
  
  checkWannaShoot(game, timeDelta) {
    if (this.wannaShoot) {
      this.wannaShoot = false;
      this.shoot(game, timeDelta);
    }
  }
  
  shoot(game, timeDelta) {
    game.spawnCannonball(this, timeDelta);
  }
  
  get shootRate() {
    // TODO: depend on ship makeup
    return 2.0;
  }
  
  get maxDmg() {
    // TODO: make maxDmg depend on ship makeup
    return 20 * this.size;
  }
  
  die() {
    // TODO: trigger death FX
    this.dying = true;
    this.phys.dying = true;
  }
  
  get thrust() {
    // TODO: depend on ship makeup
    return 0.4;
  }
  
  get lateralCrossSection() {
    // TODO: depend on ship makeup
    return 2;
  }

  get vel() {
    return this.phys.vel;
  }
  
  steer(angleTarg) {
    let angOffs = (angleTarg - this.phys.angVel);
    
    if (Math.abs(angOffs) > Math.PI / 5) {
      angOffs = Math.PI / 5 * Math.sign(angOffs);
    }
    
    this.phys.angVel += angOffs * this.vel.length();
  }
  
  steerToward(otherPos) {
    let angleTarg = otherPos.clone().subtract(this.pos).angle();
    this.steer(angleTarg);
  }
  
  thrustForward(deltaTime, amount) {
    if (amount > 1) {
      amount = 1;
    }
    
    else if (amount < -1) {
      amount = -1;
    }

    let thrust = this.thrust * amount;
    this.phys.applyForce(deltaTime, Vec2(1, 0).rotateBy(this.angle).multiply(Vec2(thrust, thrust)));
  }
  
  heightGradient(game) {
    return Vec2(
      game.terrain.heightAt(this.pos.x+0.5, this.pos.y) - game.terrain.heightAt(this.pos.x-0.5, this.pos.y),
      game.terrain.heightAt(this.pos.x, this.pos.y+0.5) - game.terrain.heightAt(this.pos.x, this.pos.y-0.5)
    );
  }

  nearShip(ship) {
    let r1 = this.size * this.lateralCrossSection;
    let r2 = ship.size * ship.lateralCrossSection;
    
    let dist = this.pos.clone().subtract(ship.pos).length();
    
    return dist <= r1 + r2;
  }
  
  intermediaryRadius(angle) {
    angle = (angle - this.angle + Math.PI) % (Math.PI * 2) - Math.PI;
    return this.size * this.size * this.lateralCrossSection / Math.sqrt(
      Math.pow(this.size * this.lateralCrossSection, 2) * Math.pow(Math.sin(angle), 2) +
      Math.pow(this.size, 2) * Math.pow(Math.cos(angle), 2)
    )
  } 
  
  touchingShip(ship) {
    if (!this.nearShip(ship)) {
      return 0;
    }
    
    let angle1 = ship.pos.clone().subtract(this.pos).angle();
    let angle2 = this.pos.clone().subtract(ship.pos).angle();
    
    let r1 = this.intermediaryRadius(angle1);
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
      return;
    }
    
    let offs = this.pos.clone().subtract(ship.pos);
    offs.multiply(Vec2(deltaTime, deltaTime));
    
    let offsNorm = offs.clone().normalize();
    
    this.phys.applyForce(deltaTime * 5, offs.clone());
    ship.phys.applyForce(deltaTime * 5, offs.clone().invert());
    ship.setInstigator(this);
    this.damageShip(closeness * 10 * deltaTime * offsNorm.clone().dot(ship.vel));
    ship.damageShip(closeness * 10 * deltaTime * offsNorm.invert().dot(this.vel));
  }
  
  checkShipCollisions(deltaTime) {
    let foundSelf = false;
    
    game.ships.forEach((ship) => {
      if (foundSelf) {
        return;
      }
      
      if (ship === this) {
        foundSelf = true;
        return;
      }
      
      this.checkShipCollision(deltaTime, ship);
    })
  }
  
  cooldownCannons(deltaTime) {
    this.shootCooldown -= deltaTime;
    if (this.shootCooldown < 0) this.shootCooldown = 0;
  }
  
  pruneDeadInstigator() {
    if (this.instigator != null && this.instigator.dying) {
      this.instigator == null;
    }
  }

  tick(deltaTime) {
    this.cooldownCannons(deltaTime);
    this.checkWannaShoot(deltaTime);
    this.checkShipCollisions(deltaTime);
    this.pruneDeadInstigator();
  }
}