import type { AIJump, AITickArgs } from "./defs";
import type { EngageStartArgs } from "./states/engage";
import type { FleeStartArgs } from "./states/flee";

export function commonPaths(args: AITickArgs): AIJump | null {
	const { ship, play, soonPos, stateName } = args;

	if (ship.lastInstigator != null) {
		const target = ship.lastInstigator;

		if (
			ship.makeup.nextReadyCannon != null &&
			!(target.makeup.nextReadyCannon != null && ship.makeup.shouldFlee())
		)
			return {
				next: "engage",
				args: { target: target },
			} as AIJump<EngageStartArgs>;
		else if (
			ship.pos.clone().subtract(target.pos).length() <
				(target.maxShootRange ?? 500) * 2 &&
			target.makeup.getPartsOf("cannon").length > 0
		)
			return { next: "flee", args: { target } } as AIJump<FleeStartArgs>;
	}

	if (stateName === "engage") return null;

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

	// instigate / flee from chasers
	if (ship.chasers.size > 0) {
		const instigate = Array.from(ship.chasers).sort(
			(a, b) =>
				+(a.makeup.nextReadyCannon == null) -
				+(b.makeup.nextReadyCannon == null),
		)[0];

		ship.aggro(instigate);
		return { next: "engage" };
	}

	// loose terrain avoid
	if (
		play.terrain != null &&
		play.terrain.heightAt(soonPos.x, soonPos.y) > play.waterLevel * 0.55
	)
		return { next: "avoidTerrain" };
	if (stateName === "avoidTerrain") return null;

	return null;
}
