//@flow
function registerKey(key, callback) {
  function _listener(event) {
    if (event.key == key) {
      callback(event);
    }
  }

  document.addEventListener('keydown', _listener);
}

export function registerKeyListeners(game) {
  registerKey(' ', game.inputHandler.bind(game, 'shoot'));
}