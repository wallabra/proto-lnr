//@flow
var Vec2 = require('victor');

export class Ship {
  constructor(size) {
    this.pos = Vec2(0, 0);
    this.lastPos = Vec2(-2, 0);
    this.size = size || 12.0;
    this.angle = 0;
    this.angVel = 0;
    this.age = 0;
    this.damage = 0;
    this.dying = false;
    this.shootCooldown = 0;
    this.wannaShoot = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;
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
  
  steerToward(otherPos) {
    let angleTarg = otherPos.clone().subtract(this.pos).angle();
    this.steer(angleTarg);
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
  
  physDrag(deltaTime, game) {
    let height = game.terrain.heightAt(this.pos.x, this.pos.y);
    let drag = this.drag;
    
    if (height > game.waterLevel) {
      drag *= 3;
    }
    
    let currVel = this.vel;
    let slow = Vec2(deltaTime * drag, deltaTime * drag).multiply(currVel);

    this.lastPos.add(slow);
  }
  
  heightGradient(game) {
    return Vec2(
      game.terrain.heightAt(this.pos.x+0.5, this.pos.y) - game.terrain.heightAt(this.pos.x-0.5, this.pos.y),
      game.terrain.heightAt(this.pos.x, this.pos.y+0.5) - game.terrain.heightAt(this.pos.x, this.pos.y-0.5)
    );
  }
  
  slideDownLand(deltaTime, game) {
    let height = game.terrain.heightAt(this.pos.x, this.pos.y);
    if (height <= game.waterLevel) {
      return;
    }
    let dHeight = this.heightGradient(game);
    this.applyForce(deltaTime, Vec2(-dHeight.x*100, -dHeight.y*100 ));
    
    let steepness = dHeight.length();
    this.damageShip((3 + steepness * 2) * deltaTime * 5);
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
    
    this.applyForce(deltaTime * 5, offs.clone());
    ship.applyForce(deltaTime * 5, offs.clone().invert());
    ship.setInstigator(this);
    this.damageShip(closeness * 10 * deltaTime * offsNorm.clone().dot(ship.vel));
    ship.damageShip(closeness * 10 * deltaTime * offsNorm.invert().dot(this.vel));
  }
  
  checkShipCollisions(deltaTime, game) {
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
  
  prnueDeadInstigator() {
    if (this.instigator != null && this.instigator.dying) {
      this.instigator == null;
    }
  }
  
  // TODO: split physics code into separate subsystem, integrated w/ ships & other objects
  tick(game, deltaTime) {
    this.cooldownCannons(deltaTime);
    this.checkWannaShoot(game, deltaTime);
    this.age += deltaTime;
    this.physAngle(deltaTime);
    this.physVel(deltaTime);
    this.checkShipCollisions(deltaTime, game);
    this.physDrag(deltaTime, game);
    this.slideDownLand(deltaTime, game);
    this.prnueDeadInstigator();
  }
}