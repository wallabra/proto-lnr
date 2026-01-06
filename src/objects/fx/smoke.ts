import Victor from "victor";
import type { ObjectRenderInfo, Renderable } from "../../render";
import type { Physicable, PlayState, Tickable } from "../../superstates/play";
import type { PhysicsObject } from "../physics";
import type { Ship } from "../ship";

export class Smoke implements Renderable, Tickable, Physicable {
	phys: PhysicsObject;
	ship: Ship;
	color: number[];
	play: PlayState;
	dying = false;
	growth: number;
	opacity: number;
	renderOrder = 20;
	type = "fx";

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
					new Victor(-from.size * from.lateralCrossSection * 0.75, 0).rotate(
						from.angle,
					),
				)
				.add(
					new Victor(from.size * 0.5 * Math.random(), 0).rotateBy(
						Math.random() * Math.PI * 2,
					),
				),
			{
				size: 3,
				angle: from.vel.invert().angle(),
				baseDrag: 0,
				vel: new Victor(15, 0).rotateBy(Math.random() * Math.PI * 2),
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
		const color = `rgba(${this.color.join(", ")}, ${(Math.exp(-this.phys.age) * this.opacity).toString()})`;
		ctx.fillStyle = color;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(drawPos.x, drawPos.y, this.phys.size, 0, Math.PI * 2);
		ctx.fill();
	}
}
