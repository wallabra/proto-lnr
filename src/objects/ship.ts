import Vec2 from "victor";
import { Cannonball } from "./cannonball";
import { angDiff, umod } from "../util";
import type { PhysicsObject, PhysicsParams } from "./physics.ts";
import { ObjectRenderInfo } from "../render";
import CashPickup, { CashPickupParams } from "./cash";
import { PlayState } from "../superstates/play";
import { Game } from "../game";
import { Cannon, ShipMakeup } from "./shipmakeup";

const DEBUG_DRAW = false;

export interface ShipParams extends PhysicsParams {
  money: number;
  damage: number;
}

export class Ship {
  game: Game;
  phys: PhysicsObject;
  dying: boolean;
  lastInstigator: Ship | null;
  lastInstigTime: number | null;
  currShootDist: number | null;
  killScore: number;
  money: number;
  makeup: ShipMakeup;
  
  get play(): PlayState {
    return <PlayState>this.game.state;
  }
  
  get damage(): number {
    return this.makeup.hullDamage;
  }

  constructor(game: Game, pos: Vec2, makeup: ShipMakeup, params?: Partial<ShipParams>) {
    if (params == null) params = {};
    if (params.size == null) params.size = 14;
    if (params.baseFriction == null) params.baseFriction = 0.005;

    this.game = game;
    this.phys = (<PlayState>game.state).makePhysObj(pos || Vec2(0, 0), params);
    //this.damage = params.damage != null ? params.damage : 0;
    this.makeup = makeup;
    this.dying = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;
    this.money =
      params.money != null ? params.money : 100 + Math.random() * 400;

    this.dragMixin();
  }

  dragMixin() {
    this.phys.waterDrag = function () {
      const alpha =
        1 - Math.abs(Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()));
      const cs = 1 + (alpha * this.lateralCrossSection) / this.size;
      return this.phys.baseDrag * cs;
    }.bind(this);
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
      this.lastInstigTime != null &&
      instigTime - this.lastInstigTime < 1000 * this.instigMemory
    ) {
      return;
    }
    this.lastInstigator = instigator;
    this.lastInstigTime = instigTime;
  }

  damageShip(damage: number) {
    this.damage += Math.max(0, damage);

    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.damage = this.damage;
    }

    if (this.damage > this.maxDmg) {
      this.die();
    }
  }

  get isPlayer() {
    return this.game.player != null && this.game.player.possessed === this;
  }

  tryShoot(shootDist: number) {
    if (shootDist == null) shootDist = 100;
    if (shootDist < 20) shootDist = 20;
    
    const cannon = this.makeup.nextReadyCannon;

    if (cannon == null) {
      return false;
    }

    return cannon.shoot(this, shootDist);
  }

  get angNorm() {
    return this.phys.angNorm;
  }

  render(info: ObjectRenderInfo) {
    const ctx = info.ctx;
    const drawScale = this.game.drawScale;

    const drawPos = info.base
      .clone()
      .add(this.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.smallEdge) * 0.5;
    const hdist = camheight - this.height / 2;
    const proximityScale = camheight / Vec2(hdist + cdist).length();
    const size = this.size * proximityScale * info.scale;
    const isPlayer = this.isPlayer;

    if (hdist < 0.1) {
      return;
    }

    const hoffs = this.height * 20 + this.phys.size / 2.5;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(this.phys.floor, this.play.waterLevel) * 20,
    );

    // Draw shadow
    ctx.fillStyle = "#0008";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y + shoffs,
      size * this.lateralCrossSection,
      size,
      this.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    // Draw body
    ctx.fillStyle = isPlayer ? "#227766" : "#4a1800";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y,
      size * this.lateralCrossSection,
      size,
      this.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    ctx.fillStyle = isPlayer ? "#115533" : "#331100";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y,
      size * this.lateralCrossSection * 0.8,
      size * 0.8,
      this.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    // Draw forward direction
    ctx.strokeStyle = "#08080830";
    ctx.beginPath();
    ctx.moveTo(drawPos.x, drawPos.y);
    const to = Vec2(this.size * this.lateralCrossSection)
      .rotateBy(this.angle)
      .add(drawPos);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw velocity
    if (DEBUG_DRAW) {
      ctx.strokeStyle = "#00f";
      ctx.beginPath();
      ctx.moveTo(drawPos.x, drawPos.y);
      const vto = this.vel.multiply(Vec2(20, 20)).add(drawPos);
      ctx.lineTo(vto.x, vto.y);
      ctx.stroke();
    }

    // Draw damage bar
    const maxDmg = this.maxDmg;
    let dmgAlpha = this.damage / maxDmg;

    if (dmgAlpha > 1) {
      dmgAlpha = 1;
    }

    dmgAlpha = 1 - dmgAlpha;

    if (dmgAlpha < 1) {
      ctx.fillStyle = "#33AA0088";
      ctx.fillRect(
        drawPos.x - 50 * drawScale,
        drawPos.y - this.size * drawScale - 30 * drawScale,
        100 * dmgAlpha * drawScale,
        3,
      );
      ctx.fillStyle = "#00000088";
      ctx.fillRect(
        drawPos.x - 50 * drawScale + 100 * dmgAlpha * drawScale,
        drawPos.y - this.size * drawScale - 30 * drawScale,
        100 * drawScale * (1 - dmgAlpha),
        3,
      );
    }
  }

  setMoney(money) {
    this.money = money;
    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.money = this.money;
    }
  }

  giveMoney(money) {
    this.setMoney(money + this.money);
  }

  dropCash() {
    this.play.spawn<CashPickup, CashPickupParams>(CashPickup, this.pos, {
      cash: this.money,
    });
    this.setMoney(0);
  }

  dropItems() {
    // TODO: drop items once those are implemented
  }

  spawnDrops() {
    this.dropCash();
    this.dropItems();
  }

  shotAirtime(cball?: Cannonball) {
    let tempCball = false;
    if (cball == null) {
      cball = this.play.spawnCannonball(this);
      tempCball = true;
    }
    const a = cball.phys.gravity / 2;
    const b = cball.phys.vspeed;
    const c = cball.phys.height - this.play.waterLevel * 2;
    const airtime = (a * Math.sqrt(4 * a * c + b * b) + b) / (2 * a);
    if (tempCball) {
      cball.destroy();
    }
    return airtime;
  }

  get shootRate() {
    return this.makeup.shootRate;
  }

  get maxDmg() {
    return this.makeup.make.maxDamage;
  }

  die() {
    // TODO: trigger death FX
    this.spawnDrops();
    this.dying = true;
    this.phys.dying = true;
  }

  get thrust() {
    // TODO: depend on ship makeup
    return 0.7;
  }

  get maxShootRange() {
    return this.makeup.maxShootRange;
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
    this.steer(deltaTime, angleTarg);
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

  heightGradient() {
    if (this.play.terrain == null) return Vec2(0, 0);
    return this.play.terrain.gradientAt(this.pos.x, this.pos.y);
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
    this.setInstigator(ship);
    this.damageShip(
      closeness * 10 * deltaTime * offsNorm.clone().dot(ship.vel),
    );
    ship.damageShip(
      closeness * 10 * deltaTime * offsNorm.invert().dot(this.vel),
    );
  }

  checkShipCollisions(deltaTime) {
    for (const ship of this.play.tickables) {
      if (!(ship instanceof Ship)) {
        continue;
      }

      if (ship === this) {
        break;
      }

      this.checkShipCollision(deltaTime, ship);
    }
  }

  checkTerrainDamage(deltaTime) {
    if (this.phys.floor > this.play.waterLevel) {
      this.damageShip(10 * deltaTime);
    }
  }

  pruneDeadInstigator() {
    if (this.lastInstigator != null && this.lastInstigator.dying) {
      this.lastInstigator = null;
      this.lastInstigTime = null;
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
    this.checkShipCollisions(deltaTime);
    this.checkTerrainDamage(deltaTime);
    this.pruneDeadInstigator();
  }
}
