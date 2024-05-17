import Vec2 from "victor";
import { Game } from "./game";
import IntermissionState from "./superstates/shop";
import match from "rustmatchjs";
import { CanvasUIElement } from "./ui";

interface MouseCallback {
  name: string;
  callback: (e: MouseEvent) => void;
  original: (e: MouseEvent) => void;
}

export interface GameMouseInfo {
  pos: Vec2;
  delta: Vec2;
  name: string;
  inside: CanvasUIElement | null;
}

export interface GameMouseDragInfo extends GameMouseInfo {
  dragStart: Vec2;
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

  abstract onMouseEvent(e: MouseEvent & GameMouseInfo);

  registerEvent(name, cb) {
    cb = cb.bind(this);
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
    this.registerEvent("mousemove", this.onMouseEvent);
    this.registerEvent("mouseup", this.onMouseEvent);
    this.registerEvent("mousedown", this.onMouseEvent);
    this.registerEvent("drag", this.onMouseEvent);
    this.registerEvent("dragenter", this.onMouseEvent);
    this.registerEvent("dragleave", this.onMouseEvent);
    this.registerEvent("dragstart", this.onMouseEvent);
    this.registerEvent("dragend", this.onMouseEvent);
    this.registerEvent("dragover", this.onMouseEvent);
    this.registerEvent("click", this.onMouseEvent);
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

  onMouseEvent(e: MouseEvent & GameMouseInfo) {
    match(
      e.name,
      match.val("mousedown", () => this.onMouseDown()),
      match.val("mouseup", () => this.onMouseUp()),
      match._(() => {}),
    );
  }

  private onMouseDown() {
    this.steering = true;
  }

  private onMouseUp() {
    this.steering = false;
  }
}

export class IntermissionMouseHandler extends MouseHandler {
  dragging: boolean;
  dragStart?: Vec2;
  dragStartElement?: CanvasUIElement;

  constructor(game: Game) {
    super(game);
    this.dragging = false;
  }

  private onMouseDown(e) {
    this.dragging = true;
    this.dragStart = Vec2(e.x, e.y);
    const state = <IntermissionState>this.game.state;
    e.name = "canvasdragstart";
    state.mouseEvent(e);
    this.dragStartElement = e.inside;
  }

  private onMouseUp(e) {
    if (this.dragging) {
      const state = <IntermissionState>this.game.state;
      e.dragStart = this.dragStart;
      e.name = "canvasdragend";
      state.mouseEvent(e);
    }
    this.dragging = false;
  }

  private tryHandleDrag(e: MouseEvent & GameMouseInfo) {
    if (this.dragging) {
      this.onMouseDrag(e);
    }
  }

  onMouseEvent(e: MouseEvent & GameMouseInfo) {
    match(
      e.name,
      match.val("mousedown", () => this.onMouseDown(e)),
      match.val("mouseup", () => this.onMouseUp(e)),
      match.val("mousemove", () => this.tryHandleDrag(e)),
      match.val("click", () => this.onClick(e)),
      match._(() => {}),
    );
  }

  private onClick(e: MouseEvent & GameMouseInfo) {
    const state = <IntermissionState>this.game.state;
    state.mouseEvent(e);
  }

  private onMouseDrag(e: MouseEvent & GameMouseInfo) {
    const state = <IntermissionState>this.game.state;
    e.name = "canvasdrag";
    (<MouseEvent & GameMouseDragInfo>e).dragStart = this.dragStart;
    (<MouseEvent & GameMouseDragInfo>e).inside = this.dragStartElement;
    state.mouseEvent(e);
  }
}
