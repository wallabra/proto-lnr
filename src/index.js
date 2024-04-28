const m_tick = require('./tick.js');

const canvas = document.querySelector("#game-canvas");
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

var game = new m_game.Game(canvas, drawCtx);
game.addShip(new m_ship.Ship());

requestAnimationFrame(m_tick.tick(game));