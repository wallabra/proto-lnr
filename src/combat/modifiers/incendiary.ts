import random from "random";
import Victor from "victor";
import type { ShipRenderContext } from "../../objects/ship";
import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import { maybeRange } from "../../util";
import type { Damageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";

const BURN_DURATION = { min: 6, max: 15 };
const BURN_DAMAGE = 200;

class IncendiaryModifier implements ProjectileModifier {
	name = "incendiary";
	infoString = "incendiary phosphorus";

	onDestroy(): void {}

	onHit(projectile: Projectile, target: Damageable): void {
		if (!(target instanceof Ship)) return;

		target.effects.push({
			duration: maybeRange(BURN_DURATION),
			damagePerSecond: BURN_DAMAGE,
			instigator:
				projectile.instigator instanceof Ship
					? projectile.instigator
					: undefined,
			render: (sctx: ShipRenderContext) => {
				const { info, ship, ctx } = sctx;

				const pos = info.toScreen(ship.phys.pos);

				pos.add(
					new Victor(
						random.uniform(projectile.phys.size, projectile.phys.size * 1.5)(),
						0,
					).rotate(Math.random() * Math.PI * 2),
				);

				const flameSize = random.uniform(8, 12)();

				ctx.fillStyle = `rgba(200, ${random.uniformInt(50, 150)().toFixed(0)}, 40, 0.7)`;
				ctx.globalCompositeOperation = "color-dodge";
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, flameSize, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(100, ${random.uniformInt(50, 150)().toFixed(0)}, 40, 0.7)`;
				ctx.beginPath();
				ctx.arc(
					pos.x,
					pos.y,
					flameSize * random.uniform(0.2, 0.6)(),
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.globalCompositeOperation = "source-over";
			},
		});
	}

	render(info: ObjectRenderInfo, projectile: Projectile): void {
		// render web effect ring
		const { ctx, toScreen } = info;

		const pos = toScreen(projectile.phys.pos);

		ctx.strokeStyle = "#FF0A";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([2, 5]);
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, projectile.phys.size * 3 + 3.5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
	}
}

export const INCENDIARY = new IncendiaryModifier();
