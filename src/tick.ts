import { render } from "./render.js";

let lastTime = null;
const frameDuration = 1000 / 30;

export function tick(game: Game, current: Date) {
  if (lastTime == null) {
    requestAnimationFrame(tick.bind(null, game));
    lastTime = current;
    return;
  }

  let deltaTime = (current - lastTime) / 1000;
  lastTime = current;
  
  if (deltaTime > frameDuration * 20) {
    console.warn(`Skipping tick due to huge lagspike: {deltaTime}ms`);
  }

  else if (deltaTime > frameDuration) {
    console.warn(`Compensating for lag: {deltaTime - frameDuration}ms behind target framerate!`);
  }
  
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
