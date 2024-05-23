import Vec2 from "victor";
import { angDiff, umod } from "../util";
import type { PhysicsObject, PhysicsParams } from "./physics.ts";
import { ObjectRenderInfo } from "../render";
import { CashPickup, CashPickupParams } from "./cash";
import { PlayState } from "../superstates/play";
import { Game } from "../game";
import { Engine, ShipMake, ShipMakeup } from "./shipmakeup";
import { ShipItem } from "../inventory";
import { ItemPickup, ItemPickupParamType } from "./pickup";
import { DEFAULT_MAKE, MAKEDEFS } from "../shop/makedefs";
import random from "random";

const DEBUG_DRAW = false;

export interface ShipParams extends PhysicsParams {
  money: number;
  damage: number;
  makeup: ShipMakeup | "default";
  make?: ShipMake | "random";
}

export type TickActionFunction<T> = (deltaTime: number) => T;
export type TickActionCallback<T> = (action: T) => void;

export class TickAction<T> {
  private action: TickActionFunction<T>;
  private result: T;
  private done: boolean;
  private callbacks: Array<TickActionCallback<T>>;

  constructor(action: TickActionFunction<T>) {
    this.action = action;
    this.result = null;
    this.done = false;
    this.callbacks = [];
  }

  isDone() {
    return this.done;
  }

  perform(deltaTime) {
    this.finish(this.action(deltaTime));
  }

  then(callback: TickActionCallback<T>) {
    this.callbacks.push(callback);
    return this;
  }

  finish(result) {
    this.result = result;
    this.done = true;
    this.callbacks.forEach((c) => c(this.result));
  }
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
  tickActions: Array<TickAction<unknown>>;

  get play(): PlayState {
    return <PlayState>this.game.state;
  }

  get damage(): number {
    return this.makeup.hullDamage;
  }

  constructor(game: Game, pos: Vec2, params?: Partial<ShipParams>) {
    if (params == null) params = {};
    if (params.size == null) params.size = 14;
    if (params.baseFriction == null) params.baseFriction = 0.005;

    const make: ShipMake =
      params.make != null
        ? params.make === "random"
          ? random.choice(MAKEDEFS)
          : params.make
        : DEFAULT_MAKE;

    this.game = game;
    this.phys = (<PlayState>game.state).makePhysObj(pos || Vec2(0, 0), params);
    this.setMakeup(
      params.makeup === "default"
        ? new ShipMakeup(make).defaultLoadout()
        : params.makeup != null
          ? params.makeup
          : new ShipMakeup(make),
    );
    this.dying = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;
    this.tickActions = [];
    this.money = params.money != null ? params.money : 30 + Math.random() * 180;

    this.dragMixin();
    this.updateWeight();
  }

  nextTick<T>(action: TickActionFunction<T>): TickAction<T> {
    const actionObj = new TickAction(action);
    this.tickActions.push(actionObj);
    return actionObj;
  }

  processTickActions(deltaTime: number) {
    let action: TickAction<unknown>;
    while ((action = this.tickActions.splice(0, 1)[0])) {
      action.perform(deltaTime);
    }
  }

  setMakeup(makeup: ShipMakeup) {
    this.makeup = makeup;
    this.phys.size = makeup.make.size;
    this.phys.baseDrag = makeup.make.drag;
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
    return this.makeup.make.size;
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
    damage = Math.max(0, damage);
    const die = this.makeup.damageShip(damage);

    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.damage = this.damage;
    }

    if (die) {
      this.die();
    }
  }

  get isPlayer() {
    return this.game.player != null && this.game.player.possessed === this;
  }

  tryShoot(shootDist: number) {
    if (shootDist == null) shootDist = 100;
    if (shootDist < 20) shootDist = 20;

    return this.nextTick((deltaTime) => {
      const cannon = this.makeup.readyCannon;

      if (cannon == null) {
        return false;
      }

      cannon.shoot(deltaTime, this, shootDist);
      return true;
    });
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
    ctx.strokeStyle = "#08080840";
    ctx.lineWidth = 1.75;
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

  private pickupSpawnPos() {
    return this.pos
      .clone()
      .add(
        Vec2(Math.random() * this.size * 0.8, 0).rotateBy(
          Math.random() * Math.PI * 2,
        ),
      );
  }

  dropCash() {
    this.play.spawn<CashPickup, CashPickupParams>(
      CashPickup,
      this.pickupSpawnPos(),
      {
        cash: this.money,
      },
    );
    this.setMoney(0);
  }

  dropItems() {
    for (const item of this.makeup.inventory.items) {
      this.makeup.inventory.removeItem(item);
      if (item.dropChance != null && Math.random() > item.dropChance) continue;
      this.spawnDroppedItem(item);
    }
  }

  spawnDroppedItem<I extends ShipItem>(item: I) {
    this.play.spawn<ItemPickup<I>, ItemPickupParamType<I>>(
      ItemPickup,
      this.pickupSpawnPos(),
      { item: item },
    );
  }

  spawnDrops() {
    this.dropCash();
    this.dropItems();
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

  get maxShootRange() {
    return this.makeup.maxShootRange;
  }

  get lateralCrossSection() {
    return this.makeup.make.lateralCrossSection;
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

  maxEngineThrust(enginesList?: Engine[]) {
    const engines = enginesList || this.makeup.getReadyEngines();
    const engineThrust = engines
      .map((e) => e.thrust)
      .reduce((a, b) => a + b, 0);

    return engineThrust;
  }

  thrustForward(deltaTime, amount) {
    if (amount > 1) {
      amount = 1;
    } else if (amount < -1) {
      amount = -1;
    }

    const engines = this.makeup.getReadyEngines();
    const engineThrust = this.maxEngineThrust();

    engines.forEach((e) => {
      if (e.fuelType)
        this.makeup.spendFuel(
          e.fuelType,
          Math.abs(amount) * deltaTime * e.fuelCost,
        );
    });

    const thrust = engineThrust * amount;
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
    offs.multiply(Vec2(deltaTime * 0.5, deltaTime * 0.5));
    const totalEnergy = this.kineticEnergy() + ship.kineticEnergy();
    const directionality = this.vel
      .subtract(ship.vel)
      .norm()
      .dot(ship.pos.clone().subtract(this.pos).norm());
    const collisionEnergy = totalEnergy * directionality;

    this.pos.add(offs);
    ship.pos.subtract(offs);
    ship.setInstigator(this);
    this.setInstigator(ship);
    this.damageShip(collisionEnergy * 0.3);
    ship.damageShip(collisionEnergy * 0.3);
  }

  kineticEnergy(): number {
    return this.phys.kineticEnergy();
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

  shotAirtime(deltaTime, dist) {
    const cannon = this.makeup.nextReadyCannon;
    if (cannon == null) return null;
    return cannon.airtime(deltaTime, this, dist);
  }

  computeWeight() {
    return (
      this.makeup.make.weight +
      this.makeup.inventory.items
        .map((item) => item.weight * (item.amount || 1))
        .reduce((a, b) => a + b, 0)
    );
  }

  private updateWeight() {
    this.phys.weight = this.computeWeight();
  }

  tick(deltaTime) {
    this.updateWeight();
    this.processTickActions(deltaTime);
    this.makeup.tick(deltaTime);
    this.checkShipCollisions(deltaTime);
    this.checkTerrainDamage(deltaTime);
    this.pruneDeadInstigator();
    this.makeup.inventory.pruneItems();
  }
}
