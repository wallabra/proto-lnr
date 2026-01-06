import type { Nullish, Subtract } from "utility-types";
import type Victor from "victor";
import type { Game } from "../game";
import type { Ship } from "../objects/ship";
import type { PlayState } from "../superstates/play";
import type { AIController } from "./ai";

export type UnknownAIHandler = AIHandler<AIStartArgs>;

export interface AIJump<A extends AIStartArgs = AIStartArgs> {
	next: string;
	args?: Subtract<A, AIStartArgs>;
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
	start?(args: StartArgs): void;
	free?(): void;
	aiTick(args: AITickArgs): AIJump | Nullish;
}
