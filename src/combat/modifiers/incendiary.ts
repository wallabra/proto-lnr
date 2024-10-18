import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import { maybeRange } from "../../util";
import type { Damageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";

const BURN_DURATION = { min: 4, max: 12 };
const BURN_DAMAGE = 25;

class IncendiaryModifier implements ProjectileModifier {
  infoString = "incendiary phosphorus";

  onDestroy(): void {}

  onHit(_projectile: Projectile, target: Damageable): void {
    if (!(target instanceof Ship)) return;

    target.effects.push({
      duration: maybeRange(BURN_DURATION),
      damagePerSecond: BURN_DAMAGE,
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
