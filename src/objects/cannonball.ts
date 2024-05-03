import Vec2 from "victor";
import { Game } from "../game";
import { ObjectRenderInfo } from "../render";
import { PhysicsObject, PhysicsParams } from "./physics";
import { Ship } from "./ship";

export interface CannonballParams extends PhysicsParams {
  speed: number;
}

export class Cannonball {
  game: Game;
  instigator: Ship;
  phys: PhysicsObject;
  dying: boolean;

  constructor(game: Game, shipOwner: Ship, params: Partial<CannonballParams>) {
    this.game = game;
    this.instigator = shipOwner;
    this.phys = this.game.makePhysObj(shipOwner.cannonballSpawnSpot(), params);
    this.dying = false;
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
    // TODO: make depend on munition type
    return 15;
  }

  get damage() {
    return this.damageFactor * (1 + this.vel.length());
  }

  destroy() {
    this.dying = true;
    this.phys.dying = true;
  }

  touchingShip(ship) {
    if (Math.abs(this.height - ship.height) > 0.6) {
      return 0;
    }

    const angle2 = this.pos.clone().subtract(ship.pos).angle();
    const r1 = this.size;
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
      return false;
    }

    ship.setInstigator(this.instigator);

    const toward = ship.pos.clone().subtract(this.pos).norm();
    const damageScale = Math.min(
      0.75,
      Math.pow(1.5, this.vel.subtract(ship.vel).dot(toward)),
    );
    ship.damageShip(this.damage * damageScale);
    if (ship.dying) {
      this.instigator.killScore++;
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

  render(info: ObjectRenderInfo) {
    const ctx = info.ctx;

    const drawPos = info.base.clone().add(this.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.smallEdge) * 0.5;
    const hdist = camheight - this.height / 2;
    const proximityScale = camheight / Vec2(hdist + cdist).length();
    const size = this.size * proximityScale * info.scale;

    if (hdist < 0.02) {
      return;
    }

    const hoffs = this.height * 20 + 5;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(this.phys.floor, this.game.waterLevel) * 20,
    );

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
  }
}
