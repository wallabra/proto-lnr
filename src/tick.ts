import type { Game } from "./game";
import { Options } from "./options";

export class Ticker {
	lastTime: number | null = null;
	accumulator = 0;
	errored = false;
	game: Game;

	constructor(game: Game) {
		this.game = game;
	}

	getFixedStep() {
		return 1000 / (Options.staticTickrate ?? 30);
	}

	stepTick(current: number | null) {
		if (this.lastTime === null || current == null) {
			this.lastTime = current;
			return;
		}

		const fixedStep = this.getFixedStep();
		const deltaTime = +current - +this.lastTime;
		this.lastTime = current;

		const cappedDelta = Math.min(deltaTime, 200);
		this.accumulator += cappedDelta;

		try {
			while (this.accumulator >= fixedStep) {
				this.game.tick(fixedStep / 1000, this.accumulator / 1000); // also pass real frame time
				this.accumulator -= fixedStep;
			}
			const alpha = this.accumulator / fixedStep;
			this.game.render(alpha);
		} catch (e) {
			this.errored = true;
			throw e;
		}
	}

	protected tickLoop = (current: number | null) => {
		if (this.errored) return;

		requestAnimationFrame(this.tickLoop);

		this.stepTick(current);
	};

	start() {
		this.errored = false;
		this.lastTime = null;
		this.accumulator = 0;
		requestAnimationFrame(this.tickLoop);
	}
}
