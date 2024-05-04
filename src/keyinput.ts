import { Game } from "./game";

export type InputCallback = (event: KeyboardEvent) => void;

interface KeyRegister {
  key: string;
  listener: InputCallback;
}

export abstract class KeyHandler {
  registry: Array<KeyRegister>;
  game: Game;

  constructor(game: Game) {
    this.game = game;
    this.registry = [];
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

  abstract register();

  deregister() {
    for (const reg of this.registry) {
      document.removeEventListener("keydown", reg.listener, false);
    }
    this.registry = [];
  }
}

export class PlayKeyHandler extends KeyHandler {
  register() {
    this.registerKey(" ", this.game.inputHandler.bind(this.game, "shoot"));
    this.registerKey("s", this.game.inputHandler.bind(this.game, "shop"));
  }
}

export class IntermissionKeyHandler extends KeyHandler {
  register() {
    this.registerKey("s", this.game.inputHandler.bind(this.game, "tryRepair"));
  }
}
