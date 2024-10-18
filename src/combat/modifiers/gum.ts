import type { ShipRenderContext } from "../../objects/ship";
import { Ship } from "../../objects/ship";
import type { ObjectRenderInfo } from "../../render";
import type { Damageable } from "../damageable";
import type { Projectile, ProjectileModifier } from "../projectile";

const SLOWNESS_DURATION = 15;
const SLOWNESS_FACTOR = 0.3;

class PropellerGumModifier implements ProjectileModifier {
  infoString = "propeller gum";

  onDestroy(): void {}

  onHit(_projectile: Projectile, target: Damageable): void {
    if (!(target instanceof Ship)) return;

    target.effects.push({
      duration: SLOWNESS_DURATION,
      thrustMultiplier: SLOWNESS_FACTOR,
      render: (sctx: ShipRenderContext) => {
        const { info, ship, ctx } = sctx;

        const pos = info.toScreen(ship.phys.pos);
        const size = ship.phys.size * ship.lateralCrossSection;

        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = "#B5B8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#00B5";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size * 1.8 + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    });
  }

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    // render web effect ring
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);

    ctx.strokeStyle = "#B5B8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, projectile.phys.size * 1.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00B5";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, projectile.phys.size * 1.8 + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export const PROPELLER_GUM = new PropellerGumModifier();
