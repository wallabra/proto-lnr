//@flow
const m_tick = require('./tick.js');
const m_game = require('./game.js');
const m_ship = require('./ship.js');
const m_ai = require('./ai.js');
const m_player = require('./player.js');
const m_mouse = require('./mouse.js');
const m_terrain = require('./terrain.js');
const m_keyinput = require('./keyinput.js');
const Vec2 = require('victor');

m_mouse.registerMouseListener();

const canvas = document.querySelector("#game-canvas");
const game = new m_game.Game(canvas);
window.game = game;

m_keyinput.registerKeyListeners(game);

let ship1 = new m_ship.Ship();
game.addShip(ship1);

for (let i = 0; i < 40; i++) {
  let aiship = new m_ship.Ship();
  aiship.pos.add(Vec2(Math.random() * 400 + 30, 0).rotateBy(Math.random() * Math.PI * 2));
  aiship.lastPos = aiship.pos.clone();
  aiship.angle += Math.PI / 5 * i;
  game.addShip(aiship);
  game.addAI(new m_ai.AIController(aiship));
}

const player = new m_player.Player(ship1);
game.setPlayer(player);

game.setTerrain(new m_terrain.Terrain(m_terrain.defPlaceholder));

requestAnimationFrame(m_tick.tick.bind(null, game));