import { Game } from "./game";
import * as internationalization from "./internationalization";
import { Ticker } from "./tick";

function main() {
	internationalization.init();

	const canvas = document.querySelector("#game-canvas");
	if (canvas == null || !(canvas instanceof HTMLCanvasElement)) {
		return;
	}

	const game = new Game(canvas);
	(window as Window & typeof globalThis & { game?: Game }).game = game;

	const ticker = new Ticker(game);
	ticker.start();
}

main();
