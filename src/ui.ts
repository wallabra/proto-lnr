// UI utilities for the canvas.
import { Game } from "./game";

export interface UIEvent {
  x: number;
  y: number;
}

export interface UIDrawContext {
  ctx: CanvasRenderingContext2D;
  game: Game;
}

export type UIAlign = "start" | "center" | "end";

export function computeDock(
  align: UIAlign,
  base: number,
  offset: number,
  dockMargin: number,
) {
  if (align == "center") {
    base += offset / 2;
  } else if (align == "end") {
    base += offset - dockMargin;
  } else if (align == "start") {
    base += dockMargin;
  }

  return base;
}

export function computeAlign(align: UIAlign, base: number, offset: number) {
  if (align == "center") {
    base -= offset / 2;
  } else if (align == "end") {
    base -= offset;
  }

  return base;
}

export function computeAlignCheckDock(
  align: UIAlign,
  dock: UIAlign,
  base: number,
  offset: number,
) {
  if (dock == "end") {
    base -= offset;
  } else if (dock == "center") {
    base -= offset / 2;
  } else if (align == "center") {
    base -= offset / 2;
  } else if (align == "end") {
    base += offset;
  }

  return base;
}

export abstract class CanvasUIElement {
  parent: CanvasUIElement | undefined;
  children: Array<CanvasUIElement>;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden: boolean;
  alignX: UIAlign;
  alignY: UIAlign;
  dockX: UIAlign;
  dockY: UIAlign;
  dockMarginX: number;
  dockMarginY: number;
  fillX: boolean;
  fillY: boolean;
  paddingX: number;
  paddingY: number;

  constructor(parent, x, y, width, height) {
    this.parent = parent;
    this.children = [];

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hidden = false;
    this.alignX = "start";
    this.alignY = "start";
    this.dockX = "start";
    this.dockY = "start";
    this.dockMarginX = 0;
    this.dockMarginY = 0;
    this.fillX = false;
    this.fillY = false;
    this.paddingX = 8;
    this.paddingY = 8;

    if (this.parent != null) {
      this.parent.children.push(this);
    }
  }

  get realWidth() {
    if (this.fillX && this.parent != null) {
      return this.parent.realWidth;
    } else {
      return this.width;
    }
  }

  get realHeight() {
    if (this.fillY && this.parent != null) {
      return this.parent.realHeight;
    } else {
      return this.height;
    }
  }

  get innerWidth() {
    return this.realWidth - this.paddingX * 2;
  }

  get innerHeight() {
    return this.realHeight - this.paddingY * 2;
  }

  destroy() {
    const idx = this.parent.children.indexOf(this);
    if (this.parent != null && idx != -1) {
      this.parent.children.splice(idx, 1);
    }
  }

  checkChangeDimensions(width, height) {
    let changed = false;

    if (width != this.width) {
      this.width = width;
      changed = true;
    }

    if (height != this.height) {
      this.height = height;
      changed = true;
    }

    if (changed) {
      this.propagateUpdate();
    }
  }

  checkPropagateUpdate() {
    if (this.fillX || this.fillY) {
      this.propagateUpdate();
    }
  }

  propagateUpdate() {
    for (const child of this.children) {
      child.checkPropagateUpdate();
    }
  }

  pos() {
    let x = this.x;
    let y = this.y;

    if (this.parent != null) {
      const pp = this.parent.innerPos();
      x += pp.x;
      y += pp.y;

      x = computeDock(this.dockX, x, this.parent.innerWidth, this.dockMarginX);
      y = computeDock(this.dockY, y, this.parent.innerHeight, this.dockMarginY);
    }

    x = computeAlignCheckDock(this.alignX, this.dockX, x, this.realWidth);
    y = computeAlignCheckDock(this.alignY, this.dockY, y, this.realHeight);

    return {
      x: x,
      y: y,
    };
  }

  innerPos() {
    const pos = this.pos();
    pos.x += this.paddingX;
    pos.y += this.paddingY;
    return pos;
  }

  isInside(x, y) {
    const pos = this.pos();
    x -= pos.x;
    y -= pos.y;

    return !(x < 0 || y < 0 || x > this.realWidth || y > this.realHeight);
  }

  public handleEvent<E extends UIEvent>(e: E) {
    if (!this.isInside(e.x, e.y)) {
      return false;
    }

    console.log("Clicked on", this);
    this.event(e);
    this.dispatchEvent(e);
    return true;
  }

  private dispatchEvent<E extends UIEvent>(e: E) {
    for (const child of this.children) {
      child.handleEvent(e);
    }
  }

  abstract event<E extends UIEvent>(e: E);
  abstract _render(ctx: UIDrawContext);

  render(ctx: UIDrawContext) {
    if (this.hidden) {
      return;
    }

    this._render(ctx);

    for (const child of this.children) {
      child.render(ctx);
    }
  }
}

export class CanvasRoot extends CanvasUIElement {
  game: Game;
  bgColor: string;

  constructor(game, bgColor = "#050505") {
    super(null, 0, 0, 0, 0);
    this.game = game;
    this.bgColor = bgColor;
  }

  get realWidth() {
    return this.game.width;
  }

  get realHeight() {
    return this.game.height;
  }

  _render(uictx: UIDrawContext): void {
    const ctx = uictx.ctx;
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, this.game.width, this.game.height);
  }

  event() {}
}

export class CanvasButton extends CanvasUIElement {
  label: string | null;
  callback: (e: UIEvent) => void;
  bgColor: string;

  constructor(parent, x, y, width, height, label, callback) {
    super(parent, x, y, width, height);
    this.label = label;
    this.callback = callback;
    this.bgColor = "#aaa";
  }

  event<E extends UIEvent>(e: E) {
    this.callback(e);
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = "#222";
    ctx.fillRect(pos.x, pos.y, this.width, this.height);

    if (this.label == null) {
      return;
    }

    ctx.fillStyle = this.bgColor;
    ctx.font = this.height / 2 + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.label,
      pos.x + this.width / 2,
      pos.y + this.height / 2,
      this.width - 4,
    );
  }
}

export class CanvasLabel extends CanvasUIElement {
  label: string;
  color: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;

  constructor(parent, x, y, width, height, label, color, font) {
    super(parent, x, y, width, height);
    this.label = label;
    this.color = color;
    this.font = font;
    this.textAlign = "left";
    this.textBaseline = "top";
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    ctx.fillText(this.label, pos.x, pos.y);
  }

  event() {}
}

export class CanvasPanel extends CanvasUIElement {
  bgColor: string;

  constructor(parent, x, y, width, height, bgColor) {
    super(parent, x, y, width, height);
    this.bgColor = bgColor;
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
  }

  event() {}
}

export class CanvasSplitPanel extends CanvasPanel {
  axis: "horizontal" | "vertical";
  totalSplits: number;
  index: number;
  margin: number;

  constructor(parent, axis, totalSplits, index, bgColor, margin = 5) {
    super(parent, 0, 0, 0, 0, bgColor);
    this.axis = axis;
    this.totalSplits = totalSplits;
    this.index = index;
    this.margin = margin;
  }

  pos() {
    const pos = super.pos();

    pos.x += this.margin;
    pos.y += this.margin;

    if (this.axis == "horizontal") {
      pos.x += (this.parent.innerWidth / this.totalSplits) * this.index;
    }

    if (this.axis == "vertical") {
      pos.y += (this.parent.innerHeight / this.totalSplits) * this.index;
    }

    return pos;
  }

  get realWidth() {
    let width;

    if (this.axis == "horizontal") {
      width = this.parent.innerWidth / this.totalSplits;
    }

    if (this.axis == "vertical") {
      width = this.parent.innerWidth;
    }

    return width - this.margin * 2;
  }

  get realHeight() {
    let height;

    if (this.axis == "horizontal") {
      height = this.parent.innerHeight;
    }

    if (this.axis == "vertical") {
      height = this.parent.innerHeight / this.totalSplits;
    }

    return height - this.margin * 2;
  }
}

export class CanvasImage extends CanvasUIElement {
  image: HTMLImageElement;
  scaled: boolean;

  constructor(parent, x, y, width, height, image, scaled) {
    super(parent, x, y, width, height);
    this.image = image;
    this.scaled = scaled;
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.drawImage(
      this.image,
      pos.x,
      pos.y,
      !this.scaled ? undefined : this.width,
      !this.scaled ? undefined : this.height,
    );
  }

  event() {}
}
