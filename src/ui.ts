// UI utilities for the canv
// do nothing;

import type { Omit, Optional, Nullish } from "utility-types";
import type { Game } from "./game";
import type { GameMouseInfo } from "./mouse";
import { lerp } from "./util";
import Victor from "victor";

export interface UIEvent {
  name: string;
  x: number;
  y: number;
  // do nothing;
  consumed: boolean;
  inside?: CanvasUIElement | null;
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
  } else {
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
  parent?: CanvasUIElement | null;
  bgColor?: string | null;
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
  childFill?: number;
  layer?: number;
  cullOutOfBounds?: boolean;
  opacity?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UIBorder {
  width: number;
  color: string;
  dashes?: number[];
}

function drawBorder(
  element: CanvasUIElement & { border: UIBorder | null },
  ctx: CanvasRenderingContext2D,
  pos: Point,
) {
  if (element.border != null) {
    const width = element.border.width;
    ctx.strokeStyle = element.border.color;
    ctx.lineWidth = width;
    if (element.border.dashes) ctx.setLineDash(element.border.dashes);
    ctx.strokeRect(
      pos.x + width / 2,
      pos.y + width / 2,
      element.realWidth - width,
      element.realHeight - width,
    );
    ctx.setLineDash([]);
  }
}

export type CachedInfo = {
  last: Date;
  dims: Rectangle;
  innerPos: Point;
} & Record<string, unknown>;

export abstract class CanvasUIElement<ExtraProps = object> {
  parent: CanvasUIElement | Nullish;
  children: CanvasUIElement[];
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
  childMargin: number;
  childFill: number;
  childOrdering: UIAxis | null;
  layer: number;
  cullOutOfBounds: boolean;
  cached: CachedInfo;
  modified: boolean;
  opacity: number;

  constructor(args: CanvasUIArgs & ExtraProps) {
    this.parent = args.parent ?? null;
    this.children = [];

    Object.assign(this, args);

    this.x = args.x ?? 0;
    this.y = args.y ?? 0;
    this.width = args.width ?? 1;
    this.height = args.height ?? 1;
    this.hidden = args.hidden ?? false;
    this.alignX = args.alignX ?? "start";
    this.alignY = args.alignY ?? "start";
    this.dockX = args.dockX ?? "start";
    this.dockY = args.dockY ?? "start";
    this.dockMarginX = args.dockMarginX ?? 0;
    this.dockMarginY = args.dockMarginY ?? 0;
    this.fillX = args.fillX ?? false;
    this.fillY = args.fillY ?? false;
    this.paddingX = args.paddingX ?? 2;
    this.paddingY = args.paddingY ?? 2;
    this.childOrdering = args.childOrdering ?? null;
    this.childMargin = args.childMargin ?? 2;
    this.childFill = args.childFill ?? 0;
    this.layer = args.layer ?? 0;
    this.cullOutOfBounds = args.cullOutOfBounds ?? false;
    this.opacity = args.opacity ?? 1;

    this.modified = true;
    this.updateCache();
    if (this.parent != null) {
      this.parent = this.parent._addChild(this);
      this.parent.updateCache();
    }
    this.modified = false;
  }

  setParent(parent?: CanvasUIElement | null) {
    if (this.parent != null) {
      this.parent.removeChild(this);
      this.parent.updateCache();
    }
    if (parent == null) {
      this.parent = null;
      return;
    }
    this.parent = parent._addChild(this);
    this.parent.updateCache();
  }

  checkUpdateCache() {
    for (const child of this.children) {
      child.checkUpdateCache();
    }

    if (!this.modified) return;
    this.modified = false;
    this.updateCache();
  }

  setCache() {
    this.cached = {
      last: new Date(),
      dims: {
        x: 0,
        y: 0,
        width: this.computeWidth(),
        height: this.computeHeight(),
      },
      innerPos: { x: 0, y: 0 },
    };
    const { x, y } = this.computePos();
    Object.assign(this.cached.dims, {
      x,
      y,
      right: x + this.cached.dims.width,
      bottom: y + this.cached.dims.height,
    });
    this.cached.innerPos = this.computeInnerPos();
    Object.assign(this.cached, this.extraCacheInfo());
  }

  updateCache() {
    this.setCache();
    for (const child of this.children) {
      child.updateCache();
    }
  }

  protected extraCacheInfo(): Record<string, unknown> {
    return {};

    // do nothing
  }

  childIndex(): number {
    if (this.parent == null) return 0;
    return this.parent.children.indexOf(this);
  }

  childrenOffset(): Point {
    return { x: 0, y: 0 };
  }

  public addChild(item: CanvasUIElement): CanvasUIElement {
    return this._addChild(item);
  }

  _addChild(this: CanvasUIElement, item: CanvasUIElement): CanvasUIElement {
    this.children.push(item);
    item.parent = this;
    this.modified = true;
    return this;
  }

  remove() {
    if (this.parent == null) {
      console.warn(
        "remove() called on a parentless CanvasUIElement; unset references on user code instead!",
      );
      return;
    }
    this.parent.removeChild(this);
    this.parent = null;
  }

  destroy() {
    this.remove();
    this.hidden = true;
  }

  removeChild(item: CanvasUIElement) {
    const idx = this.children.indexOf(item);
    if (idx === -1) return;
    this.children.splice(idx, 1);
    this.modified = true;
  }

  clearChildren() {
    for (const child of this.children) {
      child.remove();
    }
  }

  private childFillRealEstate(): number {
    if (this.parent == null) return 0;

    const order = this.childOrdering;
    return (
      (order === "horizontal"
        ? this.parent.innerWidth
        : this.parent.innerHeight) -
      this.parent.children
        .filter((c) => c.childOrdering === order && !c.isHidden())
        .reduce(
          (sum, child) =>
            sum +
            (child.childFill === 0
              ? order === "horizontal"
                ? child.realWidth
                : child.realHeight
              : 0) +
            child.childMargin,
          0,
        )
    );
  }

  private childFillTotalFill(): number {
    if (this.parent == null) return 0;

    return this.parent.children
      .filter(
        (c) =>
          c.childOrdering === this.childOrdering &&
          c.childFill > 0 &&
          !c.isHidden(),
      )
      .reduce((sum, child) => sum + child.childFill, 0);
  }

  private childFillSize(): number {
    if (this.parent == null) return 0;

    const realEstate = this.childFillRealEstate();
    const totalFill = this.childFillTotalFill();
    const ratio = this.childFill / totalFill;
    return realEstate * ratio;
  }

  protected computeWidth(): number {
    if (this.parent == null) return this.width;

    let special = 0;
    if (this.childOrdering === "horizontal" && this.childFill > 0) {
      special = this.childFillSize();
    } else if (typeof this.fillX === "number") {
      special = this.parent.innerWidth * this.fillX;
    } else if (this.fillX) {
      special = this.parent.innerWidth;
    }

    return Math.max(special, this.width);
  }

  protected computeHeight(): number {
    if (this.parent == null) return this.height;

    let special = 0;
    if (this.childOrdering === "vertical" && this.childFill > 0) {
      special = this.childFillSize();
    } else if (typeof this.fillY === "number") {
      special = this.parent.innerHeight * this.fillY;
    } else if (this.fillY) {
      special = this.parent.innerHeight;
    }

    return Math.max(special, this.height);
  }

  public get realWidth(): number {
    return this.cached.dims.width;
  }

  public get realHeight(): number {
    return this.cached.dims.height;
  }

  public isHidden(): boolean {
    return this.hidden;
  }

  outerPos(): Point {
    const { x, y } = this.pos();
    return {
      x: x - this.outerMarginX(),
      y: y - this.outerMarginY(),
    };
  }

  outerMarginX(): number {
    if (this.childOrdering === "horizontal") {
      return this.childMargin;
    } else if (this.dockX === "start" || this.dockX === "end") {
      return this.dockMarginX;
    }
    return 0;
  }

  outerMarginY(): number {
    if (this.childOrdering === "vertical") {
      return this.childMargin / 2;
    } else if (this.dockY === "start" || this.dockY === "end") {
      return this.dockMarginY;
    }
    return 0;
  }

  outerWidth(): number {
    return this.realWidth + this.outerMarginX() * 2;
  }

  outerHeight(): number {
    return this.realHeight + this.outerMarginY() * 2;
  }

  get innerWidth(): number {
    return this.realWidth - this.paddingX * 2;
  }

  get innerHeight(): number {
    return this.realHeight - this.paddingY * 2;
  }

  checkChangeDimensions(width: number, height: number) {
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
      this.modified = true;
    }
  }

  inheritedOffset(): Point {
    if (this.parent == null) return { x: 0, y: 0 };
    return this.parent.childrenOffset();
  }

  computePos() {
    let x = this.x;
    let y = this.y;

    if (this.parent != null) {
      if (this.childOrdering === "horizontal")
        x +=
          this.childMargin / 2 +
          this.parent.children
            .slice(0, this.childIndex())
            .filter((e) => e.childOrdering === "horizontal" && !e.isHidden())
            .map((e) => e.realWidth + e.childMargin)
            .reduce((a, b) => a + b, 0);
      else if (this.childOrdering === "vertical")
        y +=
          this.childMargin / 2 +
          this.parent.children
            .slice(0, this.childIndex())
            .filter((e) => e.childOrdering === "vertical" && !e.isHidden())
            .map((e) => e.realHeight + e.childMargin)
            .reduce((a, b) => a + b, 0);

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

  pos() {
    return { x: this.cached.dims.x, y: this.cached.dims.y };
  }

  innerPos() {
    return Object.assign({}, this.cached.innerPos);
  }

  computeInnerPos() {
    const pos = this.pos();
    pos.x += this.paddingX;
    pos.y += this.paddingY;
    return pos;
  }

  isInside(x: number, y: number) {
    if (this.isHidden()) return false;

    const pos = this.pos();
    x -= pos.x;
    y -= pos.y;

    return !(x < 0 || y < 0 || x > this.realWidth || y > this.realHeight);
  }

  public handleEvent(e: UIEvent) {
    if (this.isHidden()) {
      return false;
    }

    if (this !== e.inside && !this.isInside(e.x, e.y)) {
      return false;
    }

    if (e.inside == null || e.inside === this.parent) e.inside = this;
    if (!e.consumed) {
      this.dispatchEvent(e);
    }
    if (!e.consumed) {
      this.event(e);
    }
    if (e.name === "click" && e.inside === this) console.log(e.name, e);
    return true;
  }

  private dispatchEvent(e: UIEvent) {
    for (const child of this.children.sort((a, b) => b.layer - a.layer)) {
      child.handleEvent(e);
      if (e.consumed) break;
    }
  }

  abstract event(e: UIEvent): void;
  abstract _render(ctx: UIDrawContext): void;

  abstract preChildrenRender(ctx: UIDrawContext): void;
  abstract postChildrenRender(ctx: UIDrawContext): void;

  childIsVisible(element: CanvasUIElement) {
    if (this.parent != null && !this.parent.childIsVisible(this)) return false;

    if (this.isHidden() || element.isHidden()) return false;

    if (!this.cullOutOfBounds) return true;

    const eTopLeft = element.pos();
    const eBottomRight = {
      x: eTopLeft.x + element.realWidth,
      y: eTopLeft.y + element.realHeight,
    };
    const cTopLeft = this.innerPos();
    const cBottomRight = {
      x: cTopLeft.x + this.innerWidth,
      y: cTopLeft.y + this.innerHeight,
    };

    return (
      eTopLeft.x < cBottomRight.x &&
      eBottomRight.x > cTopLeft.x &&
      eTopLeft.y < cBottomRight.y &&
      eBottomRight.y > cTopLeft.y
    );
  }

  isVisible() {
    return this.parent == null || this.parent.childIsVisible(this);
  }

  render(ctx: UIDrawContext) {
    if (this.isHidden()) {
      return;
    }

    if (this.opacity !== 1) {
      ctx.ctx.save();
      ctx.ctx.globalAlpha = this.opacity;
    }

    this._render(ctx);

    this.preChildrenRender(ctx);
    for (const child of this.children.sort((a, b) => a.layer - b.layer)) {
      if (this.childIsVisible(child)) child.render(ctx);
    }
    this.postChildrenRender(ctx);
    
    if (this.opacity !== 1) {
      ctx.ctx.restore();
    }
  }
}

export class CanvasRoot extends CanvasUIElement<{ game: Game }> {
  game: Game;
  bgColor: string | null;
  border = null;

  constructor(game: Game, bgColor = "#0000") {
    super({ parent: null, game: game, x: 0, y: 0 });
    this.game = game;
    this.bgColor = bgColor;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  _render(uictx: UIDrawContext): void {
    const ctx = uictx.ctx;
    ctx.fillStyle = this.bgColor ?? "#000";
    ctx.fillRect(0, 0, this.game.width, this.game.height);
  }

  event() {
    // do nothing
  }
}

export type UICallback = (e: UIEvent) => void;

export interface CanvasButtonArgs extends CanvasUIArgs {
  label?: string;
  callback: UICallback;
  border?: UIBorder | null;
}

export class CanvasButton extends CanvasUIElement<CanvasButtonArgs> {
  callback: UICallback;
  private _label: CanvasLabel | null;
  bgColor: string | null;
  border: UIBorder | null;

  constructor(args: CanvasButtonArgs) {
    super(args);
    this.callback = args.callback;
    this.bgColor = args.bgColor ?? "#aaa";
    this.border = args.border ?? null;
    this._label = null;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  event(e: UIEvent) {
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
    if (this._label != null) this._label.remove();
    return (this._label = new CanvasLabel({
      label: label,
      dockX: "center",
      dockY: "center",
      height: Math.min(16, this.realHeight * 0.5),
      autoFont: true,
      font: `$Hpx sans-serif`,
      parent: this,
      ...(labelOpts || {}),
    }));
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = "#222";
    ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
    drawBorder(this, ctx, pos);
  }
}

export interface CanvasLabelSpecificArgs {
  label: string;
  color?: string | null;
  font?: string | null;
  textAlign?: CanvasTextAlign | null;
  textBaseline?: CanvasTextBaseline | null;
  autoFont?: boolean | null;
  maxHeight?: number | null;
}

export type CanvasLabelArgs = CanvasUIArgs & CanvasLabelSpecificArgs;

export class CanvasLabel extends CanvasUIElement<CanvasLabelArgs> {
  label: string;
  color: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  autoFont: boolean;
  textWidth: number | null = null;
  bgColor: string | null;
  maxHeight: number | null;

  constructor(args: CanvasLabelArgs) {
    super({ bgColor: null, ...args });
    this.maxHeight = args.maxHeight || null;
    this.label = args.label;
    this.color = args.color || "black";
    this.font = args.font || `${this.height.toString()}px sans-serif`;
    this.textAlign = args.textAlign || "start";
    this.textBaseline = args.textBaseline || "top";
    this.autoFont = args.autoFont || false;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  override computeWidth(): number {
    return Math.max(this.textWidth || 0, super.computeWidth() || 0);
  }

  _render(uictx: UIDrawContext) {
    if (this.parent == null) {
      console.warn(`Tried to render a parentless ${this.constructor.name}`);
      return;
    }
    const ctx = uictx.ctx;
    const pos = this.innerPos();

    let size = Math.max(this.innerHeight, this.height);

    if (this.maxHeight != null && this.maxHeight < size) size = this.maxHeight;

    if (this.bgColor != null) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
    }

    let font = this.font.replace("$H", size.toString());

    ctx.fillStyle = this.color;
    ctx.font = font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    const measures = ctx.measureText(this.label);
    const oldWidth = this.textWidth;
    this.textWidth = measures.width;

    const wideWidth =
      this.textWidth +
      this.paddingX * 2 +
      (this.childOrdering === "horizontal"
        ? this.childMargin
        : this.dockX === "start" || this.dockX === "end"
          ? this.dockMarginX
          : 0);

    if (wideWidth > this.parent.innerWidth) {
      const factor = this.parent.innerWidth / wideWidth;
      size *= factor;
      size = Math.max(size, Math.min(9, this.height || Infinity));
      font = this.font.replace("$H", size.toString());
      ctx.font = font;
      this.maxHeight =
        this.maxHeight == null ? size : Math.min(this.maxHeight, size);
      this.textWidth *= factor;
    }

    const remeasured = oldWidth != this.textWidth;
    if (remeasured) {
      this.cached.dims.width = measures.width;
      this.updateCache();
    }

    ctx.fillText(this.label, pos.x, pos.y);
  }

  event() {
    // do nothing
  }
}

export interface CanvasPanelArgs extends CanvasUIArgs {
  bgColor: string | null;
  border?: UIBorder | null;
}

export class CanvasPanel extends CanvasUIElement<CanvasPanelArgs> {
  bgColor: string | null;
  border: UIBorder | null;

  constructor(args: CanvasPanelArgs) {
    super(args);
    this.bgColor = args.bgColor;
    this.border = args.border ?? null;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.fillStyle = this.bgColor ?? "#000";
    ctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);

    drawBorder(this, ctx, pos);
  }

  event() {
    // do nothing
  }
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

  override preChildrenRender() {
    // do nothing
  }

  override postChildrenRender() {
    // do nothing
  }

  override computePos() {
    const pos = super.pos();

    pos.x += this.margin;
    pos.y += this.margin;

    if (this.parent != null) {
      if (this.axis == "horizontal") {
        pos.x += (this.parent.innerWidth / this.totalSplits) * this.index;
      }

      if (this.axis == "vertical") {
        pos.y += (this.parent.innerHeight / this.totalSplits) * this.index;
      }
    }

    return pos;
  }

  override computeWidth(): number {
    if (this.parent == null) return 0;

    let width: number;

    if (this.axis == "horizontal") {
      width = this.parent.innerWidth / this.totalSplits;
    } else {
      width = this.parent.innerWidth;
    }

    return width - this.margin * 2;
  }

  override computeHeight(): number {
    if (this.parent == null) return 0;

    let height: number;

    if (this.axis == "horizontal") {
      height = this.parent.innerHeight;
    } else {
      height = this.parent.innerHeight / this.totalSplits;
    }

    return height - this.margin * 2;
  }
}

export interface ScrollbarOptions {
  barSize: number; // between 0 and 1
  thickness?: number;
  bgColor: string | null;
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
  contentPaneOpts?: Partial<CanvasUIArgs>;
}

type ScrollbarArgs = CanvasUIArgs &
  ScrollbarOptions & {
    scroller: CanvasScroller;
  };

class Scrollbar extends CanvasUIElement<ScrollbarArgs> {
  barSize: number;
  scroller: CanvasScroller;
  thickness: number;
  bgColor: string | null;
  barColor: string;
  barPadding: number;

  override inheritedOffset(): Point {
    return { x: 0, y: 0 };
  }

  constructor(args: ScrollbarArgs) {
    super(args);
    this.thickness = args.thickness || 10;
    this.barPadding = args.barPadding ?? 2;
    this.barSize = 1.0;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  get scrollPos() {
    return this.scroller.scrollPos;
  }

  scrollToward(delta: number) {
    this.scroller.scrollPos = Math.max(
      0,
      Math.min(1, this.scroller.scrollPos + delta),
    );
    this.scroller.modified = true;
  }

  scrollSpan() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * (1 - this.barSize) - this.barPadding * 2;
    // vertical
    return this.realHeight * (1 - this.barSize) - this.barPadding * 2;
  }

  scrollTowardPx(delta: number) {
    this.scrollToward(delta / this.scrollSpan());
  }

  event(e: UIEvent) {
    const ev = e as UIEvent & { dragStart: Victor };
    if (
      e.name == "canvasdrag" &&
      this.isInside(ev.dragStart.x, ev.dragStart.y)
    ) {
      const ev = e as UIEvent & UIMouseEvent;
      const delta = ev.delta;
      this.scrollTowardPx(
        delta.dot(
          new Victor(
            +(this.scroller.axis === "horizontal"),
            +(this.scroller.axis === "vertical"),
          ),
        ),
      );
    }
  }

  override computeWidth() {
    if (this.scroller.axis === "vertical") return this.thickness;
    if (this.parent == null) return 0;
    return this.parent.innerWidth;
  }

  override computeHeight() {
    if (this.scroller.axis === "horizontal") return this.thickness;
    if (this.parent == null) return 0;
    return this.parent.innerHeight;
  }

  get outerLength() {
    if (this.scroller.axis === "horizontal") return this.realWidth;
    // vertical
    return this.realHeight;
  }

  get barLength() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * this.barSize;
    // vertical
    return this.realHeight * this.barSize;
  }

  get maxBarPos() {
    if (this.scroller.axis === "horizontal")
      return this.realWidth * (1 - this.barSize) - this.barPadding;
    // vertical
    return this.realHeight * (1 - this.barSize) - this.barPadding;
  }

  barLeft(pos: Point) {
    if (this.scroller.axis === "vertical") return pos.x + this.barPadding;
    return (
      pos.x + lerp(this.barPadding, this.maxBarPos, this.scroller.scrollPos)
    );
  }

  barTop(pos: Point) {
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

    dctx.fillStyle = this.bgColor ?? "#000";
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
  override parent: CanvasScroller;
  measuring = false;
  private updatingParent = false;

  override updateCache(): void {
    super.updateCache();
    if (this.updatingParent) return;
    this.updatingParent = true;
    this.parent.updateCache();
    this.updatingParent = false;
  }

  override inheritedOffset(): Point {
    return { x: 0, y: 0 };
  }

  override computePos() {
    return this.parent.innerPos();
  }

  override childrenOffset(): { x: number; y: number } {
    if (!this.measuring) return this.parent.childrenOffset();
    return { x: 0, y: 0 };
  }

  override computeWidth() {
    return this.parent.contentWidth();
  }

  override computeHeight() {
    return this.parent.contentHeight();
  }

  _render() {
    // do nothing
  }
  event() {
    // do nothing
  }
  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }
}

export class CanvasScroller extends CanvasUIElement<CanvasScrollerArgs> {
  axis: UIAxis;
  bgColor: string | null;
  contentPane: CanvasScrollerContentPane;
  scrollbar: Scrollbar | null;
  scrollPos: number;
  scrollbarOpts: ScrollbarOptions;

  constructor(args: CanvasScrollerArgs) {
    super({ paddingX: 0, paddingY: 0, cullOutOfBounds: true, ...args });
    this.bgColor = args.bgColor ?? "#000";
    this.axis = args.axis;
    this.contentPane = new CanvasScrollerContentPane({
      paddingX: 2,
      paddingY: 2,
      childMargin: 0,
      childOrdering: null,
      dockMarginX: 0,
      dockMarginY: 0,
      parent: this,
      ...(args.contentPaneOpts || {}),
    });
    this.scrollPos = args.scrollPos || 0;
    this.scrollbarOpts = {
      ...DEFAULT_SCROLLBAR_OPTIONS,
      ...(args.scrollbarOpts || {}),
    };
    this.updateCache();
  }

  public override addChild(item: CanvasUIElement): CanvasUIElement {
    this.contentPane.addChild(item);
    return this.contentPane;
  }

  override childrenOffset() {
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
      if (this.scrollbar == null) {
        return;
      }

      console.log(this.scrollLength, this.axialSize);
      this.removeChild(this.scrollbar);
      this.scrollbar = null;
      this.scrollPos = 0;
      return;
    }

    const barSize = Math.max(0.05, this.axialSize / this.scrollLength);

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

  sizeOnAxis(): number {
    if (this.axis === "horizontal") return this.realWidth;
    // vertical
    return this.realHeight;
  }

  scrollDims(): [number, number] {
    let start: number | null = null,
      end: number | null = null;

    this.contentPane.measuring = true; // prevent infinite recursion

    for (const item of this.contentPane.children) {
      const pos = item.outerPos();
      const off = this.axis === "horizontal" ? pos.x : pos.y;
      const size =
        this.axis === "horizontal" ? item.outerWidth() : item.outerHeight();

      if (start == null || off < start) start = off;
      if (end == null || off + size > end) end = off + size;
    }

    this.contentPane.measuring = false;

    return [start ?? 0, end ?? 0];
  }

  get scrollLength(): number {
    return this.contentPane.children
      .filter((child) => child.childOrdering === this.axis && !child.isHidden())
      .reduce(
        (sum, child) =>
          sum +
          child.childMargin +
          (this.axis === "horizontal" ? child.realWidth : child.realHeight),
        0,
      );
  }

  get axialSize() {
    if (this.axis === "horizontal") return this.realWidth;
    // vertical
    return this.realHeight;
  }

  get scrollOffs() {
    const [start, end] = this.scrollDims();
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

  event() {
    // do nothing
  }

  _render(ctx: UIDrawContext) {
    const pctx = ctx.ctx;
    const pos = this.pos();
    pctx.fillStyle = this.bgColor ?? "#000";
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
    this.scaled = args.scaled ?? true;
  }

  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }

  _render(uictx: UIDrawContext) {
    const ctx = uictx.ctx;
    const pos = this.pos();

    ctx.drawImage(
      this.image,
      0,
      0,
      this.image.width,
      this.image.height,
      pos.x,
      pos.y,
      !this.scaled ? this.image.width : this.realWidth,
      !this.scaled ? this.image.width : this.realHeight,
    );
  }

  event() {
    // do nothing
  }
}

export interface CanvasUIGroupArgs extends CanvasUIArgs {
  bgColor?: string | null;
  border?: UIBorder | null;
}

export class CanvasUIGroup extends CanvasUIElement {
  private measuring = 0;
  bgColor: string | null;
  border: UIBorder | null;

  constructor(args: CanvasUIGroupArgs) {
    super({
      paddingY: 2,
      paddingX: 2,
      bgColor: args.bgColor ?? null,
      border: args.border ?? null,
      ...args,
    });
  }

  override isInside(x: number, y: number): boolean {
    return super.isInside(x, y) || this.children.some((c) => c.isInside(x, y));
  }

  override isHidden() {
    return this.hidden || this.children.every((e) => e.isHidden());
  }

  get contentDims(): [Point, Point] {
    let start: { x: number | null; y: number | null } = { x: null, y: null },
      end: { x: number | null; y: number | null } = { x: null, y: null };

    for (const item of this.children) {
      const { x, y } = item.outerPos();
      const size = { x: item.outerWidth(), y: item.outerHeight() };
      start = {
        x: start.x == null || x < start.x ? x : start.x,
        y: start.y == null || y < start.y ? y : start.y,
      };
      end = {
        x: end.x == null || x + size.x > end.x ? x + size.x : end.x,
        y: end.y == null || y + size.y > end.y ? y + size.y : end.y,
      };
    }

    // ensure no nulls
    start.x ??= 0;
    start.y ??= 0;
    end.x ??= 0;
    end.y ??= 0;

    return [start, end] as [Point, Point];
  }

  get contentSize() {
    if (this.measuring) {
      return { x: 0, y: 0 };
    }

    this.measuring = 2; // prevent infinite recursion
    this.updateCache();
    this.cached.dims.width = super.computeWidth();
    this.cached.dims.height = super.computeHeight();
    const [start, end] = this.contentDims;
    this.measuring = 1;
    this.modified = true;
    this.measuring = 0;

    return {
      x: end.x - start.x,
      y: end.y - start.y,
    };
  }

  override computeWidth() {
    if (this.measuring > 1) return super.computeWidth();
    return Math.max(
      super.computeWidth(),
      this.contentSize.x + this.paddingX * 2,
    );
  }

  override computeHeight() {
    if (this.measuring > 1) return super.computeHeight();
    return Math.max(
      super.computeHeight(),
      this.contentSize.y + this.paddingY * 2,
    );
  }

  event(_e: UIEvent) {}

  _render(ctx: UIDrawContext) {
    if (this.bgColor == null) return;

    const pos = this.pos();
    const width = this.realWidth;
    const height = this.realHeight;

    const pctx = ctx.ctx;
    pctx.fillStyle = this.bgColor;
    pctx.fillRect(pos.x, pos.y, width, height);

    drawBorder(this, pctx, pos);
  }
  preChildrenRender() {
    // do nothing
  }
  postChildrenRender() {
    // do nothing
  }
}

export interface Widget {
  pane: CanvasUIElement;
  update?(): void;
}

export interface CanvasTabArgs extends CanvasUIGroupArgs {
  label: string;
  content: Widget;
  labelArgs?: Optional<CanvasLabelArgs, "parent" | "label">;
  colors?: { inactive: string; active: string };
  parent: CanvasTabRow;
}

export class CanvasTab extends CanvasUIGroup {
  content: Widget;
  label: CanvasLabel;
  protected active: boolean;
  colors: { inactive: string; active: string };
  override parent: CanvasTabRow;
  tabName: string;

  constructor(args: CanvasTabArgs) {
    if (args.colors == null)
      args.colors = { inactive: "#2238", active: "#223c" };
    super({
      childFill: 1,
      paddingX: 15,
      paddingY: 3,
      childOrdering: "horizontal",
      childMargin: 1,
      ...args,
    });
    this.content = args.content;
    this.content.pane.setParent(this.parent.parent.contentPane);
    this.content.pane.hidden = true;
    this.tabName = args.label;
    this.label = new CanvasLabel({
      parent: this,
      dockX: "center",
      dockY: "center",
      height: 20,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      label: args.label,
      ...(args.labelArgs || {}),
    });
    this.updateColor();
  }

  updateColor() {
    this.bgColor = this.active ? this.colors.active : this.colors.inactive;
  }

  activate() {
    for (const tab of this.parent.children) {
      tab.active = tab === this;
      tab.content.pane.hidden = tab !== this;
      tab.updateColor();
    }
    if (this.content.update != null) this.content.update();
    this.parent.parent.updateCache();
  }

  protected onClick() {
    this.activate();
  }

  override event(e: UIEvent) {
    if (e.name === "click") {
      this.onClick();
      e.consumed = true;
    }
  }
}

export interface CanvasTabRowArgs extends CanvasUIGroupArgs {
  parent: CanvasTabPanel;
  tabOptions?: Optional<CanvasTabArgs, "label" | "parent" | "content">;
  tabs: { label: string; content: Widget }[];
}

export class CanvasTabRow extends CanvasUIGroup {
  override children: CanvasTab[];
  override parent: CanvasTabPanel;
  tabOptions?: Optional<CanvasTabArgs, "label" | "parent" | "content">;

  constructor(args: CanvasTabRowArgs) {
    super({ paddingX: 2, paddingY: 2, ...args });
    for (const tab of args.tabs) {
      this.addTab(tab);
    }
  }

  addTab(
    tab: { label: string; content: Widget } & Partial<
      Omit<CanvasTabArgs, "label" | "parent" | "content">
    >,
  ) {
    const opts: CanvasTabArgs = {
      parent: this,
      ...(this.tabOptions || {}),
      ...tab,
    };

    const tabEl = new CanvasTab(opts);
    if (this.children.length === 1) tabEl.activate();
  }

  activeTab() {
    return this.children.find((t) => !t.content.pane.hidden);
  }
}

export interface CanvasTabPanelArgs extends CanvasPanelArgs {
  rowOptions?: Partial<CanvasUIGroupArgs>;
  tabOptions?: Optional<CanvasTabArgs, "label" | "parent" | "content">;
  tabs: { label: string; content: Widget }[];
}

export class CanvasTabPanel extends CanvasPanel {
  tabs: CanvasTabRow;
  contentPane: CanvasUIGroup;

  constructor(args: CanvasTabPanelArgs) {
    super(args);
    this.tabs = new CanvasTabRow({
      childMargin: 2,
      height: 10,
      fillX: true,
      tabOptions: args.tabOptions,
      tabs: args.tabs,
      ...(args.rowOptions || {}),
      parent: this,
      childOrdering: "vertical",
    });
    this.contentPane = new CanvasUIGroup({
      parent: this,
      childOrdering: "vertical",
      childFill: 1,
      fillX: true,
    });

    if (this.tabs.children.length > 0) {
      this.contentPane.addChild(this.tabs.children[0].content.pane);
    }
  }

  addTab(
    tab: { label: string; content: Widget } & Partial<
      Omit<CanvasTabArgs, "label" | "parent" | "content">
    >,
  ) {
    this.tabs.addTab(tab);
  }

  activeTab() {
    return this.tabs.activeTab();
  }
}

export interface CanvasProgressBarArgs extends CanvasUIArgs {
  bgColor?: string | null;
  border?: UIBorder | null;
  progressColor?: string;
  progress?: number;
}

export class CanvasProgressBar extends CanvasUIElement {
  bgColor: string | null;
  border: UIBorder | null;
  progressColor: string;
  progress: number;

  constructor(args: CanvasProgressBarArgs) {
    super(args);
    this.bgColor = args.bgColor ?? "#222222D8";
    this.border = args.border ?? null;
    this.progressColor = args.progressColor ?? "#A22A";
    this.progress = args.progress ?? 0;
  }

  setProgress(progress: number) {
    this.progress = progress;
    this.modified = true;
  }

  private drawProgress(pctx: CanvasRenderingContext2D, pos: Point) {
    if (!this.progress) return;
    pctx.fillStyle = this.progressColor;
    pctx.fillRect(
      pos.x,
      pos.y,
      this.realWidth * this.progress,
      this.realHeight,
    );
  }

  _render(ctx: UIDrawContext): void {
    const pctx = ctx.ctx;
    const pos = this.pos();

    pctx.fillStyle = this.bgColor ?? "#000";
    pctx.fillRect(pos.x, pos.y, this.realWidth, this.realHeight);
    this.drawProgress(pctx, pos);

    drawBorder(this, pctx, pos);
  }

  override preChildrenRender() {
    // do nothing;
  }

  override postChildrenRender() {
    // do nothing;
  }

  override event() {
    // do nothing;
  }
}
