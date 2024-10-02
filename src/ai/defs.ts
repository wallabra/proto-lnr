import { AIController } from "./ai";
import { Ship } from "../objects/ship";
import { Game } from "../game";
import { PlayState } from "../superstates/play";
import Victor from "victor";
import { Nullish } from "utility-types";

export type UnknownAIHandler = AIHandler<unknown & AIStartArgs>;

export interface AIJump<A extends AIStartArgs = AIStartArgs> {
  next: string;
  args?: Exclude<A, AIStartArgs>;
  immediate?: boolean;
}

export interface AIStartArgs {
  ai: AIController;
  ship: Ship;
  from: string | null;
}

export interface AITickArgs {
  ai: AIController;
  ship: Ship;
  game: Game;
  play: PlayState;
  soonPos: Victor;
  dHeight: Victor;
  deltaTime: number;
  state: UnknownAIHandler;
  stateName: string;
}

export interface AIHandler<StartArgs extends AIStartArgs> {
  name: string;
  start?(args: StartArgs);
  free?();
  aiTick(args: AITickArgs): AIJump<unknown & AIStartArgs> | Nullish;
}
