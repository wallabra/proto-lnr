import { AIController } from "./ai";
import { Ship } from "../objects/ship";
import { Game } from "../game";
import { PlayState } from "../superstates/play";
import Vec2 from "victor";

export type UnknownAIHandler = AIHandler<
  unknown & AIStartArgs,
  unknown & AITickArgs
>;

export interface AIJump<A extends AIStartArgs = AIStartArgs> {
  next: string;
  args?: Exclude<A, AIStartArgs>;
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
  soonPos: Vec2;
  dHeight: number;
  deltaTime: number;
}

export interface AIHandler<
  StartArgs extends AIStartArgs,
  TickArgs extends AITickArgs,
> {
  name: string;
  start?(args: StartArgs);
  free?();
  aiTick(args: TickArgs): AIJump<unknown & AIStartArgs> | void;
}
