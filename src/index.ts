import { tickLoop } from "./tick";
import { Game } from "./game";

function main() {
  const canvas = <HTMLCanvasElement | undefined>(
    document.querySelector("#game-canvas")
  );
  if (canvas == null) {
    return;
  }

  const game = new Game(canvas);
  (window as Window & typeof globalThis & { game?: Game }).game = game;

  requestAnimationFrame(tickLoop.bind(null, game));
}

main();
