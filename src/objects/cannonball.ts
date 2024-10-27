import Victor from "victor";
import type { ObjectRenderInfo, Renderable } from "../render";
import type { PhysicsObject } from "./physics";
import type { PhysicsParams } from "./physics";
import type { Ship } from "./ship";
import type { PlayState, Tickable } from "../superstates/play";
import {
  projApplyDestroyModifiers,
  projApplyHitModifiers,
  projRenderModifiers,
  projTickModifiers,
  type Projectile,
  type ProjectileModifier,
} from "../combat/projectile";

export interface CannonballParams extends PhysicsParams {
  speed: number;
}

export class Cannonball implements Tickable, Renderable, Projectile {
  public game: PlayState;
  public instigator: Ship;
  public phys: PhysicsObject;
  public dying: boolean;
  public predictedFall: Victor | null = null;
  public type = "cannonball";
  public modifiers = new Set<ProjectileModifier>();
  public projectileFlag = null; // as opposed to undefined

  constructor(
    game: PlayState,
    shipOwner: Ship,
    params: Partial<CannonballParams>,
  ) {
    this.game = game;
    this.instigator = shipOwner;
    this.phys = this.game.makePhysObj(shipOwner.cannonballSpawnSpot(), params);
    this.dying = false;
  }

  public computePredictedFall(): Victor {
    const airtime = Math.max(0, this.airtime());
    const drag = this.phys.airDrag() / this.phys.weight;
    return this.pos
      .clone()
      .add(this.vel.multiplyScalar((1 - Math.exp(-drag * airtime)) / drag));
  }

  public predictFall(): Victor {
    return (this.predictedFall = this.computePredictedFall());
  }

  // -- phys util getters
  public get vel() {
    return this.phys.vel;
  }

  public set vel(vel) {
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

  public get size() {
    return this.phys.size;
  }

  public get angle() {
    return this.phys.angle;
  }

  public get weight() {
    return this.phys.weight;
  }
  // --

  public get damageFactor() {
    // TODO: make depend on munition type (corrosive, oxidizing, explosive, incendiary etc)
    return 1;
  }

  public destroy() {
    projApplyDestroyModifiers(this);

    this.dying = true;
    this.phys.dying = true;
  }

  private checkShipCollision(ship: Ship) {
    const closeness = this.phys.touchingShip(ship);
    if (closeness <= 0) {
      return false;
    }

    ship.aggro(this.instigator);
    if (this.instigator.isPlayer) this.instigator.aggro(ship);

    const toward = ship.pos.clone().subtract(this.pos).norm();
    const damageScale = Math.max(
      0.6,
      Math.pow(1.5, this.vel.subtract(ship.vel).norm().dot(toward)),
    );

    this.phys.playSound("impactblast");

    ship.takeDamage(
      this.damageFactor *
        this.phys.momentumRelativeTo(ship.phys) *
        damageScale *
        0.5,
    );
    projApplyHitModifiers(this, ship);

    if (ship.dying) {
      this.instigator.scoreKill();
    }

    this.destroy();

    return true;
  }

  protected checkShipCollisions() {
    for (const ship of this.game.tickables) {
      if (ship.type !== "ship") {
        continue;
      }

      if (ship === this.instigator) {
        continue;
      }

      if (this.checkShipCollision(ship as Ship)) {
        break;
      }
    }
  }

  protected checkTerrainCollision() {
    if (this.height < this.game.waterLevel) {
      this.phys.playSound("waterimpact", 0.7);
      this.destroy();
    }
  }

  public tick(deltaTime: number) {
    if (this.phys.age > 50) {
      this.destroy();
      return;
    }

    projTickModifiers(deltaTime, this);
    this.checkTerrainCollision();
    this.checkShipCollisions();
  }

  public airtime(): number {
    const vspeed = this.phys.vspeed;
    const altitude = this.phys.height - this.game.waterLevel;
    const airtime =
      (vspeed +
        Math.sqrt(vspeed * vspeed + 2 * altitude * (this.phys.gravity * 0.3))) /
      (this.phys.gravity * 0.3);
    return airtime;
  }

  drawCrosshair(info: ObjectRenderInfo) {
    const { ctx } = info;

    this.predictFall();
    if (this.predictedFall == null) return;

    const airtime = this.airtime();

    const chrad = Math.max(5, airtime * 50) + this.size;
    const fall = this.predictedFall
      .clone()
      .subtract(info.cam)
      .multiplyScalar(info.scale)
      .add(info.base);

    if (
      fall.x + chrad < 0 ||
      fall.x - chrad > info.width ||
      fall.y + chrad < 0 ||
      fall.y - chrad > info.height
    ) {
      return;
    }

    const color = `rgba(0, 140, 240, ${(0.3 * (0.8 - Math.min(0.65, Math.max(0, 0.4 * airtime)))).toString()})`;
    ctx.strokeStyle = color;
    const dashSpacing = 7 + 20 / (1 + airtime / 2);
    ctx.setLineDash([6, dashSpacing, 3, dashSpacing]);
    ctx.lineWidth = 0.75 * this.phys.size;
    ctx.beginPath();
    ctx.arc(fall.x, fall.y, chrad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  render(info: ObjectRenderInfo) {
    const ctx = info.ctx;

    const drawPos = this.pos
      .clone()
      .subtract(info.cam)
      .multiplyScalar(info.scale)
      .add(info.base);
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.largeEdge) * 0.5;
    const hdist = camheight - this.height / 2;
    const proximityScale = camheight / new Victor(hdist, cdist).length();
    const size = this.size * proximityScale * info.scale;

    if (hdist < 0.02) {
      return;
    }

    const hoffs = this.height * 20 + this.phys.size / 2;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(this.phys.floor, this.game.waterLevel) * 20,
    );

    this.drawCrosshair(info);

    // draw shadow
    ctx.fillStyle = "#0008";
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y + shoffs, size, 0, 2 * Math.PI);
    ctx.fill();

    // draw cball
    ctx.fillStyle = "#877";
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, size, 0, 2 * Math.PI);
    ctx.fill();

    // apply render modifiers
    projRenderModifiers(info, this);

    // debug
    // TODO: remove when no longer needed
    // const airtime = Math.max(0, this.airtime());
    // ctx.strokeStyle = ctx.fillStyle = "#00F8";
    // ctx.lineWidth = 2;
    // ctx.beginPath();
    // const from = this.predictedFall
    //   .clone()
    //   .subtract(info.cam)
    //   .multiplyScalar(info.scale)
    //   .add(info.base);
    // ctx.moveTo(from.x, from.y);
    // const to = this.computePredictedFall()
    //   .subtract(info.cam)
    //   .multiplyScalar(info.scale)
    //   .add(info.base);
    // ctx.lineTo(to.x, to.y);
    // ctx.stroke();

    // ctx.beginPath();
    // ctx.arc(drawPos.x, drawPos.y, this.size + airtime * 50, 0, Math.PI * 2);
    // ctx.stroke();
    // ctx.beginPath();
    // ctx.moveTo(drawPos.x + this.size + Math.max(0, airtime * 50), drawPos.y);
    // ctx.lineTo(
    //   drawPos.x + this.size + Math.max(0, (airtime - 1) * 50),
    //   drawPos.y,
    // );
    // ctx.stroke();

    // ctx.beginPath();
    // const pendulum = this.phys.age % 1;
    // ctx.arc(
    //   drawPos.x +
    //     this.size +
    //     lerp(
    //       Math.max(0, airtime * 50),
    //       Math.max(0, (airtime - 1) * 50),
    //       pendulum,
    //     ),
    //   drawPos.y,
    //   3,
    //   0,
    //   Math.PI * 2,
    // );
    // ctx.fill();
  }
}
