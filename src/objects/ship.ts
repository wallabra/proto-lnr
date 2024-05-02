import Vec2 from "victor";
import { angDiff, umod } from "../util.js";

export class Ship {
  constructor(game, pos, params) {
    if (params == null) params = {};
    if (params.size == null) params.size = 14;
    if (params.baseFricition == null) params.baseFricition = 0.005;

    this.game = game;
    this.phys = this.game.makePhysObj(pos || Vec2(0, 0), params);
    this.damage = 0;
    this.dying = false;
    this.shootCooldown = 0;
    this.wannaShoot = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.currShootDist = null;
    this.killScore = 0;

    this.dragMixin();
  }

  dragMixin() {
    const ship = this;
    this.phys.waterDrag = function () {
      const alpha =
        1 - Math.abs(Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()));
      const cs = this.size * (1 + alpha * (ship.lateralCrossSection - 1));
      return this.baseDrag * cs;
    };
  }

  // -- phys util getters
  get vel() {
    return this.phys.vel;
  }

  set vel(vel: Vec2) {
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

  get instigMemory() {
    return 12;
  }

  setInstigator(instigator: Ship) {
    const instigTime = Date.now();

    // check reinforced aggression
    if (instigator === this.lastInstigator) {
      this.lastInstigTime = instigTime;
      return;
    }

    // check infight timer
    if (
      this.isntigator != null &&
      instigTime - this.lastInstigTime < 1000 * this.instigMemory
    ) {
      return;
    }
    this.lastInstigator = instigator;
    this.lastInstigTime = instigTime;
  }

  damageShip(damage: number) {
    this.damage += Math.max(0, damage);

    if (this.damage > this.maxDmg) {
      this.die();
    }
  }

  tryShoot(shootDist: number) {
    if (shootDist == null) shootDist = 100;
    if (shootDist < 20) shootDist = 20;
    if (shootDist > this.maxShootRange) shootDist = this.maxShootRange;

    if (this.shootCooldown > 0) {
      // can't shoot, waiting on cooldown
      return;
    }

    this.wannaShoot = true;
    this.currShootDist = shootDist;
    this.shootCooldown = this.shootRate;
  }

  checkWannaShoot(timeDelta) {
    if (this.wannaShoot) {
      this.wannaShoot = false;
      this.shoot(timeDelta);
    }
  }

  shoot(timeDelta) {
    let dist = this.currShootDist;
    this.currShootDist = null;

    const cball = this.game.spawnCannonball(this, {});

    cball.phys.vspeed = dist / 150;

    const a = cball.phys.gravity;
    const b = cball.phys.vspeed;
    const c = cball.phys.height - this.game.waterLevel * 2;
    const airtime = (a * Math.sqrt(4 * a * c + b * b) + b) / (2 * a);
    //console.log(dist, airtime);
    dist =
      dist - this.pos.clone().subtract(this.cannonballSpawnSpot()).length();
    const targSpeed = (dist / airtime) * timeDelta;
    cball.phys.vel = cball.phys.vel.norm().multiply(Vec2(targSpeed, targSpeed));
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

  get maxShootRange() {
    // TODO: depend on ship makeup
    return 500;
  }

  get lateralCrossSection() {
    // TODO: depend on ship makeup
    return 2;
  }

  get steerForce() {
    return ((0.2 + this.vel.length) * Math.PI) / 6;
  }

  steer(deltaTime, angleTarg) {
    let angOffs = angDiff(this.angle, angleTarg);
    const steerForce = this.steerForce;
    const steerCompensate = angDiff(
      umod(this.angle + this.phys.angVel, Math.PI * 2),
      angleTarg,
    );
    angOffs += steerCompensate;

    if (Math.abs(angOffs) > steerForce) {
      angOffs = steerForce * Math.sign(angOffs);
    }

    this.phys.angVel += angOffs * deltaTime;
  }

  steerToward(deltaTime, otherPos) {
    const angleTarg = otherPos.clone().subtract(this.pos).angle();
    this.steer(angleTarg);
  }

  thrustForward(deltaTime, amount) {
    if (amount > 1) {
      amount = 1;
    } else if (amount < -1) {
      amount = -1;
    }

    const thrust = this.thrust * amount;
    this.phys.applyForce(
      deltaTime,
      Vec2(1, 0).rotateBy(this.angle).multiply(Vec2(thrust, thrust)),
    );
  }

  heightGradient(game) {
    return this.game.terrain.gradientAt(this.pos.x, this.pos.y);
  }

  nearShip(ship) {
    const r1 = this.size * this.lateralCrossSection;
    const r2 = ship.size * ship.lateralCrossSection;

    const dist = this.pos.clone().subtract(ship.pos).length();

    return dist <= r1 + r2;
  }

  intermediaryRadius(angle) {
    angle = ((angle - this.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (
      (this.size * this.size * this.lateralCrossSection) /
      Math.sqrt(
        Math.pow(this.size * this.lateralCrossSection, 2) *
          Math.pow(Math.sin(angle), 2) +
          Math.pow(this.size, 2) * Math.pow(Math.cos(angle), 2),
      )
    );
  }

  touchingShip(ship) {
    if (!this.nearShip(ship)) {
      return 0;
    }

    const angle1 = ship.pos.clone().subtract(this.pos).angle();
    const angle2 = this.pos.clone().subtract(ship.pos).angle();

    const r1 = this.intermediaryRadius(angle1);
    const r2 = ship.intermediaryRadius(angle2);

    const dist = this.pos.clone().subtract(ship.pos).length();

    if (dist > r1 + r2) {
      return 0;
    }

    return r1 + r2 - dist;
  }

  checkShipCollision(deltaTime, ship) {
    const closeness = this.touchingShip(ship);
    if (closeness <= 0) {
      return;
    }

    const offs = this.pos.clone().subtract(ship.pos);
    offs.multiply(Vec2(deltaTime, deltaTime));

    const offsNorm = offs.clone().normalize();

    this.phys.applyForce(deltaTime * 5, offs.clone());
    ship.phys.applyForce(deltaTime * 5, offs.clone().invert());
    ship.setInstigator(this);
    this.damageShip(
      closeness * 10 * deltaTime * offsNorm.clone().dot(ship.vel),
    );
    ship.damageShip(
      closeness * 10 * deltaTime * offsNorm.invert().dot(this.vel),
    );
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
    });
  }

  checkTerrainDamage(deltaTime) {
    if (this.phys.floor > this.game.waterLevel) {
      this.damageShip(10 * deltaTime);
    }
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

  cannonballSpawnSpot() {
    return this.pos
      .clone()
      .add(
        Vec2(this.size * this.lateralCrossSection * 0.4, 0).rotateBy(
          this.angle,
        ),
      );
  }

  tick(deltaTime) {
    this.cooldownCannons(deltaTime);
    this.checkWannaShoot(deltaTime);
    this.checkShipCollisions(deltaTime);
    this.checkTerrainDamage(deltaTime);
    this.pruneDeadInstigator();
  }
}
