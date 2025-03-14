import Victor from "victor";
import { angDiff, umod, lerp } from "../util";
import type { PhysicsObject, PhysicsParams } from "./physics.ts";
import type { ObjectRenderInfo, Renderable } from "../render";
import type { CashPickupParams } from "./cash";
import { CashPickup } from "./cash";
import type { PlayState, Tickable } from "../superstates/play";
import type { Game } from "../game";
import type { Engine, ShipMake, Cannon } from "./shipmakeup";
import { ShipMakeup, SMOKE_COLORS } from "./shipmakeup";
import type { ShipItem } from "../inventory";
import type { ItemPickupParamType } from "./pickup";
import { ItemPickup } from "./pickup";
import { MAKEDEFS } from "../shop/makedefs";
import random from "random";
import { pickByRarity } from "../shop/rarity";
import { Wave } from "./fx/wave";
import { Smoke } from "./fx/smoke";
import type { Nullish } from "utility-types";
import type { Damageable } from "../combat/damageable";

const ENGINE_SFX_BY_TYPE: Record<string, string> = {
  coal: "engine_coal",
  diesel: "engine_diesel",
};

export interface ShipParams extends PhysicsParams {
  money: number;
  damage: number;
  makeup: ShipMakeup | "default";
  make?: ShipMake | "random";
  name?: string;
  hullDamage?: number;
}

export interface ShipEffect {
  duration: number;
  thrustMultiplier?: number;
  damagePerSecond?: number;
  instigator?: Ship;
  render?: (ctx: ShipRenderContext) => void;
}

export type TickActionFunction<T> = (deltaTime: number) => T;
export type TickActionCallback<T> = (action: T) => void;

export class TickAction<T> {
  private action: TickActionFunction<T>;
  private result: T | null = null;
  private done = false;
  private callbacks: TickActionCallback<T>[] = [];

  constructor(action: TickActionFunction<T>) {
    this.action = action;
  }

  public isDone(): boolean {
    return this.done;
  }

  public perform(deltaTime: number) {
    this.finish(this.action(deltaTime));
  }

  public then(callback: TickActionCallback<T>) {
    this.callbacks.push(callback);
    return this;
  }

  public getResult(): T {
    if (this.result == null) {
      throw new Error(
        "Tried to get the result from an unresolved TickAction; check with isDone() first!",
      );
    }
    return this.result;
  }

  public finish(result: T) {
    this.result = result;
    this.done = true;
    this.callbacks.forEach((c) => {
      c(result);
    });
  }
}

export interface CollisionCircle {
  center: Victor;
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
): { circle: CollisionCircle | null; dist: number } {
  return soup
    .map<{ circle: CollisionCircle; dist: number }>((c) => ({
      circle: c,
      dist: circleCentreDist(c, target),
    }))
    .reduce<{ circle: CollisionCircle | null; dist: number }>(
      (a, b) => (a.dist < b.dist ? a : b),
      { circle: null, dist: Infinity },
    );
}

export class ShipRenderContext {
  ship: Ship;
  ctx: CanvasRenderingContext2D;
  drawPos: Victor;
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

  private update(info: ObjectRenderInfo) {
    const { ship } = this;
    this.info = info;
    this.ctx = info.ctx;

    this.drawScale = (this.game = ship.game).drawScale;

    const drawPos = info.base
      .clone()
      .add(ship.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 9;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.largeEdge) * 0.5;
    const hdist = camheight - ship.height * 0.1;
    const proximityScale = camheight / new Victor(hdist, cdist).length();
    const scale = proximityScale * info.scale;
    const size = ship.size * scale;
    const isPlayer = ship.isPlayer;
    const isPlayerFleet = ship.following && ship.following.isPlayer;

    if (hdist < 0.1) {
      return;
    }

    const hoffs = ship.phys.height * 20 + (ship.phys.verticalSize() * 10) / 3;
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

  private drawBody() {
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
    const to = new Victor(ship.size * ship.lateralCrossSection * scale, 0)
      .rotateBy(ship.angle)
      .add(drawPos);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  private drawName() {
    const { ctx, drawPos, ship } = this;
    const namePos = drawPos
      .clone()
      .addScalarY(ship.size * ship.lateralCrossSection + 15);
    const name = ship.makeup.name;

    ctx.globalCompositeOperation = "hard-light";
    ctx.font = "bold 12px sans-serif";
    const { width } = ctx.measureText(name);

    ctx.fillStyle = "#0004";
    ctx.fillRect(namePos.x - width / 2 - 7, namePos.y - 9, width + 14, 18);

    ctx.fillStyle = "#ffdc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, namePos.x, namePos.y);
    ctx.globalCompositeOperation = "source-over";
  }

  private drawDamageBar() {
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
        new Victor(ship.size * ship.lateralCrossSection, 0).rotateBy(
          ship.angle,
        ),
      );
    const fromDraw = info.toScreen(from);
    const fromDrawBack = info.toScreen(
      from
        .clone()
        .subtract(
          new Victor(ship.size * ship.lateralCrossSection * 2, 0).rotateBy(
            ship.angle,
          ),
        ),
    );
    const angmom = ship.phys.orbitalVelocityAt(from).multiplyScalar(scale);

    // Draw AI soonPos offset
    ctx.strokeStyle = "#60FB";
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.moveTo(fromDraw.x, fromDraw.y);
    const toSoonPos = info.toScreen(
      from
        .clone()
        .add(
          ship.vel
            .clone()
            .divideScalar(Math.sqrt(ship.makeup.maxAcceleration() || 1)),
        ),
    );
    ctx.lineTo(toSoonPos.x, toSoonPos.y);
    ctx.setLineDash([]);

    // Draw # engines available
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#82FD";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "E: " + ship.makeup.getReadyEngines().length.toString(),
      toSoonPos.x + 10,
      toSoonPos.y,
    );

    return;

    // Draw buoyancy & submersion
    ctx.strokeStyle = "#F00";
    ctx.beginPath();
    ctx.moveTo(fromDrawBack.x, fromDrawBack.y);
    ctx.lineTo(
      fromDrawBack.x,
      fromDrawBack.y - ship.phys.buoyantForce() / ship.phys.weight,
    );
    ctx.stroke();

    ctx.strokeStyle = "#08F";
    ctx.beginPath();
    ctx.moveTo(fromDrawBack.x, fromDrawBack.y);
    ctx.lineTo(fromDrawBack.x, fromDrawBack.y + ship.phys.submersion() * 50);
    ctx.stroke();

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

    // Draw drag vector
    ctx.strokeStyle = "#6f26";
    ctx.beginPath();
    ctx.moveTo(fromDraw.x, fromDraw.y);
    const drag = info.toScreen(
      ship.phys.dragVector().multiplyScalar(15).add(from),
    );
    ctx.lineTo(drag.x, drag.y);
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

  private drawCannon(cannon: Cannon, offs: Victor) {
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

  private drawCannons() {
    const cannons = this.ship.makeup.getPartsOf("cannon") as Cannon[];

    cannons.forEach((cannon, idx) => {
      this.drawCannon(
        cannon,
        new Victor(
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

  private drawCrosshair(cannon: Cannon) {
    const { ctx, ship, isPlayer, info, game } = this;

    if (!isPlayer) return;

    const available = cannon.cooldown <= 0;

    if (game.mouse == null) return;
    const shootFrom = ship.cannonballSpawnSpot();
    const mouseDist = game.mouse.pos.length();
    const shootDist = Math.min(mouseDist, ship.maxShootRange ?? Infinity);
    const shootExpect = shootFrom
      .clone()
      .add(ship.phys.angNorm.multiplyScalar(shootDist));
    const spread = cannon.spread;
    const angle = ship.phys.angle;
    const shootPos = cannon.hitLocation(ship, shootDist);
    const hitDist = shootPos.clone().subtract(shootFrom).length();
    const crosshairArcCenter = info.toScreen(
      shootFrom.clone().add(shootPos).subtract(shootExpect),
    );

    const color = available
      ? cannon.locked
        ? "#EE990030"
        : !ship.makeup.hasAmmo(cannon.caliber)
          ? "#22408840"
          : "#FFFF0020"
      : "#88000040";
    ctx.save();
    ctx.globalCompositeOperation = "hard-light";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // draw spread arcs
    ctx.globalAlpha = 0.2;
    for (const width of [0.15, 0.18, 0.24, 0.32, 0.56, 0.71, 0.87, 1.0]) {
      ctx.lineWidth = (0.8 * Math.max(2, cannon.caliber)) / width;
      ctx.beginPath();
      ctx.arc(
        crosshairArcCenter.x,
        crosshairArcCenter.y,
        hitDist * info.scale,
        angle - spread * width,
        angle + spread * width,
      );
      ctx.stroke();
      ctx.save();
      ctx.lineWidth *= 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // draw predicted cannonball fall pos
    ctx.globalAlpha = 1.0;
    const hitPos = info.toScreen(cannon.hitLocation(ship, hitDist));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      hitPos.x,
      hitPos.y,
      cannon.caliber * info.scale * 1.2,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.restore();
  }

  private drawCrosshairs() {
    const { ship } = this;

    const cannon = ship.makeup.nextReadyCannon;

    if (cannon == null) return;
    this.drawCrosshair(cannon);
  }

  private drawFollowLine() {
    const { ship, info, ctx } = this;
    const following = ship.following;

    if (following == null) return;

    const from = info.toScreen(ship.pos);
    const to = info.toScreen(following.pos);

    const off = to.clone().subtract(from).norm();

    from.add(
      off.clone().multiplyScalar(5 + ship.phys.size * ship.lateralCrossSection),
    );
    to.subtract(
      off
        .clone()
        .multiplyScalar(
          5 + following.phys.size * following.lateralCrossSection,
        ),
    );

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(170, 190, 170, 0.075)";
    ctx.lineDashOffset = 5;
    ctx.setLineDash([30, 10]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  private renderEffects() {
    for (const effect of this.ship.effects) {
      if (effect.render != null) {
        effect.render(this);
      }
    }
  }

  public draw(info: ObjectRenderInfo) {
    this.update(info);

    this.drawFollowLine();

    if (!this.ship.isVisible(info)) return;

    this.drawBody();
    this.drawCannons();
    this.drawDamageBar();
    this.drawName();
    this.renderEffects();
    this.drawCrosshairs();

    // DEBUG
    //this.drawDebug();
  }
}

const CHASE_LOCK_RANGE = Math.pow(1200, 2);

export class Ship implements Tickable, Renderable, Damageable {
  game: Game;
  phys: PhysicsObject;
  dying: boolean;
  lastInstigator: Ship | null;
  chasers = new Set<Ship>();
  lastInstigTime: number | null;
  currShootDist: number | null;
  killScore: number;
  money: number;
  makeup: ShipMakeup;
  tickActions: TickAction<unknown>[];
  drawer: ShipRenderContext;
  lastWave: number | null = null;
  lastSmoke: number | null = null;
  lastEngineSound: number | null = null;
  following: Ship | null = null;
  alliance = new Set<Ship>([this]);
  followers = new Set<Ship>();
  type = "ship";
  effects: ShipEffect[] = [];
  private thrustIntention = 0;
  private steerIntention = 0;

  public getDamage(): number {
    return this.makeup.hullDamage;
  }

  public getMaxDamage(): number {
    return this.makeup.make.maxDamage;
  }

  public follow(other: Ship) {
    if (this.following != null) this.unfollow();
    other.followers.add(this);
    this.following = other;
  }

  private totalThrustMultiplier(): number {
    return this.effects
      .filter(
        (e): e is ShipEffect & { thrustMultiplier: number } =>
          e.thrustMultiplier != null,
      )
      .map((e) => e.thrustMultiplier)
      .reduce((a, b) => a * b, 1);
  }

  private pruneElapsedEffects() {
    this.effects = this.effects.filter((e) => e.duration > 0);
  }

  private effectsElapseTime(deltaTime: number) {
    for (const effect of this.effects) {
      effect.duration -= deltaTime;
    }

    this.pruneElapsedEffects();
  }

  private applyEffectDamage(deltaTime: number) {
    for (const effect of this.effects) {
      if (effect.damagePerSecond != null && effect.damagePerSecond > 0) {
        this.takeDamage(effect.damagePerSecond * deltaTime, deltaTime);
        if (this.dying && effect.instigator != null) {
          effect.instigator.scoreKill();
        }
      }
    }
  }

  private tickApplyEffects(deltaTime: number) {
    this.applyEffectDamage(deltaTime);
    this.effectsElapseTime(deltaTime);
  }

  public unfollow() {
    if (this.following == null) return;
    this.following.followers.delete(this);
    this.following = null;
  }

  public ally(other: Ship) {
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

  public setInstigator(other: Ship | null) {
    if (!this.dying && other != null) {
      if (this.following != null) {
        if (
          this.following.lastInstigator != null &&
          this.following.lastInstigator !== other
        )
          return false;

        if (this.following === other.following && this.following.isPlayer)
          return false;

        if (this.following.lastInstigator == null && Math.random() < 0.3) {
          this.following.aggro(other);
        }
      }

      if (this.following === other) return false;
      if (this.followers.has(other)) return false;

      if (this.alliance.has(other)) {
        if (Math.random() < 0.3) {
          this.purgeFromAlliance(other);
          other.purgeFromAlliance(this);
        } else return false;
      }
    }

    if (this.dying) {
      return;
    }

    if (this.lastInstigator != other && this.lastInstigator != null) {
      this.lastInstigator.chasers.delete(this);
    }

    this.lastInstigator = other;

    if (other == null) {
      return;
    }

    for (const follower of Array.from(this.followers)) {
      follower.setInstigator(other);
    }

    for (const otherFollower of Array.from(other.followers)) {
      otherFollower.setInstigator(this);
    }

    other.chasers.add(this);
    this.lastInstigTime = Date.now();

    return true;
  }

  public inDanger(): boolean {
    return Array.from(this.chasers).some(
      (chaser) =>
        chaser.makeup.nextReadyCannon != null &&
        !chaser.makeup.shouldFlee() &&
        chaser.phys.pos.distanceSq(this.phys.pos) < CHASE_LOCK_RANGE,
    );
  }

  public get play(): PlayState {
    return this.game.state as PlayState;
  }

  public get damage(): number {
    return this.makeup.hullDamage;
  }

  constructor(game: Game, pos?: Victor, params?: Partial<ShipParams>) {
    if (params == null) params = {};
    if (params.size == null) params.size = 14;

    this.game = game;
    this.phys = (game.state as PlayState).makePhysObj(pos || new Victor(0, 0), {
      buoyancy: 1.2,
      ...params,
    });

    this.initMakeup(params);
    this.dying = false;
    this.lastInstigator = null;
    this.lastInstigTime = null;
    this.killScore = 0;
    this.tickActions = [];
    this.money = 0;
    this.setMoney(
      params.money ??
        random.uniform(5, 35)() +
          this.makeup.make.cost * random.uniform(0.0008, 0.005)(),
    );

    this.physicsMixins();
    this.updateWeight();
    this.phys.height =
      Math.max(this.play.waterLevel, this.phys.floor) +
      this.phys.verticalSize() * 0.2;

    this.drawer = new ShipRenderContext(this);
  }

  protected initMakeup(
    params: Partial<Pick<ShipParams, "makeup" | "make" | "name">>,
  ) {
    if (params.makeup != null && params.makeup !== "default") {
      this.setMakeup(params.makeup);
      return;
    }

    const makeupParams = {
      name: params.name ?? null,
      make:
        params.make != null
          ? params.make === "random"
            ? pickByRarity(MAKEDEFS)
            : params.make
          : null,
    };

    this.setMakeup(
      params.makeup === "default"
        ? ShipMakeup.defaultMakeup(makeupParams)
        : new ShipMakeup(makeupParams),
    );
  }

  public scoreKill() {
    this.killScore++;

    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.kills++;
    }
  }

  public nextTick<T>(action: TickActionFunction<T>): TickAction<T> {
    const actionObj = new TickAction(action);
    this.tickActions.push(actionObj);
    return actionObj;
  }

  public processTickActions(deltaTime: number) {
    let action: TickAction<unknown> | Nullish;
    while ((action = this.tickActions.splice(0, 1).shift()) != null) {
      action.perform(deltaTime);
    }
  }

  public setMakeup(makeup: ShipMakeup) {
    this.makeup = makeup;
    this.phys.size = makeup.make.size;
    this.phys.baseDrag = makeup.make.drag;
  }

  protected physicsMixins() {
    this.phys.dragVector = () => {
      const res = new Victor(1, this.lateralCrossSection).rotate(this.angle);
      return new Victor(Math.abs(res.x), Math.abs(res.y));
    };

    this.phys._sphericalVolume = () => {
      const circles = this.collisionCircles();
      if (circles.length > 0) {
        return this.collisionCircles()
          .map((colCircle) => (Math.PI * Math.pow(colCircle.radius, 3) * 4) / 3)
          .reduce((a, b) => a + b, 0);
      } else {
        return (
          (Math.PI *
            Math.pow(
              this.phys.size * (1 + (this.lateralCrossSection * 2) / 3),
              3,
            ) *
            4) /
          3
        );
      }
    };

    this.phys.verticalSize = () => {
      return (this.phys.size + (this.lateralCrossSection * 2) / 3) * 0.01;
    };
  }

  public maxSpread() {
    return Math.max(
      ...this.makeup
        .getPartsOf("cannon")
        .filter((c) => c.available(this.makeup))
        .map((c) => (c as Cannon).spread),
    );
  }

  // -- phys util getters
  public get vel() {
    return this.phys.vel;
  }

  public set vel(vel: Victor) {
    this.phys.vel = vel;
  }

  public get floor() {
    return this.phys.floor;
  }

  public get height() {
    return this.phys.height;
  }

  public get pos() {
    return this.phys.pos;
  }

  public set pos(pos: Victor) {
    this.phys.pos = pos;
  }

  public get size() {
    return this.makeup.make.size;
  }

  public get angle() {
    return this.phys.angle;
  }

  public get weight() {
    return this.phys.weight;
  }
  // --

  protected get instigMemory() {
    return 12;
  }

  public aggro(instigator: Ship) {
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

  public takeDamage(damage: number, deltaTime: number | null = null) {
    damage = Math.max(0, damage);
    if (damage === 0) return;

    const die = this.makeup.damageShip(damage, deltaTime);

    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.damage = this.damage;
    }

    if (die) {
      this.die();
    }
  }

  public get isPlayer() {
    return this.game.player != null && this.game.player.possessed === this;
  }

  public tryShoot(shootDist?: number) {
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

  public get angNorm() {
    return this.phys.angNorm;
  }

  public isVisible(info: ObjectRenderInfo) {
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

  public render(info: ObjectRenderInfo) {
    this.drawer.draw(info);
  }

  public setMoney(money: number) {
    if (this.following != null) {
      this.following.setMoney(money);
    }
    this.money = money;
    if (this.game.player != null && this.game.player.possessed === this) {
      this.game.player.updateMoneyFromFleet();
    }
  }

  public giveMoney(money: number) {
    if (money < 0) {
      console.warn(
        `Tried to give negative money (${money.toFixed(2)}) to ship ${this.makeup.name}!`,
      );
      return;
    }
    if (money < 0.01) {
      console.warn(
        `Tried to give sub-cent money (${money.toFixed(2)}) to ship ${this.makeup.name}; rounding up to the cent`,
      );
      money = 0.01;
    }
    this.setMoney(money + this.money);
  }

  private pickupSpawnPos(): Victor {
    return this.pos
      .clone()
      .add(
        new Victor(Math.random() * this.size * 0.8, 0).rotateBy(
          Math.random() * Math.PI * 2,
        ),
      );
  }

  private pickupParams(): Partial<PhysicsParams> {
    return {
      vel: this.vel.add(
        new Victor(20, 0).rotateBy(random.uniform(0, Math.PI * 2)()),
      ),
      vspeed: 0.7,
      height: this.height + random.uniform(0.1, 0.3)(),
      immovable: true,
    };
  }

  dropCash() {
    if (this.money <= 0) {
      return;
    }
    const pickup = this.play.spawn<CashPickup, CashPickupParams>(
      CashPickup,
      this.pickupSpawnPos(),
      {
        cash: this.money,
        ...this.pickupParams(),
      },
    );
    pickup.init(this);
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

  spawnDroppedItem(item: ShipItem): ItemPickup<ShipItem> {
    const pickup = this.play.spawn<
      ItemPickup<ShipItem>,
      ItemPickupParamType<ShipItem>
    >(ItemPickup, this.pickupSpawnPos(), {
      item: item,
      ...this.pickupParams(),
    });
    pickup.init();
    return pickup;
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

  public die() {
    // TODO: trigger death FX
    this.spawnDrops();
    this.dying = true;
    this.phys.dying = true;
    this.setInstigator(null);
    this.phys.playSound("shipdeath", 1.0);
    this.handlePlayerDie();
  }

  private handlePlayerDie() {
    if (this.play.player == null) return;

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
    if (!this.phys.inWater()) return;

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

  steerToward(deltaTime: number, otherPos: Victor) {
    const angleTarg = otherPos.clone().subtract(this.pos).angle();
    this.steer(deltaTime, angleTarg);
  }

  maxEngineThrust(enginesList?: Engine[]) {
    return (
      this.makeup.maxEngineThrust(enginesList) * this.totalThrustMultiplier()
    );
  }

  public tryThrustForward(amount: number) {
    this.thrustIntention += amount;
  }

  public trySteer(amount: number) {
    this.steerIntention += amount;
  }

  thrustForward(deltaTime: number, amount: number) {
    if (!this.phys.inWater()) return;

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
    this.phys.applyForce(deltaTime, new Victor(thrust, 0).rotate(this.angle));
  }

  spawnSmokeFor(engine: Engine, factor = 1.0) {
    if (engine.fuelType == null) return null;

    if (!(engine.fuelType in SMOKE_COLORS)) return;
    const color: number[] = SMOKE_COLORS[engine.fuelType];

    const amount = Math.abs(factor * engine.thrust);

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

  playEngineSound(engine: Engine, factor = 1.0) {
    if (engine.fuelType == null) return null;

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
    if (ssrc == null) return;
    ssrc.rate(0.6 + 2.2 / (1 + Math.exp(-amount / 30)));
  }

  heightGradient() {
    if (this.play.terrain == null) return new Victor(0, 0);
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

  public boundaryPoint(angle: number) {
    return this.pos
      .clone()
      .add(new Victor(this.intermediaryRadius(angle), 0).rotateBy(angle));
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
    point: Victor;
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
          center: new Victor(off, 0).rotate(this.angle).add(this.pos),
          radius: lerp(this.size, edge, Math.abs(alpha)),
        };
      });
  }

  checkShipCollision(_deltaTime: number, ship: Ship) {
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

    // DEBUG
    //this.play.spawn(DebugPickup, bumpAt, { height: 1.5 });

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

    this.takeDamage(
      ship.phys.momentumRelativeTo(this.phys) * directionality * 0.001,
    );
    ship.takeDamage(
      this.phys.momentumRelativeTo(ship.phys) * directionality * 0.001,
    );
  }

  checkShipCollisions(deltaTime: number) {
    for (const ship of this.play.tickables) {
      if (ship.type !== "ship") {
        continue;
      }

      if (ship === this) {
        break;
      }

      this.checkShipCollision(deltaTime, ship as Ship);
    }
  }

  checkTerrainDamage(deltaTime: number) {
    if (this.phys.isOnLand()) {
      this.takeDamage(1000 * deltaTime, deltaTime);
    }
  }

  checkSubmergedDamage(deltaTime: number) {
    if (this.phys.isSubmerged()) {
      this.takeDamage(200 * deltaTime, deltaTime);
    }
  }

  pruneDeadPointers() {
    if (this.following != null && this.following.dying) this.following = null;
    for (const friend of Array.from(this.alliance).filter((a) => a.dying))
      this.alliance.delete(friend);
    for (const follower of Array.from(this.followers).filter((a) => a.dying))
      this.followers.delete(follower);
    for (const chaser of Array.from(this.chasers).filter((a) => a.dying))
      this.chasers.delete(chaser);
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
        new Victor(this.size * this.lateralCrossSection * 0.4, 0).rotateBy(
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

  private applyThrustIntention(deltaTime: number) {
    if (this.thrustIntention !== 0) {
      this.thrustForward(
        deltaTime,
        Math.min(1, Math.max(-1, this.thrustIntention)),
      );
      this.thrustIntention = 0;
    }
  }

  private applySteerIntention(deltaTime: number) {
    if (this.steerIntention !== 0) {
      this.steer(
        deltaTime,
        this.phys.angle +
          (Math.min(1, Math.max(-1, this.steerIntention)) * Math.PI) / 2,
      );
      this.steerIntention = 0;
    }
  }

  public tick(deltaTime: number) {
    if (this.pos.length() > 15000 && !this.isPlayer) {
      // Despawn NPC ships too far from land
      this.dying = true;
      this.phys.dying = true;
      return;
    }
    this.updateWeight();
    this.applyThrustIntention(deltaTime);
    this.applySteerIntention(deltaTime);
    this.tickApplyEffects(deltaTime);
    this.processTickActions(deltaTime);
    this.makeup.tick(deltaTime, this);
    this.checkShipCollisions(deltaTime);
    this.checkTerrainDamage(deltaTime);
    this.checkSubmergedDamage(deltaTime);
    this.pruneDeadInstigator();
    this.pruneDeadPointers();
    this.makeup.inventory.pruneItems();
    this.checkSpawnWave();
  }
}
