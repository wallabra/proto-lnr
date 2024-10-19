import type { ObjectRenderInfo } from "../../render";
import { isPhysicable } from "../../superstates/play";
import type { Damageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";
import Victor from "victor";

class SpinChargeModifier implements ProjectileModifier {
  infoString = "spin charges";

  onHit(_projectile: Projectile, target: Damageable): void {
    if (!isPhysicable(target)) return;

    target.phys.angVel += Math.sign(Math.random() - 0.5) * Math.PI * 3;
  }

  onDestroy(): void {}

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    const { ctx, toScreen } = info;
    const pos = toScreen(projectile.phys.pos);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#0F03";
    for (const angle of [1, 3, 5, 7].map((which) => (which * Math.PI) / 4)) {
      const at = new Victor(projectile.phys.size * 3.5, 0)
        .rotate(angle)
        .add(pos);

      ctx.beginPath();
      ctx.arc(at.x, at.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export const SPIN_CHARGE = new SpinChargeModifier();
