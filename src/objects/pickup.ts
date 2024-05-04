import Vec2 from "victor";
import type { Game } from "../game.ts";
import { ObjectRenderInfo } from "../render.ts";
import type { PhysicsObject } from "./physics.ts";
import { Ship } from "./ship.ts";

export default abstract class Pickup {
  game: Game;
  dying: boolean;
  phys: PhysicsObject;

  constructor(game, pos, params) {
    if (params == null) params = {};
    if (params.size == null) params.size = 8;

    this.game = game;
    this.phys = this.game.makePhysObj(pos || Vec2(0, 0), params);
    this.dying = false;
  }

  /// Callback for when this crate item is collected.
  abstract collect(ship: Ship): void;

  drawBox(ctx, drawPos, size, offs) {
    ctx.beginPath();
    ctx.rotate(-this.phys.angle);
    ctx.translate(drawPos.x, drawPos.y + offs);

    ctx.fillRect(-size, -size, size, size);

    ctx.resetTransform();
  }

  render(info: ObjectRenderInfo) {
    const ctx = info.ctx;

    const drawPos = info.base
      .clone()
      .add(this.phys.pos.clone().subtract(info.cam).multiply(info.scaleVec));
    const camheight = 4;
    const cdist =
      (drawPos.clone().subtract(info.base).length() / info.smallEdge) * 0.5;
    const hdist = camheight - this.phys.height / 2;
    const proximityScale = camheight / Vec2(hdist + cdist).length();
    const size = this.phys.size * proximityScale * info.scale;

    if (hdist < 0.1) {
      return;
    }

    const hoffs = this.phys.height * 20 + 10;
    const shoffs = Math.max(
      0,
      hoffs - Math.max(this.phys.floor, this.game.waterLevel) * 20,
    );

    // Draw shadow
    ctx.fillStyle = "#0008";
    this.drawBox(ctx, drawPos, size, shoffs);

    // Draw body
    ctx.fillStyle = "#6a4000";
    this.drawBox(ctx, drawPos, size, 0);
    ctx.fillStyle = "#00000048";
    this.drawBox(ctx, drawPos, size - 4, 0);
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

    this.collect(ship);
    this.destroy();
    return true;
  }

  checkShipCollisions(deltaTime) {
    for (const ship of this.game.tickables) {
      if (!(ship instanceof Ship)) {
        continue;
      }

      if (this.checkShipCollision(deltaTime, ship)) {
        break;
      }
    }
  }

  bob(deltaTime: number) {
    if (!this.phys.inWater()) return;
    this.phys.applyForce(
      deltaTime,
      Vec2(Math.random() * 2, 0).rotateBy(Math.random() * Math.PI * 2).add(this.phys.vel),
    );
  }

  tick(deltaTime: number) {
    this.bob(deltaTime);
    this.checkShipCollisions(deltaTime);
  }
}
