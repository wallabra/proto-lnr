import { render } from "./render.js";

let lastTime = null;
const frameDuration = 1000 / 60;

export function tick(game: Game, current: Date) {
  if (lastTime == null) {
    requestAnimationFrame(tick.bind(null, game));
    lastTime = current;
    return;
  }

  let deltaTime = (current - lastTime) / 1000;
  lastTime = current;

  while (deltaTime > frameDuration) {
    processTick(game, frameDuration);
    deltaTime -= frameDuration;
  }

  requestAnimationFrame(tick.bind(null, game));

  processTick(game, deltaTime);
  render(game);
}

function processTick(game: Game, deltaTime: Dates) {
  game.tick(deltaTime);
}
