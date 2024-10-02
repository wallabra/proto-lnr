import { AIJump, AIStartArgs, AITickArgs } from "./defs";
import { EngageStartArgs } from "./states/engage";
import { FleeStartArgs } from "./states/flee";

export function commonPaths(
  args: AITickArgs,
): AIJump | null {
  const { ship, play, soonPos, stateName } = args;

  if (ship.lastInstigator != null) {
    const target = ship.lastInstigator;

    if (
      ship.makeup.nextReadyCannon != null &&
      !(
        target.makeup.nextReadyCannon != null && ship.damage > 0.7 * ship.maxDmg
      )
    )
      return {
        next: "engage",
        args: { target: target },
      } as AIJump<EngageStartArgs>;
    else if (
      ship.pos.clone().subtract(target.pos).length() <
      (target.maxShootRange ?? 500) * 2
    )
      return { next: "flee", args: { target } } as AIJump<FleeStartArgs>;
  }
  if (stateName === "engage") return;

  // strict terrain avoid
  if (
    play.terrain != null &&
    play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.75
  )
    return { next: "avoidTerrain" };

  if (ship.following != null) {
    const following = ship.following;
    const followDist = ship.pos.clone().subtract(following.pos).length();
    if (
      followDist >
      200 +
        ship.size * ship.lateralCrossSection +
        following.size * following.lateralCrossSection
    ) {
      return { next: "follow" };
    }
  }

  // loose terrain avoid
  if (
    play.terrain != null &&
    play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.55
  )
    return { next: "avoidTerrain" };
  if (stateName === "avoidTerrain") return;

  return null;
}
