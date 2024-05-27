import Vec2 from "victor";
import { angDiff, umod, lerp } from "../util";
import type { PhysicsObject, PhysicsParams } from "./physics.ts";
import { ObjectRenderInfo } from "../render";
import { CashPickup, CashPickupParams } from "./cash";
import { PlayState } from "../superstates/play";
import { Game } from "../game";
import { Engine, ShipMake, ShipMakeup, Cannon } from "./shipmakeup";
import { ShipItem } from "../inventory";
import { ItemPickup, ItemPickupParamType, DebugPickup } from "./pickup";
import { DEFAULT_MAKE, MAKEDEFS } from "../shop/makedefs";
import random from "random";
import { iter } from "iterator-helper";

const DEBUG_DRAW = false;
const DEBUG_COLL = false;

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
  return iter(soup)
    .map<{ circle: CollisionCircle; dist: number }>((c) => ({
      circle: c,
      dist: circleCentreDist(c, target),
    }))
    .reduce<{ circle: CollisionCircle; dist: number }>((a, b) =>
      a.dist < b.dist ? a : b,
    );
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
    this.phys = (<PlayState>game.state).makePhysObj(
      pos || new Vec2(0, 0),
      params,
    );
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
    this.setMoney(
      params.money != null
        ? params.money
        : random.uniform(5, 15)() +
            this.makeup.make.cost * random.uniform(0.008, 0.08)(),
    );

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
        1 - Math.abs(new Vec2(1, 0).rotateBy(this.angle).dot(this.vel.norm()));
      const cs = 1 + (alpha * this.lateralCrossSection) / this.size;
      return this.phys.baseDrag * cs;
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

      const cannonball = cannon.shoot(deltaTime, this, shootDist);
      if (cannonball != null) {
        this.phys.applyForce(null, cannonball.phys.vecMomentum().invert());
      }
      return true;
    });
  }

  get angNorm() {
    return this.phys.angNorm;
  }

  isVisible(info: ObjectRenderInfo) {
    const pos = this.pos.clone().subtract(info.cam).multiply(info.scaleVec);
    const edge = this.size * this.lateralCrossSection;

    return (
      pos.x > -edge &&
      pos.x < info.width + edge &&
      pos.y > -edge &&
      pos.y < info.height + edge
    );
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
    const proximityScale = camheight / new Vec2(hdist, cdist).length();
    const scale = proximityScale * info.scale;
    const size = this.size * scale;
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
    const to = new Vec2(this.size * this.lateralCrossSection * scale, 0)
      .rotateBy(this.angle)
      .add(drawPos);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    if (DEBUG_DRAW) {
      const from = this.pos
        .clone()
        .add(
          new Vec2(this.size * this.lateralCrossSection, 0).rotateBy(
            this.angle,
          ),
        );
      const fromDraw = info.base
        .clone()
        .add(from.clone().subtract(info.cam).multiplyScalar(scale));
      const angmom = this.phys.orbitalVelocityAt(from).multiplyScalar(scale);

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
      const vto = this.vel.multiplyScalar(scale * 10).add(fromDraw);
      ctx.lineTo(vto.x, vto.y);
      ctx.stroke();

      // Draw collision circles
      const circles = this.collisionCircles();

      ctx.strokeStyle = "#0f0c";
      ctx.lineWidth = 1.5;
      for (const circle of circles) {
        const center = info.base
          .clone()
          .add(circle.center.clone().subtract(info.cam).multiplyScalar(scale));
        const size = circle.radius * scale;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, size, size, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
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

  private pickupParams(): Partial<PhysicsParams> {
    return {
      vel: this.vel.add(
        Vec2(0.3, 0).rotateBy(random.uniform(0, Math.PI * 2)()),
      ),
      vspeed: 0.5,
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
        Math.random() >
          item.dropChance * (item.amount != null ? item.amount : 1)
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
      .map((e) => e.thrust * (1 - e.damage / 2 / e.maxDamage))
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
    this.phys.applyForce(deltaTime, new Vec2(thrust, 0).rotateBy(this.angle));
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

  boundaryPoint(angle) {
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

    const closest = iter(circles1)
      .flatMap<CircleColInfo>((c1) =>
        iter(circles2).map<CircleColInfo>((c2) => ({
          circle1: c1,
          circle2: c2,
          dist: circleDist(c1, c2),
        })),
      )
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

    return iter
      .range(-numCircles + 1, numCircles)
      .map((num: number): CollisionCircle => {
        const alpha = num / Math.max(1, numCircles - 1);
        const off = maxOff * alpha;
        return {
          center: new Vec2(off, 0).rotate(this.angle).add(this.pos),
          radius: lerp(this.size, edge, Math.abs(alpha)),
        };
      })
      .toArray();
  }

  checkShipCollision(deltaTime, ship) {
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
    const force = dir.clone().add(ship.pos.clone().subtract(this.pos).norm()).multiplyScalar(colEnergy / 2).add(angMom);
    
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

    ship.setInstigator(this);
    this.setInstigator(ship);

    this.damageShip(
      Math.sqrt(ship.phys.kineticEnergyRelativeTo(this.phys)) * directionality * 0.2,
    );
    ship.damageShip(
      Math.sqrt(this.phys.kineticEnergyRelativeTo(ship.phys)) * directionality * 0.2,
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
      this.damageShip(1000 * deltaTime);
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
    return this.makeup.totalWeight();
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
