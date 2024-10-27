import type { ObjectRenderInfo, Renderable } from "../../render";
import type { Physicable, PlayState, Tickable } from "../../superstates/play";
import { lerp } from "../../util";
import type { PhysicsObject } from "../physics";
import type { Ship } from "../ship";

export class Wave implements Renderable, Tickable, Physicable {
  phys: PhysicsObject;
  width: number;
  ship: Ship;
  play: PlayState;
  dying = false;
  growth: number;
  renderOrder = -50;
  type = "fx";

  constructor(play: PlayState, from: Ship) {
    this.play = play;
    this.ship = from;
    this.growth = from.phys.kineticEnergy() / from.size / 20000;
    const width = lerp(
      from.size * from.lateralCrossSection,
      from.size,
      Math.abs(from.angNorm.dot(from.vel.norm())),
    );
    this.phys = this.play.makePhysObj(from.pos.clone(), {
      size: width,
      angle: from.vel.invert().angle(),
      baseDrag: 0,
      vel: from.vel.invert().multiplyScalar(1.5),
    });
  }

  destroy() {
    this.dying = true;
  }

  tick(deltaTime: number) {
    this.phys.size += this.growth * deltaTime;
    if (this.phys.age > 1.6) this.destroy();
    if (!this.phys.inWater()) this.destroy();
  }

  render(info: ObjectRenderInfo) {
    const { ctx, toScreen } = info;
    if (!this.phys.isVisible(info)) return;
    const drawPos = toScreen(this.phys.pos);
    const color = `rgba(200, 200, 255, ${(Math.exp(-this.phys.age) / 65).toString()})`;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.phys.size / 2;
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, this.phys.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, (this.phys.size * 2) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
