import { tickLoop } from "./tick";
import { Game } from "./game";
import { defPlaceholder } from "./terrain";

function main() {
  const canvas = <HTMLCanvasElement | undefined>(
    document.querySelector("#game-canvas")
  );
  if (canvas == null) {
    return;
  }

  const game = new Game(canvas);
  game.nextLevel(defPlaceholder);

  requestAnimationFrame(tickLoop.bind(null, game));
}

main();
