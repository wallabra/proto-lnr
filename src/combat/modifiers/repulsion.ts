import { ObjectRenderInfo } from "../../render";
import { Damageable } from "../damageable";
import { aoeExplosion } from "../explosion";
import { Projectile, ProjectileModifier } from "../projectile";

class RepulsionDiscModifier implements ProjectileModifier {
  infoString = 'repulsion disc';

  onDestroy(projectile: Projectile): void {
    aoeExplosion(projectile.state, projectile.phys.pos, 400, 0, 50000);
  }

  onHit(): void {}

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);
    const size = projectile.phys.size + 10;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#F004'
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

