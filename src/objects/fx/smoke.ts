import { ObjectRenderInfo, Renderable } from "../../render";
import { Physicable, PlayState, Tickable } from "../../superstates/play";
import Vec2 from "victor";
import { PhysicsObject } from "../physics";
import { Ship } from "../ship";

export class Smoke implements Renderable, Tickable, Physicable {
  phys: PhysicsObject;
  ship: Ship;
  color: number[];
  play: PlayState;
  dying: boolean = false;
  growth: number;
  opacity: number;
  renderOrder: number = 1;

  constructor(play: PlayState, from: Ship, color: number[], opacity: number) {
    this.play = play;
    this.ship = from;
    this.color = color;
    this.opacity = opacity;
    this.growth = 25;
    this.phys = this.play.makePhysObj(
      from.pos
        .clone()
        .add(
          new Vec2(-from.size * from.lateralCrossSection * 0.75, 0).rotate(
            from.angle,
          ),
        )
        .add(
          new Vec2(from.size * 0.5 * Math.random(), 0).rotateBy(
            Math.random() * Math.PI * 2,
          ),
        ),
      {
        size: 3,
        angle: from.vel.invert().angle(),
        baseDrag: 0,
        vel: new Vec2(15, 0).rotateBy(Math.random() * Math.PI * 2),
      },
    );
  }

  destroy() {
    this.dying = true;
  }

  tick(deltaTime: number) {
    this.phys.size += this.growth * deltaTime;
    if (this.phys.age > 2.5) this.destroy();
  }

  render(info: ObjectRenderInfo) {
    const { ctx, toScreen } = info;
    if (!this.phys.isVisible(info)) return;
    const drawPos = toScreen(this.phys.pos);
    const color = `rgba(${this.color.join(", ")}, ${Math.exp(-this.phys.age) * this.opacity})`;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, this.phys.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
