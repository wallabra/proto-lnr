import Vec2 from "victor";
import { angDiff, umod, lerp } from "../util";
import type { PhysicsObject, PhysicsParams } from "./physics.ts";
import { ObjectRenderInfo } from "../render";
import { CashPickup, CashPickupParams } from "./cash";
import { PlayState } from "../superstates/play";
import { Game } from "../game";
import {
  Engine,
  ShipMake,
  ShipMakeup,
  Cannon,
  SMOKE_COLORS,
} from "./shipmakeup";
import { ShipItem } from "../inventory";
import { ItemPickup, ItemPickupParamType, DebugPickup } from "./pickup";
import { DEFAULT_MAKE, MAKEDEFS } from "../shop/makedefs";
import random from "random";
import { pickByRarity } from "../shop/rarity";
import { Wave } from "./fx/wave";
import { Smoke } from "./fx/smoke";

const DEBUG_DRAW = false;
const DEBUG_COLL = false;

const ENGINE_SFX_BY_TYPE = {
  coal: "engine_coal",
  diesel: "engine_diesel",
};

export interface ShipParams extends PhysicsParams {
  money: number;
  damage: number;
  makeup: ShipMakeup | "default";
  make?: ShipMake | "random";
  name?: string;
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

export interface CollisionCircle {
  center: Vec2;
  radius: number;
}

export function circleIntersects(
  circle1: CollisionCircle,
  circle2: CollisionCircle,
): boolean {
  return circleDist(circle1, circle2) < 0;
}

export function circleDist(
  circle1: CollisionCircle,
  circle2: CollisionCircle,
): number {
  return circleCentreDist(circle1, circle2) - circle1.radius - circle2.radius;
}

export function circleCentreDist(
  circle1: CollisionCircle,
  circle2: CollisionCircle,
): number {
  return circle1.center.clone().subtract(circle2.center).length();
}

export function closestCircle(
  soup: CollisionCircle[],
  target: CollisionCircle,
): { circle: CollisionCircle; dist: number } {
  return soup
    .map<{ circle: CollisionCircle; dist: number }>((c) => ({
      circle: c,
      dist: circleCentreDist(c, target),
    }))
    .reduce<{ circle: CollisionCircle; dist: number }>(
      (a, b) => (a.dist < b.dist ? a : b),
      { circle: null, dist: Infinity },
    );
}

class ShipRenderContext {
  ship: Ship;
  ctx: CanvasRenderingContext2D;
  drawPos: Vec2;
  info: ObjectRenderInfo;
  shoffs: number;
  hoffs: number;
  scale: number;
  size: number;
  isPlayer: boolean;
  isPlayerFleet: boolean;
  drawScale: number;
  game: Game;

  constructor(ship: Ship) {
    this.ship = ship;
  }

  update(info: ObjectRenderInfo) {
    const { ship } = this;
    this.info = info;
    this.ctx = info.ctx;

    this.drawScale = (this.game = ship.game).drawScale;

    const drawPos = info.base
      .clone()
      .add(ship.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.largeEdge) * 0.5;
    const hdist = camheight - ship.height / 2;
    const proximityScale = camheight / new Vec2(hdist, cdist).length();
    const scale = proximityScale * info.scale;
    const size = ship.size * scale;
    const isPlayer = ship.isPlayer;
    const isPlayerFleet = ship.following && ship.following.isPlayer;

    if (hdist < 0.1) {
      return;
    }

    const hoffs = ship.height * 20 + ship.phys.size / 2.5;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(ship.phys.floor, ship.play.waterLevel) * 20,
    );

    Object.assign(this, {
      isPlayer,
      isPlayerFleet,
      scale,
      size,
      drawPos,
      hoffs,
      shoffs,
    });
  }

  drawBody() {
    const { ctx, drawPos, ship, isPlayer, isPlayerFleet, scale, size, shoffs } =
      this;

    // Draw shadow
    ctx.fillStyle = "#0008";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y + shoffs,
      size * ship.lateralCrossSection,
      size,
      ship.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    // Draw body
    ctx.fillStyle = isPlayer
      ? "#227766"
      : isPlayerFleet
        ? "#224410"
        : "#4a1800";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y,
      size * ship.lateralCrossSection,
      size,
      ship.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    ctx.fillStyle = isPlayer
      ? "#115533"
      : isPlayerFleet
        ? "#113300"
        : "#331100";
    ctx.beginPath();
    ctx.ellipse(
      drawPos.x,
      drawPos.y,
      size * ship.lateralCrossSection * 0.8,
      size * 0.8,
      ship.angle,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    // Draw forward direction
    ctx.strokeStyle = "#08080840";
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(drawPos.x, drawPos.y);
    const to = new Vec2(ship.size * ship.lateralCrossSection * scale, 0)
      .rotateBy(ship.angle)
      .add(drawPos);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  drawName() {
    const { ctx, drawPos, ship } = this;
    const namePos = drawPos
      .clone()
      .addScalarY(ship.size * ship.lateralCrossSection + 15);
    const name = ship.makeup.name;

    ctx.font = "bold 12px sans-serif";
    const { width } = ctx.measureText(name);

    ctx.fillStyle = "#0004";
    ctx.fillRect(namePos.x - width / 2 - 7, namePos.y - 9, width + 14, 18);

    ctx.fillStyle = "#ffdc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, namePos.x, namePos.y);
  }

  drawDamageBar() {
    const { ctx, drawPos, ship, drawScale } = this;

    const maxDmg = ship.maxDmg;
    let dmgAlpha = ship.damage / maxDmg;

    if (dmgAlpha > 1) {
      dmgAlpha = 1;
    }

    dmgAlpha = 1 - dmgAlpha;

    if (dmgAlpha >= 1) return;

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

  drawDebug() {
    const { ctx, info, ship, scale } = this;

    const from = ship.pos
      .clone()
      .add(
        new Vec2(ship.size * ship.lateralCrossSection, 0).rotateBy(ship.angle),
      );
    const fromDraw = info.base
      .clone()
      .add(from.clone().subtract(info.cam).multiplyScalar(scale));
    const angmom = ship.phys.orbitalVelocityAt(from).multiplyScalar(scale);

    // Draw angular velocity
    ctx.strokeStyle = "#fa09";
    ctx.beginPath();
    ctx.moveTo(fromDraw.x, fromDraw.y);
    ctx.lineTo(fromDraw.x + angmom.x, fromDraw.y + angmom.y);
    ctx.stroke();

    // Draw velocity
    ctx.strokeStyle = "#06fc";
    ctx.beginPath();
    ctx.moveTo(fromDraw.x, fromDraw.y);
    const vto = ship.vel.multiplyScalar(scale * 10).add(fromDraw);
    ctx.lineTo(vto.x, vto.y);
    ctx.stroke();

    // Draw collision circles
    const circles = ship.collisionCircles();

    ctx.strokeStyle = "#0f0c";
    ctx.lineWidth = 1.5;
    for (const circle of circles) {
      const center = info.base
        .clone()
        .add(circle.center.clone().subtract(info.cam).multiplyScalar(scale));
      const size = circle.radius * scale;
      ctx.beginPath();
      ctx.arc(center.x, center.y, size, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCannon(cannon: Cannon, offs: Vec2) {
    const { ctx, ship, drawPos, scale } = this;
    const width = (0.1 + scale * cannon.caliber) / 2;
    const length = (width * (0.4 * Math.PI)) / cannon.spread;
    const maxCooldownOffs = -(length * 0.3);
    const cooldownOffs = (maxCooldownOffs * cannon.cooldown) / cannon.shootRate;

    ctx.save();
    ctx.translate(drawPos.x, drawPos.y);
    ctx.rotate(ship.angle);
    ctx.scale(scale, scale);
    ctx.translate(
      offs.x * (ship.size + ship.lateralCrossSection),
      offs.y * ship.size,
    );
    ctx.fillStyle = "#002";
    ctx.fillRect(
      cooldownOffs,
      -width * 0.3,
      maxCooldownOffs - cooldownOffs,
      width * 0.6,
    );
    ctx.fillRect(cooldownOffs, -width, length, width * 2);
    ctx.fillStyle = "#578";
    ctx.fillRect(cooldownOffs, width * 0.5, length, width * 0.5);
    ctx.restore();
  }

  drawCannons() {
    const cannons = this.ship.makeup.getPartsOf("cannon") as Cannon[];

    cannons.forEach((cannon, idx) => {
      this.drawCannon(
        cannon,
        new Vec2(
          lerp(
            0.3,
            1.0,
            cannons.length <= 1
              ? 1.0
              : 1.0 -
                  Math.abs(idx - (cannons.length - 1) / 2) /
                    (cannons.length - 1) /
                    2,
          ),
          lerp(
            -0.6,
            0.6,
            cannons.length <= 1 ? 0.5 : idx / (cannons.length - 1),
          ),
        ),
      );
    });
  }

  drawCrosshair(cannon: Cannon) {
    const { ctx, ship, isPlayer, info, game } = this;

    if (!isPlayer) return;

    const available = cannon != null && cannon.cooldown <= 0;

    const mouseDist = game.mouse.pos.length();
    const shootDist = Math.min(mouseDist, ship.maxShootRange ?? Infinity);
    const shootPos = info.toScreen(cannon.hitLocation(ship, shootDist));
    const shootRadius =
      cannon == null ? 0 : Math.tan(cannon.spread) * shootDist * info.scale;

    const color = available ? "#FFFF0008" : "#88000018";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // draw circles
    ctx.beginPath();
    ctx.arc(shootPos.x, shootPos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill();

    ctx.lineWidth = 1.2 * cannon.caliber;
    ctx.beginPath();
    ctx.arc(shootPos.x, shootPos.y, shootRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(shootPos.x, shootPos.y, shootRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(shootPos.x, shootPos.y, shootRadius, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawCrosshairs() {
    const { ship } = this;

    const cannon = ship.makeup.nextReadyCannon;

    if (cannon == null) return;
    this.drawCrosshair(cannon);
  }

  draw(info: ObjectRenderInfo) {
    if (!this.ship.isVisible(info)) return;

    this.update(info);
    this.drawBody();
    this.drawCannons();
    this.drawDamageBar();
    this.drawName();
    this.drawCrosshairs();

    if (DEBUG_DRAW) {
      this.drawDebug();
    }
  }
}

const CHASE_LOCK_RANGE = Math.pow(1200, 2);

export class Ship {
  game: Game;
  phys: PhysicsObject;
  dying: boolean;
  lastInstigator: Ship | null;
  chasers: Set<Ship> = new Set();
  lastInstigTime: number | null;
  currShootDist: number | null;
  killScore: number;
  money: number;
  makeup: ShipMakeup;
  tickActions: Array<TickAction<unknown>>;
  drawer: ShipRenderContext;
  lastWave: number;
  lastSmoke: number;
  lastEngineSound: number;
  following: Ship = null;
  alliance: Set<Ship> = new Set([this]);
  followers: Set<Ship> = new Set();

  follow(other: Ship) {
    if (this.following != null) this.unfollow();
    other.followers.add(this);
    this.following = other;
  }

  unfollow() {
    this.following.followers.delete(this);
    this.following = null;
  }

  ally(other: Ship) {
    this.alliance = other.alliance = new Set([
      this.following ?? this,
      ...Array.from(this.alliance),
      ...Array.from(other.alliance),
    ]);
  }

  private purgeFromAlliance(other: Ship) {
    this.alliance = new Set(this.alliance);
    this.alliance = new Set(
      Array.from(this.alliance).filter(
        (someone) =>
          someone !== other &&
          someone.following !== other &&
          !someone.followers.has(other),
      ),
    );
    if (other === this.following) this.unfollow();

    for (const friend of Array.from(this.alliance)) {
      friend.purgeFromAlliance(other);
    }
  }

  setInstigator(other: Ship) {
    if (!this.dying) {
      if (
        this.following != null &&
        this.following.lastInstigator != null &&
        this.following.lastInstigator !== other
      )
        return false;

      if (
        this.following != null &&
        this.following === other.following &&
        this.following.isPlayer
      )
        return false;

      if (this.following === other) return false;
      if (this.followers.has(other)) return false;

      if (this.alliance.has(other)) {
        if (Math.random() < 0.3) {
          this.purgeFromAlliance(other);
          other.purgeFromAlliance(this);
        } else return false;
      }

      for (const follower of Array.from(this.followers)) {
        follower.setInstigator(other);
      }

      if (
        this.following != null &&
        this.following.lastInstigator == null &&
        Math.random() < 0.3
      ) {
        this.following.aggro(other);
      }

      for (const otherFollower of Array.from(other.followers)) {
        otherFollower.setInstigator(this);
      }
    }
    
    if (this.lastInstigator != null) {
      this.lastInstigator.chasers.delete(this);
    }
    
    this.lastInstigator = other;

    if (other != null) {
      this.lastInstigator.chasers.add(this);
      this.lastInstigTime = Date.now();
    }

    return true;
  }

  inDanger(): boolean {
    return Array.from(this.chasers).some((chaser) => chaser.phys.pos.distanceSq(this.phys.pos) < CHASE_LOCK_RANGE);
  }

  get play(): PlayState {
    return <PlayState>this.game.state;
  }

  get damage(): number {
    return this.makeup.hullDamage;
  }

  constructor(game: Game, pos: Vec2, params?: Partial<ShipParams>) {
    if (params == null) params = {};
    if (params.size == null) params.size = 14;

    const make: ShipMake =
      (params.make &&
        (params.make === "random" ? pickByRarity(MAKEDEFS) : params.make)) ??
      DEFAULT_MAKE;

    this.game = game;
    this.phys = (<PlayState>game.state).makePhysObj(
      pos || new Vec2(0, 0),
      params,
    );
    const name = (params.name ?? (params.makeup && params.makeup !== "default" && params.makeup.name)) || null;
    this.setMakeup(
      params.makeup === "default"
        ? new ShipMakeup({ name: name, make: make }).defaultLoadout()
        : (params.makeup ?? new ShipMakeup({ name: name, make: make })),
    );
    this.dying = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;
    this.tickActions = [];
    this.setMoney(
      params.money != null
        ? params.money
        : random.uniform(5, 15)() +
            this.makeup.make.cost * random.uniform(0.008, 0.08)(),
    );

    this.dragMixin();
    this.updateWeight();

    this.drawer = new ShipRenderContext(this);
  }

  scoreKill() {
    this.killScore++;

    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.kills++;
    }
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
    this.phys.dragVector = function (this: Ship) {
      const alpha = Math.abs(
        new Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()),
      );
      const res = new Vec2(1 - alpha, alpha * this.lateralCrossSection).rotate(
        this.angle,
      );
      return new Vec2(Math.abs(res.x), Math.abs(res.y));
    }.bind(this);
  }

  maxSpread() {
    return Math.max(
      ...this.makeup
        .getPartsOf("cannon")
        .filter((c) => c.available(this.makeup))
        .map((c) => (<Cannon>c).spread),
    );
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

  aggro(instigator: Ship) {
    const instigTime = Date.now();

    // check reinforced aggression
    if (instigator === this.lastInstigator) {
      this.lastInstigTime = instigTime;
      return;
    }

    // check infight timer
    if (
      !this.isPlayer &&
      this.lastInstigTime != null &&
      instigTime - this.lastInstigTime < 1000 * this.instigMemory
    ) {
      return;
    }

    this.setInstigator(instigator);
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

    return this.nextTick(() => {
      const cannon = this.makeup.readyCannon;

      if (cannon == null) {
        return false;
      }

      const cannonball = cannon.shoot(this, shootDist);
      if (cannonball != null) {
        this.phys.applyForce(
          0.1,
          cannonball.vel.subtract(this.vel).multiplyScalar(cannonball.weight),
        );
        this.phys.playSound("shotbase", 1.0);
        // sigmoidal
        this.phys.playSound(
          "shotbigness",
          0.1 + 0.9 * (1 / Math.exp(1 - cannonball.size / 5)),
        );
      }
      return true;
    });
  }

  get angNorm() {
    return this.phys.angNorm;
  }

  isVisible(info: ObjectRenderInfo) {
    const pos = info.base
      .clone()
      .add(this.pos.clone().subtract(info.cam).multiplyScalar(info.scale));
    const edge = this.size * this.lateralCrossSection;

    return (
      pos.x > -edge &&
      pos.x < info.width + edge &&
      pos.y > -edge &&
      pos.y < info.height + edge
    );
  }

  render(info: ObjectRenderInfo) {
    this.drawer.draw(info);
  }

  setMoney(money: number) {
    this.money = money;
    if (
      this.game.player != null &&
      [this, this.following].indexOf(this.game.player.possessed) != -1
    ) {
      this.game.player.money = this.game.player.fleet
        .filter((m) => m.ship != null)
        .reduce((a, b) => a + b.ship.money, 0);
    }
  }

  giveMoney(money: number) {
    this.setMoney(money + this.money);
  }

  private pickupSpawnPos() {
    return this.pos
      .clone()
      .add(
        new Vec2(Math.random() * this.size * 0.8, 0).rotateBy(
          Math.random() * Math.PI * 2,
        ),
      );
  }

  private pickupParams(): Partial<PhysicsParams> {
    return {
      vel: this.vel.add(
        new Vec2(15, 0).rotateBy(random.uniform(0, Math.PI * 2)()),
      ),
      vspeed: 0.7,
      height: this.height + 0.1,
    };
  }

  dropCash() {
    this.play.spawn<CashPickup, CashPickupParams>(
      CashPickup,
      this.pickupSpawnPos(),
      {
        cash: this.money,
        ...this.pickupParams(),
      },
    );
    this.setMoney(0);
  }

  dropItems() {
    for (const item of this.makeup.inventory.items) {
      this.makeup.inventory.removeItem(item);
      if (
        item.dropChance != null &&
        Math.random() > item.dropChance * (item.amount ?? 1)
      )
        continue;
      if (item.amount != null)
        item.amount = Math.ceil(item.amount * Math.random());
      this.spawnDroppedItem(item);
    }
  }

  spawnDroppedItem<I extends ShipItem>(item: I) {
    this.play.spawn<ItemPickup<I>, ItemPickupParamType<I>>(
      ItemPickup,
      this.pickupSpawnPos(),
      {
        item: item,
        ...this.pickupParams(),
      },
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
    this.setInstigator(null);
    this.phys.playSound("shipdeath", 1.0);

    const playerFleetIndex = this.play.player.fleet.findIndex(
      (member) => member.makeup === this.makeup,
    );
    if (playerFleetIndex !== -1) {
      this.play.player.fleet.splice(playerFleetIndex, 1);
    }
  }

  get maxShootRange() {
    return this.makeup.maxShootRange;
  }

  get lateralCrossSection() {
    return this.makeup.make.lateralCrossSection;
  }

  get steerForce() {
    return ((0.4 + this.vel.length()) * Math.PI) / 6;
  }

  steer(deltaTime: number, angleTarg: number) {
    let angOffs = angDiff(this.angle, angleTarg);
    const steerForce = this.steerForce;
    const steerCompensate = angDiff(
      umod(
        this.angle +
          (this.phys.angVel * (1 - Math.exp(-this.phys.angleDrag * 2))) /
            this.phys.angleDrag,
        Math.PI * 2,
      ),
      angleTarg,
    );
    angOffs += steerCompensate;

    if (Math.abs(angOffs) > steerForce) {
      angOffs = steerForce * Math.sign(angOffs);
    }

    this.phys.angVel += angOffs * deltaTime;
  }

  steerToward(deltaTime: number, otherPos: Vec2) {
    const angleTarg = otherPos.clone().subtract(this.pos).angle();
    this.steer(deltaTime, angleTarg);
  }

  maxEngineThrust(enginesList?: Engine[]) {
    return this.makeup.maxEngineThrust(enginesList);
  }

  thrustForward(deltaTime: number, amount: number) {
    if (amount > 1) {
      amount = 1;
    } else if (amount < -1) {
      amount = -1;
    }

    const engines = this.makeup.getReadyEngines();
    const engineThrust = this.maxEngineThrust();

    engines.forEach((e) => {
      this.spawnSmokeFor(e, amount);
      this.playEngineSound(e, amount);
      if (e.fuelType)
        this.makeup.spendFuel(
          e.fuelType,
          Math.abs(amount) * deltaTime * e.fuelCost,
        );
    });

    const thrust = engineThrust * amount;
    this.phys.applyForce(deltaTime, new Vec2(thrust, 0).rotate(this.angle));
  }

  spawnSmokeFor(engine: Engine, factor: number = 1.0) {
    const color = SMOKE_COLORS[engine.fuelType] || null;
    const amount = Math.abs(factor * engine.thrust);

    if (color == null) return;

    if (
      this.lastSmoke != null &&
      this.phys.age <
        this.lastSmoke + 0.25 + Math.max(0, Math.exp(-amount / 14000))
    )
      return;
    if (Math.random() * this.makeup.getPartsOf("engine").length > 1) return;

    this.lastSmoke = this.phys.age;
    this.play.spawnArgs(Smoke, this, color, 0.3);
  }
  
  playEngineSound(engine: Engine, factor: number = 1.0) {
    if (!(engine.fuelType in ENGINE_SFX_BY_TYPE)) {
      return;
    }

    const amount = Math.abs(this.phys.vel.length() / 2);

    if (
      this.lastEngineSound != null &&
      this.phys.age <
        this.lastEngineSound + 0.06 + 0.15 / (1 + Math.exp(-amount))
    )
      return;
    if (Math.random() * this.makeup.getPartsOf("engine").length > 1) return;

    // sigmoidal volume
    this.lastEngineSound = this.phys.age;
    const ssrc = this.phys.playSound(      
      ENGINE_SFX_BY_TYPE[engine.fuelType],
      0.02 + 0.1 / (1 + Math.exp(1 - 7 * factor)),
    );
    ssrc.rate(0.6 + 2.2 / (1 + Math.exp(-amount / 2.5)));
  }

  heightGradient() {
    if (this.play.terrain == null) return new Vec2(0, 0);
    return this.play.terrain.gradientAt(this.pos.x, this.pos.y);
  }

  nearShip(ship: Ship) {
    const r1 = this.size * this.lateralCrossSection;
    const r2 = ship.size * ship.lateralCrossSection;

    const dist = this.pos.clone().subtract(ship.pos).length();

    return dist <= r1 + r2;
  }

  intermediaryRadius(angle: number) {
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

  boundaryPoint(angle: number) {
    return this.pos.add(
      new Vec2(this.intermediaryRadius(angle), 0).rotateBy(angle),
    );
  }

  collisionWithCircle(circles2: CollisionCircle[]) {
    interface CircleColInfo {
      circle1: CollisionCircle;
      circle2: CollisionCircle;
      dist: number;
    }
    const circles1 = this.collisionCircles();

    const closest = circles1
      .map((c1) =>
        circles2.map<CircleColInfo>((c2) => ({
          circle1: c1,
          circle2: c2,
          dist: circleDist(c1, c2),
        })),
      )
      .reduce((a, b) => [...a, ...b], [])
      .reduce((a: CircleColInfo, b: CircleColInfo) =>
        a.dist < b.dist ? a : b,
      );

    const dist = circleDist(closest.circle1, closest.circle2);
    if (dist > 0) return null;
    return {
      dist: dist,
      point: closest.circle1.center
        .clone()
        .add(closest.circle2.center)
        .divideScalar(2),
      circle1: closest.circle1,
      circle2: closest.circle2,
    };
  }

  collision(ship: Ship): {
    dist: number;
    point: Vec2;
    circle1: CollisionCircle;
    circle2: CollisionCircle;
  } | null {
    if (!this.nearShip(ship)) {
      return null;
    }

    const circles2 = ship.collisionCircles();

    return this.collisionWithCircle(circles2);
  }

  collisionCircles(): CollisionCircle[] {
    const numCircles = Math.floor(this.lateralCrossSection * 1.6);
    const edge = this.size * 0.5;
    const maxOff = this.size * this.lateralCrossSection - edge;

    return [...Array(numCircles * 2 - 1).keys()]
      .map((i) => i + 1 - numCircles)
      .map((num: number): CollisionCircle => {
        const alpha = num / Math.max(1, numCircles - 1);
        const off = maxOff * alpha;
        return {
          center: new Vec2(off, 0).rotate(this.angle).add(this.pos),
          radius: lerp(this.size, edge, Math.abs(alpha)),
        };
      });
  }

  checkShipCollision(deltaTime: number, ship: Ship) {
    const collision = this.collision(ship);
    if (collision == null) {
      return;
    }

    const dir = collision.circle2.center
      .clone()
      .subtract(collision.circle1.center)
      .norm();
    const offs = dir.clone().multiplyScalar(collision.dist);
    const relMom = this.phys.vecMomentum().subtract(ship.phys.vecMomentum());
    const colEnergy = relMom.dot(dir.clone().invert());
    const directionality = Math.max(
      0.2,
      this.phys.vel.subtract(ship.phys.vel).norm().dot(dir.clone().invert()),
    );

    //const totalWeight = this.phys.weight + ship.phys.weight;

    const bumpAt = collision.point;
    const angMom = ship.phys
      .orbitalMomentumAt(bumpAt)
      .subtract(this.phys.orbitalMomentumAt(bumpAt));
    const force = dir
      .clone()
      .add(ship.pos.clone().subtract(this.pos).norm())
      .multiplyScalar(colEnergy / 2)
      .add(angMom);

    this.phys.shift(offs);
    ship.phys.shift(offs.invert());

    this.phys.applyTorqueAt(
      null,
      bumpAt,
      force.clone().multiplyScalar(this.phys.restitution),
    );
    ship.phys.applyTorqueAt(
      null,
      bumpAt,
      force.clone().multiplyScalar(-ship.phys.restitution),
    );

    if (DEBUG_COLL) this.play.spawn(DebugPickup, bumpAt, { height: 1.5 });

    this.phys.applyForce(
      null,
      force.clone().multiplyScalar(this.phys.restitution),
    );
    ship.phys.applyForce(
      null,
      force.clone().multiplyScalar(-ship.phys.restitution),
    );

    ship.aggro(this);
    this.aggro(ship);

    this.damageShip(
      ship.phys.kineticEnergyRelativeTo(this.phys) * directionality * 0.0001,
    );
    ship.damageShip(
      this.phys.kineticEnergyRelativeTo(ship.phys) * directionality * 0.0001,
    );
  }

  checkShipCollisions(deltaTime: number) {
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

  checkTerrainDamage(deltaTime: number) {
    if (this.phys.floor > this.play.waterLevel) {
      this.damageShip(1000 * deltaTime);
    }
  }

  pruneDeadPointers() {
    if (this.following != null && this.following.dying) this.following = null;
    for (const friend of Array.from(this.alliance).filter((a) => a.dying))
      this.alliance.delete(friend);
    for (const follower of Array.from(this.followers).filter((a) => a.dying))
      this.followers.delete(follower);
  }

  pruneDeadInstigator() {
    if (this.lastInstigator != null && this.lastInstigator.dying) {
      this.lastInstigator =
        (this.following && this.following.lastInstigator) ?? null;
      this.lastInstigTime =
        this.lastInstigator != null && !this.lastInstigator.dying
          ? Date.now()
          : null;
    }
  }

  cannonballSpawnSpot() {
    return this.pos
      .clone()
      .add(
        new Vec2(this.size * this.lateralCrossSection * 0.4, 0).rotateBy(
          this.angle,
        ),
      );
  }

  shotAirtime(dist: number) {
    const cannon = this.makeup.nextReadyCannon;
    if (cannon == null) return null;
    return cannon.airtime(this, dist);
  }

  computeWeight() {
    return this.makeup.totalWeight();
  }

  private updateWeight() {
    this.phys.weight = this.computeWeight();
  }

  checkSpawnWave() {
    if (this.dying) return;
    if (!this.phys.inWater()) return;

    const cappedSpeed = Math.min(8000, this.vel.lengthSq());

    if (
      this.lastWave != null &&
      this.phys.age <
        this.lastWave + 0.25 + Math.max(0, Math.exp(-cappedSpeed / 4000) * 1.6)
    )
      return;

    this.lastWave = this.phys.age;
    this.play.spawnArgs(Wave, this);

    if (Math.random() < 0.3) this.phys.playSound("waterimpact", 0.1);
  }

  tick(deltaTime: number) {
    if (this.pos.length() > 15000 && !this.isPlayer) {
      // Despawn NPC ships too far from land
      this.dying = true;
      this.phys.dying = true;
      return;
    }
    this.updateWeight();
    this.processTickActions(deltaTime);
    this.makeup.tick(deltaTime, this);
    this.checkShipCollisions(deltaTime);
    this.checkTerrainDamage(deltaTime);
    this.pruneDeadInstigator();
    this.pruneDeadPointers();
    this.makeup.inventory.pruneItems();
    this.checkSpawnWave();
  }
}
