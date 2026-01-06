import Victor from "victor";
import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import { aoeExplosion } from "../explosion";
import {
	getPlayStateFromProj,
	type Projectile,
	type ProjectileModifier,
} from "../projectile";

class ExplosiveModifier implements ProjectileModifier {
	name = "explosive";
	infoString = "explosives";

	onDestroy(projectile: Projectile): void {
		aoeExplosion(
			getPlayStateFromProj(projectile),
			projectile.phys.pos,
			250,
			8000,
			100,
			(obj) => obj !== projectile && obj !== projectile.instigator,
			(obj) => obj.phys.weight ** 0.3,
			projectile.instigator instanceof Ship ? projectile.instigator : null,
			projectile.phys.height,
		);
	}

	onHit(): void {}

	render(info: ObjectRenderInfo, projectile: Projectile): void {
		const { ctx, toScreen } = info;

		const pos = toScreen(projectile.phys.pos);
		const size = projectile.phys.size + 10;

		ctx.lineWidth = 1.5;
		ctx.strokeStyle = "#FA08";

		for (const angle of [1, 3, 5, 7].map((fac) => (fac * Math.PI) / 4)) {
			ctx.beginPath();
			const tgt = pos.clone().add(new Victor(size, 0).rotate(angle));
			ctx.moveTo(pos.x, pos.y);
			ctx.lineTo(tgt.x, tgt.y);
			ctx.stroke();
		}
	}
}

export const EXPLOSIVES = new ExplosiveModifier();
