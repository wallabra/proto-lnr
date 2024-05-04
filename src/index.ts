import { tickLoop } from "./tick";
import { Game } from "./game";
import { Player } from "./player";
import { defPlaceholder } from "./terrain";
import Vec2 from "victor";
import * as m_keyinput from "./keyinput";
import { PlayState } from "./superstates/play";

function main() {
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
  const player = new Player(game, playerShip);
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
