import Vec2 from "victor";
import { ObjectRenderInfo } from "../render";
import { PhysicsObject, PhysicsParams } from "./physics";
import { Ship } from "./ship";
import { PlayState } from "../superstates/play";

export interface CannonballParams extends PhysicsParams {
  speed: number;
}

export class Cannonball {
  game: PlayState;
  instigator: Ship;
  phys: PhysicsObject;
  dying: boolean;
  predictedFall: Vec2 | null = null;

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

  computePredictedFall(): Vec2 {
    const airtime = Math.max(0, this.airtime());
    const drag = this.phys.airDrag() / this.phys.weight;
    return this.pos
      .clone()
      .add(this.vel.multiplyScalar((1 - Math.exp(-drag * airtime)) / drag));
  }

  predictFall(): Vec2 {
    return (this.predictedFall = this.computePredictedFall());
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
    // TODO: make depend on munition type (corrosive, oxidizing, explosive, incendiary etc)
    return 1;
  }

  destroy() {
    this.dying = true;
    this.phys.dying = true;
  }

  checkShipCollision(deltaTime, ship) {
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
    ship.damageShip(
      this.damageFactor *
        this.phys.kineticEnergyRelativeTo(ship) *
        damageScale *
        0.0235,
    );
    if (ship.dying) {
      this.instigator.scoreKill();
    }
    this.destroy();

    return true;
  }

  checkShipCollisions(deltaTime) {
    for (const ship of this.game.tickables) {
      if (!(ship instanceof Ship)) {
        continue;
      }

      if (ship === this.instigator) {
        continue;
      }

      if (this.checkShipCollision(deltaTime, ship)) {
        break;
      }
    }
  }

  checkTerrainCollision() {
    if (this.height < this.game.waterLevel) {
      this.destroy();
    }
  }

  tick(deltaTime) {
    this.checkTerrainCollision();
    this.checkShipCollisions(deltaTime);
  }

  airtime() {
    const vspeed = this.phys.vspeed;
    const altitude = this.phys.height - this.game.waterLevel;
    const airtime =
      (vspeed + Math.sqrt(vspeed * vspeed + 2 * altitude * this.phys.gravity)) /
      this.phys.gravity;
    return airtime;
  }

  drawCrosshair(info: ObjectRenderInfo) {
    const { ctx } = info;

    this.predictFall();
    if (this.predictedFall == null) return;

    const chrad = Math.max(5, this.airtime() * 50) + this.size;
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

    const color = `rgba(0, 140, 240, ${0.3 * (0.8 - Math.min(0.65, Math.max(0, 0.4 * this.airtime())))})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.75 * this.phys.size;
    ctx.beginPath();
    ctx.arc(fall.x, fall.y, chrad, 0, Math.PI * 2);
    ctx.stroke();
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
      (drawPos.clone().subtract(info.base).length() / info.smallEdge) * 0.5;
    const hdist = camheight - this.height / 2;
    const proximityScale = camheight / new Vec2(hdist, cdist).length();
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
