import { tick } from "./tick.js";
import { Game } from "./game.js";
import { AIController } from "./ai.js";
import { Player } from "./player.js";
import { defPlaceholder } from "./terrain.js";
import Vec2 from "victor";
import * as m_mouse from "./mouse.js";
import * as m_keyinput from "./keyinput.js";

m_mouse.registerMouseListener();

const canvas = document.querySelector("#game-canvas");
const game = new Game(canvas, defPlaceholder);
window.game = game;

m_keyinput.registerKeyListeners(game);

const playerShip = game.makeShip(Vec2(0, -600));
const player = new Player(playerShip);
game.setPlayer(player);

let toSpawn = 40;

while (toSpawn > 0) {
  const aiship = game.makeShip(
    /*pos   */ Vec2(Math.random() * 1500 + 400, 0).rotateBy(
      Math.random() * Math.PI * 2,
    ),
    /*params*/ { angle: Math.random() * Math.PI * 2 },
  );
  if (aiship.floor > game.waterLevel * 0.5) {
    aiship.die();
    continue;
  }
  game.addAI(new AIController(aiship));
  aiship.setInstigator(playerShip);
  toSpawn--;
}

requestAnimationFrame(tick.bind(null, game));
