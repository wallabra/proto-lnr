import type { Game } from "../game";

export abstract class Superstate {
	game: Game;

	constructor(game: Game) {
		this.game = game;
	}

	get canvas() {
		return this.game.canvas;
	}

	get drawCtx() {
		return this.game.drawCtx;
	}

	get player() {
		return this.game.player;
	}

	public abstract tick(deltaTime: number, frameTime: number): void;
	public abstract render(alpha: number): void;
	public deinit() {}
	public init() {}
}
