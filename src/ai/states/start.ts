import type { Nullish } from "utility-types";
import type { ShipItem } from "../../inventory";
import type { Pickup } from "../../objects/pickup";
import type { Ship } from "../../objects/ship";
import { commonPaths } from "../commonpaths";
import type { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";
import type { SeekCrateStartArgs } from "./seekcrate";

export class StartState implements AIHandler<AIStartArgs> {
	name = "start";

	private findPickupCrate(args: AITickArgs): Pickup<ShipItem> | null {
		const { ship, play } = args;
		const pos = ship.pos;
		const maxDist = 300 + ship.size * ship.lateralCrossSection * 1.5;
		let lastDist = Infinity;

		return play.tickables.reduce((a: Pickup<ShipItem> | null, b) => {
			if (b.type !== "pickup") return a;
			if (a == null) return b;
			const dist = (b as Pickup<ShipItem>).phys.pos.distance(pos);
			if (dist > Math.min(maxDist, lastDist - 10)) return a;
			lastDist = dist;
			return b as Pickup<ShipItem>;
		}, null) as Pickup<ShipItem> | null;
	}

	private roam(deltaTime: number, ship: Ship) {
		ship.thrustForward(deltaTime, 0.15);
		ship.steer(deltaTime * 0.03, Math.random() * Math.PI * 2);
	}

	aiTick(args: AITickArgs): AIJump | Nullish {
		const { ship, deltaTime } = args;

		const commonNext = commonPaths(args);
		if (commonNext != null && commonNext.next !== this.name) return commonNext;

		if (ship.pos.length() > 1500) return { next: "backToLand" };

		const foundCrate = this.findPickupCrate(args);
		if (foundCrate)
			return {
				next: "seekCrate",
				args: { crate: foundCrate },
			} as AIJump<SeekCrateStartArgs>;

		this.roam(deltaTime, ship);
	}
}
