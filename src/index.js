//@flow
const m_tick = require('./tick.js');
const m_game = require('./game.js');
const m_ship = require('./ship.js');
const m_player = require('./player.js');

const canvas = document.querySelector("#game-canvas");
const game = new m_game.Game(canvas);
window.game = game;
game.addShip(new m_ship.Ship());

requestAnimationFrame(m_tick.tick.bind(null, game));