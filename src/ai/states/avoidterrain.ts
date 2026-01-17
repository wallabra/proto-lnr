import type { Nullish } from "utility-types";
import { commonPaths } from "../commonpaths";
import type { AIHandler, AIJump, AIStartArgs, AITickArgs } from "../defs";

const TERRAIN_PANIC_SCALE = 5;

export class AvoidTerrainState implements AIHandler<AIStartArgs> {
	name = "avoidTerrain";

	aiTick(args: AITickArgs): Nullish | AIJump {
		const { play, soonPos } = args;

		const commonNext = commonPaths(args);
		if (commonNext != null && commonNext.next !== this.name) return commonNext;

		if (
			play.terrain == null ||
			play.terrain.heightAt(soonPos.x, soonPos.y) < play.waterLevel * -0.2
		)
			return { next: "start" };

		const { ship, deltaTime } = args;

		const { dHeight } = args;
		const dir = dHeight.clone().invert();
		ship.steer(deltaTime, dir.angle());
		const dot = ship.angNorm.dot(dir.norm());
		const thrust = Math.tanh(dot * TERRAIN_PANIC_SCALE);
		ship.thrustForward(deltaTime, thrust);
	}
}
