//@flow
const m_tick = require('./tick.js');
const m_game = require('./game.js');
const m_ship = require('./objects/ship.js');
const m_ai = require('./ai.js');
const m_player = require('./player.js');
const m_mouse = require('./mouse.js');
const m_terrain = require('./terrain.js');
const m_keyinput = require('./keyinput.js');
const Vec2 = require('victor');

m_mouse.registerMouseListener();

const canvas = document.querySelector("#game-canvas");
const game = new m_game.Game(canvas, m_terrain.defPlaceholder);
window.game = game;

m_keyinput.registerKeyListeners(game);

let ship1 = game.makeShip();

let toSpawn = 40;

while (toSpawn > 0) {
  let aiship = game.makeShip(
    /*pos   */ Vec2(Math.random() * 500 + 150, 0).rotateBy(Math.random() * Math.PI * 2),
    /*params*/ { angle: Math.random() * Math.PI * 2 }
  );
  if (aiship.floor > game.waterLevel) {
    aiship.die();
    continue;
  }
  game.addAI(new m_ai.AIController(aiship));
  toSpawn--;
}

const player = new m_player.Player(ship1);
game.setPlayer(player);

requestAnimationFrame(m_tick.tick.bind(null, game));