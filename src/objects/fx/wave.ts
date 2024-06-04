import { ObjectRenderInfo, Renderable } from "../../render";
import { Physicable, PlayState, Tickable } from "../../superstates/play";
import { lerp } from "../../util";
import { PhysicsObject } from "../physics";
import { Ship } from "../ship";

export class Wave implements Renderable, Tickable, Physicable {
  phys: PhysicsObject;
  width: number;
  ship: Ship;
  play: PlayState;
  dying: boolean = false;
  growth: number;
  renderOrder: number = -1;

  constructor(play: PlayState, from: Ship) {
    this.play = play;
    this.ship = from;
    this.growth = (from.vel.lengthSq() * from.weight) / from.size / 30000;
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
    const color = `rgba(200, 200, 255, ${Math.exp(-this.phys.age) / 65})`;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, this.phys.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
