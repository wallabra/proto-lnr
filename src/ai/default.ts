import type { AIStates } from "./ai";
import { AvoidTerrainState } from "./states/avoidterrain";
import { BackToLandState } from "./states/backtoland";
import { EngageState } from "./states/engage";
import { FleeState } from "./states/flee";
import { FollowState } from "./states/follow";
import { SeekCrateState } from "./states/seekcrate";
import { StartState } from "./states/start";

export const DEFAULT_AI_STATES: AIStates = {
	start: "start",
	states: [
		StartState,
		SeekCrateState,
		EngageState,
		BackToLandState,
		AvoidTerrainState,
		FollowState,
		FleeState,
	],
};
