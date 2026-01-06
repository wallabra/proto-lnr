import type { ObjectRenderInfo } from "../../render";
import { aoeExplosion } from "../explosion";
import {
	getPlayStateFromProj,
	type Projectile,
	type ProjectileModifier,
} from "../projectile";

class RepulsionDiscModifier implements ProjectileModifier {
	name = "repulsion";
	infoString = "repulsion disc";

	onDestroy(projectile: Projectile): void {
		aoeExplosion(
			getPlayStateFromProj(projectile),
			projectile.phys.pos,
			600,
			0,
			2000,
			(obj) => obj !== projectile && obj !== projectile.instigator,
			null,
			null,
			projectile.phys.height,
			0.8,
		);
	}

	onHit(): void {}

	render(info: ObjectRenderInfo, projectile: Projectile): void {
		const { ctx, toScreen } = info;

		const pos = toScreen(projectile.phys.pos);
		const size = projectile.phys.size + 10;

		ctx.lineWidth = 1.5;
		ctx.strokeStyle = "#F004";
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y + size);
		ctx.lineTo(pos.x + size, pos.y);
		ctx.lineTo(pos.x, pos.y - size);
		ctx.lineTo(pos.x - size, pos.y);
		ctx.lineTo(pos.x, pos.y + size);
		ctx.stroke();
	}
}

export const REPULSION_DISC = new RepulsionDiscModifier();
