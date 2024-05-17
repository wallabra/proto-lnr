// UI utilities for the canvas.
import { Optional } from "utility-types";
import { Game } from "./game";
import { GameMouseInfo } from "./mouse";
import { lerp } from "./util";
import Vec2 from "victor";

export interface UIEvent {
  name: string;
  x: number;
  y: number;
  consumed: boolean;
  inside?: CanvasUIElement;
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
    base -= offset;
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
  fillX?: boolean | number;
  fillY?: boolean | number;
  paddingX?: number;
  paddingY?: number;
  childOrdering?: UIAxis | null;
  childMargin?: number;
  layer?: number;
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
  fillX: boolean | number;
  fillY: boolean | number;
  paddingX: number;
  paddingY: number;
  childMargin;
  number;
  childOrdering: UIAxis | null;
  layer: number;

  constructor(args: CanvasUIArgs) {
    this.parent = args.parent;
    this.children = [];

    this.x = args.x || 0;
    this.y = args.y || 0;
    this.width = args.width || 1;
    this.height = args.height || 1;
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
    this.childOrdering = args.childOrdering || null;
    this.childMargin = args.childMargin || 5;
    this.layer = args.layer || 0;

    if (this.parent != null) {
      this.parent._addChild(this);
    }
  }

  childIndex() {
    if (this.parent == null) return 0;
    return this.parent.children.indexOf(this);
  }

  childrenOffset() {
    return { x: 0, y: 0 };
  }

  public addChild(item) {
    this._addChild(item);
  }

  _addChild(item) {
    this.children.push(item);
  }

  removeChild(item) {
    const idx = this.children.indexOf(item);
    if (idx != -1) this.children.splice(idx, 1);
  }

  get realWidth() {
    if (this.parent == null || !this.fillX) {
      return this.width;
    } else if (typeof this.fillX === "number") {
      return this.parent.innerWidth * this.fillX;
    } else {
      return this.parent.innerWidth;
    }
  }

  get realHeight() {
    if (this.parent == null || !this.fillY) {
      return this.height;
    } else if (typeof this.fillY === "number") {
      return this.parent.innerHeight * this.fillY;
    } else {
      return this.parent.innerHeight;
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

  inheritedOffset() {
    return this.parent.childrenOffset();
  }

  pos() {
    let x = this.x;
    let y = this.y;

    if (this.childOrdering === "horizontal")
      x +=
        this.childMargin +
        this.parent.children
          .slice(0, this.childIndex())
          .filter((e) => e.childOrdering === "horizontal")
          .map((e) => e.realWidth + e.childMargin * 2)
          .reduce((a, b) => a + b, 0);
    else if (this.childOrdering === "vertical")
      y +=
        this.childMargin +
        this.parent.children
          .slice(0, this.childIndex())
          .filter((e) => e.childOrdering === "vertical")
          .map((e) => e.realHeight + e.childMargin * 2)
          .reduce((a, b) => a + b, 0);

    if (this.parent != null) {
      const pp = this.parent.innerPos();
      const offs = this.inheritedOffset();
      x += pp.x + offs.x;
      y += pp.y + offs.y;

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
    if (this !== e.inside && !this.isInside(e.x, e.y)) {
      return false;
    }

    console.log(e.name, "on", this, "<-", e);
    if (e.inside == null || e.inside === this.parent) e.inside = this;
    if (!e.consumed) {
      this.dispatchEvent(e);
      this.event(e);
    }
    return true;
  }

  private dispatchEvent<E extends UIEvent>(e: E) {
    for (const child of this.children) {
      child.handleEvent(e);
      if (e.consumed) break;
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
    for (const child of this.children.sort((a, b) => b.layer - a.layer)) {
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
    if (e.name === "click") {
      this.callback(e);
      e.consumed = true;
    }
  }

  public label(
    label: string,
    labelOpts?: Optional<CanvasLabelSpecificArgs, "label"> &
      Partial<CanvasUIArgs>,
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
    ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
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
    this.textAlign = args.textAlign || "start";
    this.textBaseline = args.textBaseline || "top";
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

const DEFAULT_SCROLLBAR_OPTIONS: Partial<CanvasUIArgs> & ScrollbarOptions = {
  barSize: 0.9,
  thickness: 8,
  bgColor: "#1116",
  barColor: "#909096",
  barPadding: 2,
  dockMarginX: 0,
  dockMarginY: 0,
  dockX: "end",
  dockY: "end",
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

  inheritedOffset() {
    return { x: 0, y: 0 };
  }

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

  scrollSpan() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * (1 + this.barSize) + this.barPadding * 2;
    if (this.scroller.axis === "vertical")
      return this.realHeight * (1 + this.barSize) + this.barPadding * 2;
  }

  scrollTowardPx(delta) {
    this.scrollToward(delta / this.scrollSpan());
  }

  event<E extends UIEvent>(e: E) {
    const ev = <E & { dragStart: Vec2 }>e;
    if (
      e.name == "canvasdrag" &&
      this.isInside(ev.dragStart.x, ev.dragStart.y)
    ) {
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
    return this.parent.innerWidth;
  }

  get realHeight() {
    if (this.scroller.axis === "horizontal") return this.thickness;
    return this.parent.innerHeight;
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

  barLeft(pos) {
    if (this.scroller.axis === "vertical") return pos.x + this.barPadding;
    return (
      pos.x + lerp(this.barPadding, this.maxBarPos, this.scroller.scrollPos)
    );
  }

  barTop(pos) {
    if (this.scroller.axis === "horizontal") return pos.y + this.barPadding;
    return (
      pos.y + lerp(this.barPadding, this.maxBarPos, this.scroller.scrollPos)
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
    dctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
    dctx.fillStyle = this.barColor;
    dctx.fillRect(
      this.barLeft(pos),
      this.barTop(pos),
      this.barWidth,
      this.barHeight,
    );
  }
}

class CanvasScrollerContentPane extends CanvasUIElement {
  parent: CanvasScroller;
  measuring: boolean = false;

  inheritedOffset(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  pos() {
    return this.parent.innerPos();
  }

  childrenOffset(): { x: number; y: number } {
    if (!this.measuring) return this.parent.childrenOffset();
    return { x: 0, y: 0 };
  }

  get realWidth() {
    return this.parent.contentWidth();
  }

  get realHeight() {
    return this.parent.contentHeight();
  }

  _render() {}
  event() {}
  preChildrenRender() {}
  postChildrenRender() {}
}

export class CanvasScroller extends CanvasUIElement {
  axis: UIAxis;
  bgColor: string;
  contentPane: CanvasScrollerContentPane;
  scrollbar: Scrollbar | null;
  scrollPos: number;
  scrollbarOpts: ScrollbarOptions;

  constructor(args: CanvasScrollerArgs) {
    super({ paddingX: 0, paddingY: 0, ...args });
    this.bgColor = args.bgColor;
    this.axis = args.axis;
    this.contentPane = new CanvasScrollerContentPane({
      paddingX: 0,
      paddingY: 0,
      childMargin: 0,
      childOrdering: null,
      dockMarginX: 0,
      dockMarginY: 0,
      parent: this,
    });
    this.scrollPos = args.scrollPos || 0;
    this.scrollbarOpts = {
      ...DEFAULT_SCROLLBAR_OPTIONS,
      ...(args.scrollbarOpts || {}),
    };
  }

  public addChild(item) {
    this.contentPane._addChild(item);
  }

  childrenOffset() {
    return {
      x:
        this.axis !== "horizontal"
          ? 0
          : -(this.scrollLength + this.paddingX - this.contentPane.innerWidth) *
            this.scrollPos,
      y:
        this.axis !== "vertical"
          ? 0
          : -(
              this.scrollLength +
              this.paddingY -
              this.contentPane.innerHeight
            ) * this.scrollPos,
    };
  }

  private updateScrollbar() {
    const shouldHave = this.scrollLength > this.axialSize;

    if (!shouldHave) {
      this.removeChild(this.scrollbar);
      this.scrollbar = null;
      return;
    }

    const barSize = Math.min(0.05, this.axialSize / this.scrollLength);

    if (this.scrollbar == null) {
      this.scrollbar = new Scrollbar({
        parent: this,
        scroller: this,
        layer:
          Math.max(
            this.layer,
            ...this.contentPane.children.map((c) => c.layer),
          ) + 1,
        dockMarginX: 0,
        dockMarginY: 0,
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
    let start = null,
      end = null;

    this.contentPane.measuring = true; // prevent infinite recursion

    for (const item of this.contentPane.children) {
      const pos = item.pos();
      let off = this.axis === "horizontal" ? pos.x : pos.y;
      let size = this.axis === "horizontal" ? item.realWidth : item.realHeight;
      if (item.childOrdering === this.axis) {
        off -= item.childMargin;
        size += item.childMargin * 2;
      }
      if (start == null || off < start) start = off;
      if (end == null || off + size > end) end = off + size;
    }

    this.contentPane.measuring = false;

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

  contentWidth() {
    if (this.axis === "vertical" && this.scrollbar != null)
      return this.innerWidth - this.scrollbar.thickness;
    return this.innerWidth;
  }

  contentHeight() {
    if (this.axis === "horizontal" && this.scrollbar != null)
      return this.innerHeight - this.scrollbar.thickness;
    return this.innerHeight;
  }

  preChildrenRender(ctx: UIDrawContext) {
    this.updateScrollbar();

    const pctx = ctx.ctx;
    const pos = this.innerPos();
    pctx.save();
    pctx.beginPath();
    pctx.rect(pos.x, pos.y, this.innerWidth, this.innerHeight);
    pctx.clip();
  }

  postChildrenRender(ctx: UIDrawContext) {
    const pctx = ctx.ctx;
    pctx.restore();
  }

  scrollableWidth() {
    if (this.axis === "horizontal") return this.scrollLength;
    return this.innerWidth;
  }

  scrollableHeight() {
    if (this.axis === "vertical") return this.scrollLength;
    return this.innerHeight;
  }

  event() {}

  _render(ctx: UIDrawContext) {
    const pctx = ctx.ctx;
    const pos = this.pos();
    pctx.fillStyle = this.bgColor;
    pctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
  }
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
