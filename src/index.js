const m_game = require('./game.js');
const m_render = require('./render.js');
const m_player = require('./player.js');
const m_ship = require('./ship.js');

const canvas = document.querySelector("#game-canvas");
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const drawCtx = canvas.getContext('2d');
drawCtx.width = canvas.getBoundingClientRect().width;
drawCtx.height = canvas.getBoundingClientRect().height;

var game = new m_game.Game();

game.addShip(new m_ship.Ship());

m_render.render(drawCtx, game);