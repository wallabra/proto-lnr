//@flow
const m_tick = require('./tick.js');
const m_game = require('./game.js');
const m_ship = require('./ship.js');
const m_player = require('./player.js');
const m_mouse = require('./mouse.js');

m_mouse.registerMouseListener();

const canvas = document.querySelector("#game-canvas");
const game = new m_game.Game(canvas);
window.game = game;

let ship1 = new m_ship.Ship();
game.addShip(ship1);

let ship2 = new m_ship.Ship();
ship2.pos.y += 80;
ship2.lastPos.y += 80;
ship2.angle += Math.PI / 4;
game.addShip(ship2);

let ship3 = new m_ship.Ship();
ship3.pos.y += 160;
ship3.lastPos.y += 160;
ship3.angle += Math.PI / 2;
game.addShip(ship3);

const player = new m_player.Player(ship1);
game.setPlayer(player);

requestAnimationFrame(m_tick.tick.bind(null, game));