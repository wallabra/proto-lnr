import { Game } from "./game";

let lastTime: Date | null = null;
const frameDuration = 1000 / 30;

export function tickLoop(game: Game, current: Date) {
  if (lastTime == null) {
    requestAnimationFrame(tickLoop.bind(null, game));
    lastTime = current;
    return;
  }

  let deltaTime = (+current - +lastTime) / 1000;
  lastTime = current;

  if (deltaTime > frameDuration * 20) {
    console.warn(`Skipping tick due to huge lagspike: ${deltaTime}ms`);
  } else if (deltaTime > frameDuration) {
    console.warn(
      `Compensating for lag: ${deltaTime - frameDuration}ms behind target framerate!`,
    );
  }

  while (deltaTime > frameDuration) {
    processTick(game, frameDuration);
    deltaTime -= frameDuration;
  }

  requestAnimationFrame(tickLoop.bind(null, game));

  processTick(game, deltaTime);
}

function processTick(game: Game, deltaTime: number) {
  game.tick(deltaTime);
  game.render();
}
