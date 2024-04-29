//@flow
const m_tick = require('./tick.js');
const m_game = require('./game.js');
const m_ship = require('./ship.js');
const m_ai = require('./ai.js');
const m_player = require('./player.js');
const m_mouse = require('./mouse.js');
const m_terrain = require('./terrain.js');

m_mouse.registerMouseListener();

const canvas = document.querySelector("#game-canvas");
const game = new m_game.Game(canvas);
window.game = game;

let ship1 = new m_ship.Ship();
game.addShip(ship1);

for (let i = 0; i < 15; i++) {
  let aiship = new m_ship.Ship();
  aiship.pos.y += 25 * i;
  aiship.lastPos.y += 25 * i;
  aiship.angle += Math.PI / 5 * i;
  game.addShip(aiship);
  game.addAI(new m_ai.AIController(aiship));
}

const player = new m_player.Player(ship1);
game.setPlayer(player);

game.setTerrain(new m_terrain.Terrain(m_terrain.defPlaceholder));

requestAnimationFrame(m_tick.tick.bind(null, game));