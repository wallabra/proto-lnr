export type InputCallback = (event: KeyboardEvent) => null;

function registerKey(key: string, callback: InputCallback) {
  function _listener(event) {
    if (event.key == key) {
      callback(event);
    }
  }

  document.addEventListener("keydown", _listener);
}

export function registerKeyListeners(game) {
  registerKey(" ", game.inputHandler.bind(game, "shoot"));
}
