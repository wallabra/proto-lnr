import { AIJump, AIStartArgs, AITickArgs } from "./defs";
import { EngageStartArgs } from "./states/engage";

export function commonPaths(
  args: AITickArgs,
): AIJump<unknown & AIStartArgs> | null {
  const { ship, play, soonPos, stateName } = args;

  if (ship.lastInstigator != null && ship.makeup.nextReadyCannon != null)
    return {
      next: "engage",
      args: { target: ship.lastInstigator },
    } as AIJump<EngageStartArgs>;
  if (stateName === "engage") return;

  // strict terrain avoid
  if (
    play.terrain != null &&
    play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.75
  )
    return { next: "avoidTerrain" };

  if (ship.following != null) {
    const followDist = ship.pos.clone().subtract(ship.following.pos).length();
    if (followDist > 700) {
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