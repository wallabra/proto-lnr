import { AIJump, AIStartArgs, AITickArgs } from "./defs";
import { EngageStartArgs } from "./states/engage";

export function commonPaths(
  args: AITickArgs,
): AIJump<unknown & AIStartArgs> | null {
  const { ship } = args;

  if (ship.lastInstigator != null && ship.makeup.nextReadyCannon != null)
    return {
      next: "engage",
      args: { target: ship.lastInstigator },
    } as AIJump<EngageStartArgs>;

  return null;
}
