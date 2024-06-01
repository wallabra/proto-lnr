import { AIJump, AIStartArgs, AITickArgs } from "./defs";
import { EngageStartArgs } from "./states/engage";

export function commonPaths(
  args: AITickArgs,
): AIJump<unknown & AIStartArgs> | null {
  const { ship, play, soonPos } = args;

  if (ship.lastInstigator != null && ship.makeup.nextReadyCannon != null)
    return {
      next: "engage",
      args: { target: ship.lastInstigator },
    } as AIJump<EngageStartArgs>;

  if (
    play.terrain != null &&
    play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.6
  )
    return { next: "avoidTerrain" };

  return null;
}
