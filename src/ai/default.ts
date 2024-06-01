import { AIStates } from "./ai";
import { StartState } from "./states/start";
import { SeekCrateState } from "./states/seekcrate";
import { EngageState } from "./states/engage";
import { BackToLandState } from "./states/backtoland";
import { AvoidTerrainState } from "./states/avoidterrain";

export const DEFAULT_AI_STATES: AIStates = {
  start: "start",
  states: [
    StartState,
    SeekCrateState,
    EngageState,
    BackToLandState,
    AvoidTerrainState,
  ],
};
