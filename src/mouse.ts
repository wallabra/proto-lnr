import Vec2 from "victor";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";

interface MouseCallback {
  name: string;
  callback: (e: MouseEvent) => void;
  original: (e: MouseEvent) => void;
}

export interface GameMouseInfo {
  pos: Vec2;
  delta: Vec2;
  name: string;
}

export default abstract class MouseHandler {
  game: Game;
  pos: Vec2;
  delta: Vec2;
  registry: Array<MouseCallback>;

  constructor(game: Game) {
    this.game = game;
    this.pos = Vec2(0, 0);
    this.delta = Vec2(0, 0);
    this.registry = [];
  }

  onMouseUpdate(e: MouseEvent) {
    this.delta = Vec2(
      (e.clientX - window.innerWidth / 2) / this.game.drawScale,
      (e.clientY - window.innerHeight / 2) / this.game.drawScale,
    ).subtract(this.pos);
    this.pos.x = (e.clientX - window.innerWidth / 2) / this.game.drawScale;
    this.pos.y = (e.clientY - window.innerHeight / 2) / this.game.drawScale;
  }

  abstract onMouseDown(e: MouseEvent & GameMouseInfo);
  abstract onMouseUp(e: MouseEvent & GameMouseInfo);
  abstract onMouseDrag(e: MouseEvent & GameMouseInfo);

  registerEvent(name, cb) {
    const bound = (ev: MouseEvent) => {
      const mev = <MouseEvent & GameMouseInfo>ev;
      mev.pos = this.pos;
      mev.delta = this.delta;
      mev.name = name;
      cb(mev);
    };
    document.addEventListener(name, bound, false);
    this.registry.push({ name: name, callback: bound, original: cb });
  }

  register() {
    this.registerEvent("mousemove", this.onMouseUpdate);
    this.registerEvent("mouseup", this.onMouseUp);
    this.registerEvent("mousedown", this.onMouseDown);
    this.registerEvent("mousedrag", this.onMouseDrag);
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

  onMouseDrag() {}
}

export class IntermissionMouseHandler extends MouseHandler {
  onMouseDown(e: MouseEvent & GameMouseInfo) {
    const state = <IntermissionState>this.game.state;
    state.mouseEvent(e);
  }

  onMouseUp() {
    // no-op
  }

  onMouseDrag(e: MouseEvent & GameMouseInfo) {
    const state = <IntermissionState>this.game.state;
    state.mouseEvent(e);
  }
}
