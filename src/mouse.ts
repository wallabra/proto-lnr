import Victor from "victor";
import type { Game } from "./game";
import type { IntermissionState } from "./superstates/shop";
import match from "rustmatchjs";
import type { CanvasUIElement } from "./ui";

type MouseCallbackFunc = (e: MouseEvent) => void;

interface MouseCallback {
  name: string;
  callback: MouseCallbackFunc;
  original: MouseCallbackFunc;
}

export interface GameMouseInfo {
  pos: Victor;
  delta: Victor;
  name: string;
  rmb: boolean;
  inside: CanvasUIElement | null;
}

export interface GameMouseDragInfo extends GameMouseInfo {
  dragStart: Victor;
}

export abstract class MouseHandler {
  protected game: Game;
  public pos: Victor;
  public delta: Victor;
  private registry: MouseCallback[];

  constructor(game: Game) {
    this.game = game;
    this.pos = new Victor(0, 0);
    this.delta = new Victor(0, 0);
    this.registry = [];
  }

  public onMouseUpdate(e: MouseEvent) {
    this.delta = new Victor(
      (e.clientX - window.innerWidth / 2) / this.game.drawScale,
      (e.clientY - window.innerHeight / 2) / this.game.drawScale,
    ).subtract(this.pos);
    this.pos.x = (e.clientX - window.innerWidth / 2) / this.game.drawScale;
    this.pos.y = (e.clientY - window.innerHeight / 2) / this.game.drawScale;
  }

  public abstract onMouseEvent(e: MouseEvent & GameMouseInfo): void;

  private registerEvent(name: string, cb: MouseCallbackFunc) {
    cb = cb.bind(this) as MouseCallbackFunc;
    const bound = (ev: MouseEvent) => {
      const mev = ev as MouseEvent & GameMouseInfo;
      mev.pos = this.pos;
      mev.delta = this.delta;
      mev.name = name;
      mev.rmb = ev.button === 2;
      cb(mev);
    };
    document.addEventListener(name, bound, false);
    this.registry.push({ name: name, callback: bound, original: cb });
  }

  public register() {
    this.registerEvent(
      "mousemove",
      this.onMouseUpdate.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "mousemove",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "mouseup",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "mousedown",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "drag",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "dragenter",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "dragleave",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "dragstart",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "dragend",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "dragover",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
    this.registerEvent(
      "click",
      this.onMouseEvent.bind(this) as MouseCallbackFunc,
    );
  }

  public deregister() {
    for (const reg of this.registry) {
      document.removeEventListener(reg.name, reg.callback, false);
    }
  }
}

export class PlayMouseHandler extends MouseHandler {
  public steering = false;
  public shooting = false;

  public override onMouseEvent(e: MouseEvent & GameMouseInfo) {
    match(
      e.name,
      match.val("mousedown", () => {
        this.onMouseDown(e);
      }),
      match.val("mouseup", () => {
        this.onMouseUp(e);
      }),
      match._(() => {}),
    );
  }

  private onMouseDown(e: MouseEvent & GameMouseInfo) {
    if (e.rmb) this.shooting = true;
    else this.steering = true;
  }

  private onMouseUp(e: MouseEvent & GameMouseInfo) {
    if (e.rmb) this.shooting = false;
    else this.steering = false;
  }
}

export class GUIMouseHandler extends MouseHandler {
  public dragging: boolean;
  private dragStart: Victor | null = null;
  private dragStartElement: CanvasUIElement | null = null;

  constructor(game: Game) {
    super(game);
    this.dragging = false;
  }

  private onMouseDown(e: MouseEvent & GameMouseDragInfo) {
    this.dragging = true;
    this.dragStart = new Victor(e.x, e.y);
    const state = this.game.state as IntermissionState;
    e.name = "canvasdragstart";
    state.mouseEvent(e);
    this.dragStartElement = e.inside;
  }

  private onMouseUp(e: MouseEvent & GameMouseDragInfo) {
    if (this.dragging) {
      if (this.dragStart == null) {
        throw new Error("dragStart unset when dragging is true");
      }
      const state = this.game.state as IntermissionState;
      e.dragStart = this.dragStart;
      e.name = "canvasdragend";
      state.mouseEvent(e);
    }
    this.dragging = false;
    this.dragStart = null;
    this.dragStartElement = null;
  }

  private tryHandleDrag(e: MouseEvent & GameMouseInfo) {
    if (this.dragging) {
      this.onMouseDrag(e);
    }
  }

  public override onMouseEvent(e: MouseEvent & GameMouseInfo) {
    match(
      e.name,
      match.val("mousedown", () => {
        this.onMouseDown(e as MouseEvent & GameMouseDragInfo);
      }),
      match.val("mouseup", () => {
        this.onMouseUp(e as MouseEvent & GameMouseDragInfo);
      }),
      match.val("mousemove", () => {
        this.tryHandleDrag(e);
      }),
      match.val("click", () => {
        this.onClick(e);
      }),
      match._(() => {}),
    );
  }

  private onClick(e: MouseEvent & GameMouseInfo) {
    const state = this.game.state as IntermissionState;
    state.mouseEvent(e);
  }

  private onMouseDrag(e: MouseEvent & GameMouseInfo) {
    if (this.dragStart == null) return;

    const state = this.game.state as IntermissionState;
    e.name = "canvasdrag";
    (e as MouseEvent & GameMouseDragInfo).dragStart = this.dragStart;
    (e as MouseEvent & GameMouseDragInfo).inside = this.dragStartElement;
    state.mouseEvent(e);
  }
}
