import { tickLoop } from "./tick";
import { Game } from "./game";
import * as internationalization from "./internationalization";

function main() {
  internationalization.init();

  const canvas = document.querySelector("#game-canvas");
  if (canvas == null || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }

  const game = new Game(canvas);
  (window as Window & typeof globalThis & { game?: Game }).game = game;

  requestAnimationFrame(tickLoop.bind(null, game) as (when: number) => void);
}

main();
