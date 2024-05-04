import { tickLoop } from "./tick.js";
import { Game } from "./game.js";
import { Player } from "./player.js";
import { defPlaceholder } from "./terrain.js";
import Vec2 from "victor";
import * as m_mouse from "./mouse.js";
import * as m_keyinput from "./keyinput.js";
import { PlayState } from "./superstates/play.js";

function main() {
  m_mouse.registerMouseListener();

  const canvas = <HTMLCanvasElement | undefined>(
    document.querySelector("#game-canvas")
  );
  if (canvas == null) {
    return;
  }

  const game = new Game(canvas);
  const play = game.setState(PlayState, defPlaceholder);

  m_keyinput.registerKeyListeners(game);

  const playerShip = play.makeShip(Vec2(0, -600));
  const player = new Player(playerShip);
  game.setPlayer(player);

  let toSpawn = 40;

  while (toSpawn > 0) {
    const aiship = play.makeShip(
      /*pos   */ Vec2(Math.random() * 1500 + 400, 0).rotateBy(
        Math.random() * Math.PI * 2,
      ),
      /*params*/ { angle: Math.random() * Math.PI * 2 },
    );
    if (aiship.floor > play.waterLevel * 0.5) {
      aiship.die();
      continue;
    }
    play.makeAIFor(aiship);
    //aiship.setInstigator(playerShip);
    toSpawn--;
  }

  requestAnimationFrame(tickLoop.bind(null, game));
}

main();
