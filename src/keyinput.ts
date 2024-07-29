import { Game } from "./game";

export type InputCallback = (event: KeyboardEvent) => void;

interface KeyRegister {
  key: string;
  listener: InputCallback;
}

export abstract class KeyHandler {
  registry: Array<KeyRegister>;
  game: Game;
  heldKeys: { [key: string]: () => void };

  constructor(game: Game) {
    this.game = game;
    this.registry = [];
    this.heldKeys = {};
  }

  protected registerKey(key: string, callback: InputCallback) {
    const listener = (event) => {
      if (event.key == key) {
        callback(event);
      }
    };

    document.addEventListener("keydown", listener, false);
    this.registry.push({
      key: key,
      listener: listener,
    });
  }

  protected registerHeldKey(key: string, callback: InputCallback) {
    const listenerDown = ((event) => {
      if (event.key == key) {
        this.heldKeys[key] = callback.bind(this, event);
      }
    }).bind(this);

    const listenerUp = ((event) => {
      if (event.key == key) {
        delete this.heldKeys[key];
      }
    }).bind(this);

    document.addEventListener("keydown", listenerDown, false);
    document.addEventListener("keyup", listenerUp, false);
    this.registry.push(
      {
        key: key,
        listener: listenerDown,
      },
      {
        key: key,
        listener: listenerDown,
      },
    );
  }

  abstract register();

  deregister() {
    for (const reg of this.registry) {
      document.removeEventListener("keydown", reg.listener, false);
    }
    this.registry = [];
  }

  tick() {
    for (const key of Object.keys(this.heldKeys)) {
      this.heldKeys[key]();
    }
  }
}

export class PlayKeyHandler extends KeyHandler {
  register() {
    this.registerKey("r", this.game.inputHandler.bind(this.game, "RESTART"));
    this.registerKey(" ", this.game.inputHandler.bind(this.game, "shoot"));
    this.registerKey("l", this.game.inputHandler.bind(this.game, "shop"));
    this.registerKey("h", this.game.inputHandler.bind(this.game, "hud"));
    this.registerKey("p", this.game.inputHandler.bind(this.game, "pause"));
    this.registerHeldKey(
      "w",
      this.game.inputHandler.bind(this.game, "thrustForward"),
    );
    this.registerHeldKey(
      "s",
      this.game.inputHandler.bind(this.game, "thrustBackward"),
    );
    this.registerHeldKey(
      "a",
      this.game.inputHandler.bind(this.game, "steerLeft"),
    );
    this.registerHeldKey(
      "d",
      this.game.inputHandler.bind(this.game, "steerRight"),
    );
  }
}

export class GUIKeyHandler extends KeyHandler {
  register() {
    this.registerKey("r", this.game.inputHandler.bind(this.game, "tryRepair"));
  }
}
