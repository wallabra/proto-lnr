import type { Game } from "./game";

export type InputCallback = (event: KeyboardEvent) => void;

interface KeyRegister {
  key: string;
  listener: InputCallback;
}

export abstract class KeyHandler {
  registry: KeyRegister[] = [];
  game: Game;
  heldKeys = new Map<string, () => void>();

  constructor(game: Game) {
    this.game = game;
  }

  protected registerKey(key: string, callback: InputCallback) {
    const listener = (event: KeyboardEvent) => {
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
    const listenerDown: InputCallback = (event: KeyboardEvent) => {
      if (event.key == key) {
        this.heldKeys.set(key, callback.bind(this, event) as () => void);
      }
    };

    const listenerUp: InputCallback = (event: KeyboardEvent) => {
      if (event.key == key) {
        this.heldKeys.delete(key);
      }
    };

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

  abstract register(): void;

  deregister() {
    for (const reg of this.registry) {
      document.removeEventListener("keydown", reg.listener, false);
    }
    this.registry = [];
  }

  tick() {
    for (const checker of Array.from(this.heldKeys.values())) {
      checker();
    }
  }
}

export class PlayKeyHandler extends KeyHandler {
  register() {
    this.registerKey(
      "r",
      this.game.inputHandler.bind(this.game, "RESTART") as InputCallback,
    );
    this.registerKey(
      " ",
      this.game.inputHandler.bind(this.game, "shoot") as InputCallback,
    );
    this.registerKey(
      "l",
      this.game.inputHandler.bind(this.game, "shop") as InputCallback,
    );
    this.registerKey(
      "h",
      this.game.inputHandler.bind(this.game, "hud") as InputCallback,
    );
    this.registerKey(
      "p",
      this.game.inputHandler.bind(this.game, "pause") as InputCallback,
    );
    this.registerHeldKey(
      "w",
      this.game.inputHandler.bind(this.game, "thrustForward") as InputCallback,
    );
    this.registerHeldKey(
      "s",
      this.game.inputHandler.bind(this.game, "thrustBackward") as InputCallback,
    );
    this.registerHeldKey(
      "a",
      this.game.inputHandler.bind(this.game, "steerLeft") as InputCallback,
    );
    this.registerHeldKey(
      "d",
      this.game.inputHandler.bind(this.game, "steerRight") as InputCallback,
    );
  }
}

export class GUIKeyHandler extends KeyHandler {
  register() {
    //this.registerKey("r", this.game.inputHandler.bind(this.game, "tryRepair"));
  }
}
