import type { AIStates } from "./ai";
import { StartState } from "./states/start";
import { SeekCrateState } from "./states/seekcrate";
import { EngageState } from "./states/engage";
import { BackToLandState } from "./states/backtoland";
import { AvoidTerrainState } from "./states/avoidterrain";
import { FollowState } from "./states/follow";
import { FleeState } from "./states/flee";

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
