// UI utilities for the canvas.
import { Game } from "./game";
import { GameMouseInfo } from "./mouse";
import { lerp } from "./util";
import Vec2 from "victor";

export interface UIEvent {
  name: string;
  x: number;
  y: number;
}

export type UIMouseEvent = UIEvent & GameMouseInfo & MouseEvent;

export interface UIDrawContext {
  ctx: CanvasRenderingContext2D;
  game: Game;
}

export type UIAlign = "start" | "center" | "end";
export type UIAxis = "horizontal" | "vertical";

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

export interface CanvasUIArgs {
  parent: CanvasUIElement;
  bgColor?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  hidden?: boolean;
  alignX?: UIAlign;
  alignY?: UIAlign;
  dockX?: UIAlign;
  dockY?: UIAlign;
  dockMarginX?: number;
  dockMarginY?: number;
  fillX?: boolean;
  fillY?: boolean;
  paddingX?: number;
  paddingY?: number;
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

  constructor(args: CanvasUIArgs) {
    this.parent = args.parent;
    this.children = [];

    this.x = args.x;
    this.y = args.y;
    this.width = args.width;
    this.height = args.height;
    this.hidden = args.hidden || false;
    this.alignX = args.alignX || "start";
    this.alignY = args.alignY || "start";
    this.dockX = args.dockX || "start";
    this.dockY = args.dockY || "start";
    this.dockMarginX = args.dockMarginX || 0;
    this.dockMarginY = args.dockMarginY || 0;
    this.fillX = args.fillX || false;
    this.fillY = args.fillY || false;
    this.paddingX = args.paddingX || 8;
    this.paddingY = args.paddingY || 8;

    if (this.parent != null) {
      this.parent.addChild(this);
    }
  }

  addChild(item) {
    this.children.push(item);
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

  abstract preChildrenRender(ctx: UIDrawContext);
  abstract postChildrenRender(ctx: UIDrawContext);

  render(ctx: UIDrawContext) {
    if (this.hidden) {
      return;
    }

    this._render(ctx);

    this.preChildrenRender(ctx);
    for (const child of this.children) {
      child.render(ctx);
    }
    this.postChildrenRender(ctx);
  }
}

export class CanvasRoot extends CanvasUIElement {
  game: Game;
  bgColor: string;

  constructor(game, bgColor = "#050505") {
    super({ parent: null });
    this.game = game;
    this.bgColor = bgColor;
  }

  preChildrenRender() {}
  postChildrenRender() {}

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

export interface CanvasButtonArgs extends CanvasUIArgs {
  label?: string;
  callback: (e: UIEvent) => void;
}

export class CanvasButton extends CanvasUIElement {
  callback: (e: UIEvent) => void;
  bgColor: string;

  constructor(args: CanvasButtonArgs) {
    super(args);
    this.callback = args.callback;
    this.bgColor = "#aaa";
  }

  preChildrenRender() {}
  postChildrenRender() {}

  event<E extends UIEvent>(e: E) {
    if (e.name === "mouseclick") {
      this.callback(e);
    }
  }

  public label(
    label: string,
    labelOpts?: CanvasLabelSpecificArgs & Partial<CanvasUIArgs>,
  ) {
    return new CanvasLabel({
      alignX: "center",
      alignY: "center",
      label: label,
      dockX: "center",
      dockY: "center",
      textAlign: "center",
      textBaseline: "middle",
      font: `{this.realHeight * 0.8}px Arial`,
      parent: this,
      ...(labelOpts || {}),
    });
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = "#222";
    ctx.fillRect(pos.x, pos.y, this.width, this.height);
  }
}

export interface CanvasLabelSpecificArgs {
  label: string;
  color?: string;
  font?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}

export type CanvasLabelArgs = CanvasUIArgs & CanvasLabelSpecificArgs;

export class CanvasLabel extends CanvasUIElement {
  label: string;
  color: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;

  constructor(args: CanvasLabelArgs) {
    super(args);
    this.label = args.label;
    this.color = args.color || "black";
    this.font = args.font || "1em Arial";
    this.textAlign = args.textAlign;
    this.textBaseline = args.textBaseline;
  }

  preChildrenRender() {}
  postChildrenRender() {}

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

export interface CanvasPanelArgs extends CanvasUIArgs {
  bgColor: string;
}

export class CanvasPanel extends CanvasUIElement {
  bgColor: string;

  constructor(args: CanvasPanelArgs) {
    super(args);
    this.bgColor = args.bgColor;
  }

  preChildrenRender() {}
  postChildrenRender() {}

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
  }

  event() {}
}

export interface CanvasSplitPanelArgs extends CanvasPanelArgs {
  axis: UIAxis;
  splits: number;
  index: number;
  margin?: number;
}

export class CanvasSplitPanel extends CanvasPanel {
  axis: UIAxis;
  totalSplits: number;
  index: number;
  margin: number;

  constructor(args: CanvasSplitPanelArgs) {
    super(args);
    this.axis = args.axis;
    this.totalSplits = args.splits;
    this.index = args.index;
    this.margin = args.margin || 5;
  }

  preChildrenRender() {}
  postChildrenRender() {}

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

export interface ScrollbarOptions {
  barSize: number; // between 0 and 1
  thickness?: number;
  bgColor: string;
  barColor: string;
  barPadding?: number;
}

const DEFAULT_SCROLLBAR_OPTIONS: ScrollbarOptions = {
  barSize: 0.9,
  thickness: 8,
  bgColor: "#111",
  barColor: "#909096",
  barPadding: 2,
};

export interface CanvasScrollerArgs extends CanvasUIArgs {
  axis: UIAxis;
  scrollPos?: number; // between 0 and 1
  scrollbarOpts?: Partial<ScrollbarOptions>;
}

type ScrollbarArgs = CanvasUIArgs &
  ScrollbarOptions & {
    scroller: CanvasScroller;
  };

class Scrollbar extends CanvasUIElement {
  barSize: number;
  scroller: CanvasScroller;
  thickness: number;
  bgColor: string;
  barColor: string;
  barPadding: number;

  constructor(args: ScrollbarArgs) {
    super(args);
    this.barSize = args.barSize;
    this.scroller = args.scroller;
    this.thickness = args.thickness || 10;
    this.bgColor = args.bgColor;
    this.barColor = args.barColor;
    this.barPadding = args.barPadding != null ? args.barPadding : 2;
    this.barSize = 1.0;
  }

  preChildrenRender() {}
  postChildrenRender() {}

  get scrollPos() {
    return this.scroller.scrollPos;
  }

  scrollToward(delta) {
    this.scroller.scrollPos = Math.max(
      0,
      Math.min(1, this.scroller.scrollPos + delta),
    );
  }

  scrollTowardPx(delta) {
    this.scrollToward(delta / this.scroller.sizeOnAxis());
  }

  event<E extends UIEvent>(e: E) {
    if (e.name == "mousedrag") {
      const ev = <E & UIMouseEvent>e;
      const delta = ev.delta;
      this.scrollTowardPx(
        delta.dot(
          Vec2(
            +(this.scroller.axis === "horizontal"),
            +(this.scroller.axis === "vertical"),
          ),
        ),
      );
    }
  }

  get realWidth() {
    if (this.scroller.axis === "vertical") return this.thickness;
    return this.parent.realWidth;
  }

  get realHeight() {
    if (this.scroller.axis === "horizontal") return this.thickness;
    return this.parent.realHeight;
  }

  private left(pos) {
    if (this.scroller.axis === "vertical")
      return pos.x + this.parent.realWidth - this.thickness;
    return pos.x;
  }

  private top(pos) {
    if (this.scroller.axis === "horizontal")
      return pos.y + this.parent.realHeight - this.thickness;
    return pos.y;
  }

  get outerLength() {
    if (this.scroller.axis === "horizontal") return this.realWidth;
    if (this.scroller.axis === "vertical") return this.realHeight;
  }

  get barLength() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * this.barSize;
    if (this.scroller.axis === "vertical")
      return this.realHeight * this.barSize;
  }

  get maxBarPos() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * (1 - this.barSize) - this.barPadding;
    if (this.scroller.axis === "vertical")
      return this.realHeight * (1 - this.barSize) - this.barPadding;
  }

  private barLeft(pos) {
    if (this.scroller.axis === "vertical")
      return this.left(pos) + this.barPadding;
    return (
      this.left(pos) +
      lerp(this.barPadding, this.maxBarPos, this.scroller.scrollPos)
    );
  }

  private barTop(pos) {
    if (this.scroller.axis === "horizontal")
      return this.top(pos) + this.barPadding;
    return (
      this.top(pos) +
      lerp(this.barPadding, this.maxBarPos, this.scroller.scrollPos)
    );
  }

  get barWidth() {
    if (this.scroller.axis === "vertical")
      return this.thickness - this.barPadding;
    return this.barLength;
  }

  get barHeight() {
    if (this.scroller.axis === "horizontal")
      return this.thickness - this.barPadding;
    return this.barLength;
  }

  _render(ctx: UIDrawContext) {
    const dctx = ctx.ctx;
    const pos = this.pos();

    dctx.fillStyle = this.bgColor;
    dctx.fillRect(
      this.left(pos),
      this.top(pos),
      this.realWidth,
      this.realHeight,
    );
    dctx.fillStyle = this.barColor;
    dctx.fillRect(
      this.barLeft(pos),
      this.barTop(pos),
      this.barWidth,
      this.barHeight,
    );
  }
}

export class CanvasScroller extends CanvasUIElement {
  axis: UIAxis;
  bgColor: string;
  scrollbar: Scrollbar | null;
  scrollPos: number;
  scrollbarOpts: ScrollbarOptions;

  constructor(args: CanvasScrollerArgs) {
    super(args);
    this.axis = args.axis;
    this.scrollPos = args.scrollPos || 0;
    this.scrollbarOpts = {
      ...DEFAULT_SCROLLBAR_OPTIONS,
      ...(args.scrollbarOpts || {}),
    };
  }

  private updateScrollbar() {
    const shouldHave = this.scrollLength > this.axialSize;

    if (!shouldHave) {
      this.scrollbar = null;
      return;
    }

    const barSize = this.axialSize / this.scrollLength;

    if (this.scrollbar == null) {
      this.scrollbar = new Scrollbar({
        parent: this,
        scroller: this,
        ...this.scrollbarOpts,
      });
    }

    this.scrollbar.barSize = barSize;
  }

  sizeOnAxis() {
    if (this.axis === "horizontal") return this.realWidth;
    if (this.axis === "vertical") return this.realHeight;
  }

  get scrollDims() {
    let start, end;

    for (const item of this.children) {
      const pos = this.axis === "horizontal" ? item.x : item.y;
      const size =
        this.axis === "horizontal" ? item.realWidth : item.realHeight;
      if (pos < start) start = pos;
      if (pos + size > end) end = pos + size;
    }

    return [start, end];
  }

  get scrollLength() {
    const [start, end] = this.scrollDims;

    return end - start;
  }

  get axialSize() {
    if (this.axis === "horizontal") return this.realWidth;
    if (this.axis === "vertical") return this.realHeight;
  }

  get scrollOffs() {
    const [start, end] = this.scrollDims;
    const len = end - start;
    return start + len * this.scrollPos - this.axialSize;
  }

  get innerWidth() {
    if (this.scrollbar == null) return this.realWidth;
    if (this.axis === "horizontal")
      return this.realWidth - this.scrollbar.thickness;
  }

  get innerHeight() {
    if (this.scrollbar == null) return this.realWidth;
    if (this.axis === "horizontal")
      return this.realWidth - this.scrollbar.thickness;
  }

  preChildrenRender(ctx: UIDrawContext) {
    this.updateScrollbar();

    const pctx = ctx.ctx;
    const pos = this.pos();
    pctx.save();
    pctx.beginPath();
    pctx.rect(pos.x, pos.y, this.innerWidth, this.innerHeight);
    pctx.clip();
  }

  postChildrenRender(ctx: UIDrawContext) {
    const pctx = ctx.ctx;
    pctx.restore();
  }

  event() {}

  _render() {}
}

export interface CanvasImageArgs extends CanvasUIArgs {
  image: HTMLImageElement;
  scaled?: boolean;
}

export class CanvasImage extends CanvasUIElement {
  image: HTMLImageElement;
  scaled: boolean;

  constructor(args: CanvasImageArgs) {
    super(args);
    this.image = args.image;
    this.scaled = args.scaled != null ? args.scaled : true;
  }

  preChildrenRender() {}
  postChildrenRender() {}

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.drawImage(
      this.image,
      pos.x,
      pos.y,
      !this.scaled ? undefined : this.realWidth,
      !this.scaled ? undefined : this.realHeight,
    );
  }

  event() {}
}
