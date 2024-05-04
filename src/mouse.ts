import Vec2 from "victor";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";

interface MouseCallback {
  name: string;
  callback: (e: MouseEvent) => void;
  original: (e: MouseEvent) => void;
}

export default abstract class MouseHandler {
  game: Game;
  pos: Vec2;
  registry: Array<MouseCallback>;

  constructor(game: Game) {
    this.game = game;
    this.pos = Vec2(0, 0);
    this.registry = [];
  }

  onMouseUpdate(e: MouseEvent) {
    this.pos.x = (e.clientX - window.innerWidth / 2) / this.game.drawScale;
    this.pos.y = (e.clientY - window.innerHeight / 2) / this.game.drawScale;
  }

  abstract onMouseDown(e: MouseEvent);
  abstract onMouseUp(e: MouseEvent);

  registerEvent(name, cb) {
    const bound = cb.bind(this);
    document.addEventListener(name, bound, false);
    this.registry.push({ name: name, callback: bound, original: cb });
  }

  register() {
    this.registerEvent("mousemove", this.onMouseUpdate);
    this.registerEvent("mouseup", this.onMouseUp);
    this.registerEvent("mousedown", this.onMouseDown);
  }

  deregister() {
    for (const reg of this.registry) {
      document.removeEventListener(reg.name, reg.callback, false);
    }
  }
}

export class PlayMouseHandler extends MouseHandler {
  steering: boolean;

  constructor(game: Game) {
    super(game);
    this.steering = false;
  }

  onMouseDown() {
    this.steering = true;
  }

  onMouseUp() {
    this.steering = false;
  }
}

export class IntermissionMouseHandler extends MouseHandler {
  onMouseDown(e: MouseEvent) {
    const state = <IntermissionState>this.game.state;
    state.mouseEvent(e);
  }

  onMouseUp() {
    // no-op
  }
}
