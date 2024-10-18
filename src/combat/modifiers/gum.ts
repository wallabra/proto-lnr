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
    });
  }

  render(info: ObjectRenderInfo, projectile: Projectile): void {
    // render web effect ring
    const { ctx, toScreen } = info;

    const pos = toScreen(projectile.phys.pos);

    ctx.strokeStyle = "#AABA";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, projectile.phys.size * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00B8";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, projectile.phys.size * 1.5 + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export const PROPELLER_GUM = new PropellerGumModifier();
