import Victor from "victor";
import type { TerraSector, Terrain } from "./terrain";
import {
  SECTOR_AREA,
  SECTOR_SIZE,
  SECTOR_REAL_SIZE,
  SECTOR_RES,
} from "./terrain";
import { isPhysicable, type PlayState } from "./superstates/play";
import {
  rgbString,
  interpColor,
  lerp,
  moneyString,
  unlerp,
  costString,
} from "./util";
import type {
  CanvasLabelArgs,
  CanvasPanelArgs,
  CanvasUIArgs,
  CanvasUIElement,
  UIDrawContext,
} from "./ui";
import {
  CanvasLabel,
  CanvasPanel,
  CanvasProgressBar,
  CanvasRoot,
  CanvasUIGroup,
} from "./ui";
import type { Optional } from "utility-types";
import type { Player } from "./player";
import type { Cannon, Engine, ShipMakeup } from "./objects/shipmakeup";
import i18next from "i18next";
import {
  translateEngineFuelType,
  translateFuelType,
  translatePartName,
} from "./internationalization";

export interface ObjectRenderInfo {
  scale: number;
  scaleVec: Victor;
  ctx: CanvasRenderingContext2D;
  base: Victor;
  cam: Victor;
  largeEdge: number;
  smallEdge: number;
  renderer: ObjectRenderer;
  width: number;
  height: number;
  toScreen: (worldPos: Victor) => Victor;
  toWorld: (screenPos: Victor) => Victor;
}

export interface Renderable {
  render: (info: ObjectRenderInfo) => void;
  dying: boolean;
  renderOrder?: number;
}

function renderOrderOf(r: Renderable) {
  return r.renderOrder || 0;
}

export class ObjectRenderer {
  game: PlayState;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(game: PlayState) {
    this.game = game;
    this.canvas = game.canvas;
    this.ctx = game.drawCtx;
  }

  renderObjects() {
    this.game.renderables = this.game.renderables.filter((o) => !o.dying);

    const ctx = this.game.drawCtx;
    const baseX = this.game.width / 2;
    const baseY = this.game.height / 2;

    const largeEdge = Math.max(this.game.width, this.game.height);
    const smallEdge = Math.max(this.game.width, this.game.height);
    const zoom = this.game.game.drawScale;

    const cam = this.game.cameraPos();
    const base = new Victor(baseX, baseY);

    const info: ObjectRenderInfo = {
      scale: zoom,
      scaleVec: new Victor(zoom, zoom),
      ctx: ctx,
      base: base,
      cam: cam,
      largeEdge: largeEdge,
      smallEdge: smallEdge,
      renderer: this,
      width: this.game.width,
      height: this.game.height,
      toScreen: (worldPos: Victor) =>
        worldPos.clone().subtract(cam).multiplyScalar(zoom).add(base),
      toWorld: (screenPos: Victor) =>
        screenPos.clone().subtract(base).divideScalar(zoom).add(cam),
    };

    for (const obj of this.game.renderables.sort(
      (a, b) => renderOrderOf(a) - renderOrderOf(b),
    )) {
      if (obj.dying) continue;

      if (isPhysicable(obj) && obj.phys.isSubmerged()) {
        ctx.globalAlpha = 0.3;
        ctx.filter = "brightness(0.8) contrast(0.5)";
      }
      obj.render(info);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
    }
  }
}

type RGB = [number, number, number];

const DEFAULT_TERRAIN_CACHE_SIZE = 10;

export class TerrainRenderer {
  game: PlayState;
  protected renderedSectors: Map<string, HTMLCanvasElement> = new Map();
  public terrainCacheSize: number | null = DEFAULT_TERRAIN_CACHE_SIZE;

  constructor(game: PlayState) {
    this.game = game;
  }

  get terrain(): Terrain | null {
    return this.game.terrain;
  }

  interpTerrainColor(height: number) {
    // below waterLevel
    const rgb1: RGB = [0, 10, 45];
    const rgb2: RGB = [30, 60, 70];
    // above waterLevel
    const rgb3: RGB = [110, 100, 72];
    const rgb4: RGB = [90, 197, 80];

    let from: RGB;
    let to: RGB;
    let alpha: number;

    if (height < this.game.waterLevel) {
      from = rgb1;
      to = rgb2;
      alpha = (height + (Math.random() - 0.5) * 0.008) / this.game.waterLevel;
    } else {
      from = rgb3;
      to = rgb4;
      alpha = (height - this.game.waterLevel) / (1 - this.game.waterLevel);
    }

    // lerp color
    const rgbFinal = interpColor(from, to, alpha);

    return rgbFinal;
  }

  renderTerrainSector(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    sector: TerraSector,
  ) {
    if (this.terrain == null) {
      return;
    }

    for (let tileIdx = 0; tileIdx < SECTOR_AREA; tileIdx++) {
      const tx = tileIdx % SECTOR_SIZE;
      const ty = (tileIdx - tx) / SECTOR_SIZE;

      const height = sector.heights[tileIdx];
      const drawX = tx * SECTOR_RES;
      const drawY = ty * SECTOR_RES;

      const gradient = this.terrain.gradientAt(
        cx + (tx + 0.5) * SECTOR_RES,
        cy + (ty + 0.5) * SECTOR_RES,
      );
      const shadowEffect = unlerp(
        this.game.waterLevel * 0.3,
        this.game.waterLevel * 1.1,
        height,
      );
      const shadowness = lerp(
        0,
        gradient.dot(new Victor(0, -10)),
        shadowEffect,
      );

      ctx.lineWidth = 0;
      ctx.fillStyle = rgbString(
        interpColor(this.interpTerrainColor(height), [12, 12, 12], shadowness),
      );
      ctx.fillRect(drawX, drawY, SECTOR_RES + 1, SECTOR_RES + 1);
    }
  }

  drawTerrainSector(sx: number, sy: number, sector: TerraSector) {
    const ctx = this.game.drawCtx;
    const key = `${sx.toString()},${sy.toString()}`;
    const sectorSize = SECTOR_REAL_SIZE;
    let image = this.renderedSectors.get(key);

    if (image == null) {
      const x = sx * sectorSize;
      const y = sy * sectorSize;

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = SECTOR_REAL_SIZE + 1;
      renderCanvas.height = SECTOR_REAL_SIZE + 1;
      const renderCtx = renderCanvas.getContext("2d");

      if (renderCtx == null) {
        throw new Error(
          "Could not make internal buffer to draw terrain chunk!",
        );
      }

      renderCtx.imageSmoothingEnabled = false;
      this.renderTerrainSector(renderCtx, x, y, sector);

      this.renderedSectors.set(key, renderCanvas);

      while (
        this.terrainCacheSize != null &&
        this.renderedSectors.size > this.terrainCacheSize
      )
        this.renderedSectors.delete(
          this.renderedSectors.keys().next().value as string,
        );

      image = renderCanvas;
    } else {
      // refresh position in Map (for LRU)
      /*this.renderedSectors.delete(key);
      this.renderedSectors.set(key, image);*/
      // NOTE: we aren't refreshing the position of drawn sectors because
      // this would be called on every frame for every drawn sector
      // (worst that can happen without this, is a sector gets deleted and
      // re-rendered right after, a small price to pay for smooth gameplay)
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, SECTOR_REAL_SIZE + 1, SECTOR_REAL_SIZE + 1);
    ctx.restore();
  }

  renderTerrain() {
    if (this.terrain == null) {
      return;
    }

    const zoom = this.game.game.drawScale;

    const cam = this.game.cameraPos();

    const minX = -this.game.width / 2 / zoom + cam.x;
    const minY = -this.game.height / 2 / zoom + cam.y;
    const maxX = this.game.width / 2 / zoom + cam.x;
    const maxY = this.game.height / 2 / zoom + cam.y;

    const minSectorX = Math.floor(minX / SECTOR_REAL_SIZE);
    const minSectorY = Math.floor(minY / SECTOR_REAL_SIZE);
    const maxSectorX = Math.ceil(maxX / SECTOR_REAL_SIZE);
    const maxSectorY = Math.ceil(maxY / SECTOR_REAL_SIZE);
    const minDrawX = minSectorX * SECTOR_REAL_SIZE + this.game.width / 2 / zoom;
    const minDrawY =
      minSectorY * SECTOR_REAL_SIZE + this.game.height / 2 / zoom;

    // draw sectors as diversely coloured squares
    const sectorW = maxSectorX - minSectorX;
    const sectorH = maxSectorY - minSectorY;
    const sectorArea = sectorW * sectorH;

    const ctx = this.game.drawCtx;
    ctx.save();
    ctx.scale(zoom, zoom);

    for (let si = 0; si < sectorArea; si++) {
      const sx = si % sectorW;
      const sy = (si - sx) / sectorW;
      const sdlef = minDrawX - cam.x + sx * SECTOR_REAL_SIZE;
      const sdtop = minDrawY - cam.y + sy * SECTOR_REAL_SIZE;
      ctx.save();
      ctx.translate(sdlef, sdtop);

      const sector = this.terrain.getSector(minSectorX + sx, minSectorY + sy);

      this.drawTerrainSector(minSectorX + sx, minSectorY + sy, sector);
      ctx.restore();
    }

    ctx.restore();
  }
}

interface FpsCounterArgs extends Optional<CanvasLabelArgs, "label"> {
  refreshRate?: number;
}

class FpsCounter extends CanvasLabel {
  fps: number | null;
  refreshRate: number;

  constructor(args: FpsCounterArgs) {
    super({
      height: 16,
      autoFont: true,
      font: "$Hpx sans-serif",
      label: "",
      dockX: "end",
      dockY: "start",
      dockMarginX: 25,
      dockMarginY: 20,
      textAlign: "end",
      color: "#ff08",
      ...args,
    });
    this.fps = null;
    this.refreshRate = args.refreshRate || 1;
  }

  public tick(deltaTime: number) {
    const immediateFps = 1 / deltaTime;

    if (this.fps == null) {
      this.fps = immediateFps;
    } else {
      this.fps = lerp(this.fps, immediateFps, this.refreshRate * deltaTime);

      // fix FPS counter on some weird circumstances
      if (isNaN(this.fps) || this.fps < 0) {
        this.fps = immediateFps;
      }
    }

    this.label = Math.ceil(this.fps).toString();
  }
}

interface HudDamageBarArgs {
  parent: CanvasUIElement;
  makeup: ShipMakeup;
  opts?: Partial<CanvasUIArgs>;
}

class HudDamageBar {
  bar: CanvasProgressBar;
  makeup: ShipMakeup;
  label: CanvasLabel;

  constructor(args: HudDamageBarArgs) {
    this.makeup = args.makeup;
    this.bar = new CanvasProgressBar({
      parent: args.parent,
      childOrdering: "vertical",
      childMargin: 4,
      fillX: true,
      progress: this.damageProgress(),
      progressColor: "#f82",
      height: 16,
      paddingY: 1,
      ...(args.opts || {}),
    });
    this.label = new CanvasLabel({
      parent: this.bar,
      fillY: 1,
      dockX: "center",
      dockY: "center",
      autoFont: true,
      font: "bold $Hpx sans-serif",
      color: "white",
      label: "-",
    });
    this.updateLabel();
  }

  protected updateBar() {
    this.bar.progress = this.damageProgress();
  }

  protected updateLabel() {
    const progress = this.damageProgress();
    this.label.label = i18next.t("hud.hull", {
      percent: (100 - 100 * progress).toFixed(1) + (progress < 0.95 ? "" : "!"),
    });
  }

  protected damageProgress() {
    return this.makeup.hullDamage / this.makeup.make.maxDamage;
  }

  public tick(_timeDelta: number) {
    this.updateBar();
    this.updateLabel();
  }
}

interface HudCannonArgs {
  cannon: Cannon;
  makeup: ShipMakeup;
  parent: CanvasUIElement;
  opts?: Partial<CanvasUIArgs>;
}

class HudCannon {
  pane: CanvasProgressBar;
  label: CanvasLabel;
  cannon: Cannon;
  makeup: ShipMakeup;
  damage: CanvasProgressBar;

  constructor(args: HudCannonArgs) {
    this.cannon = args.cannon;
    this.makeup = args.makeup;

    this.pane = new CanvasProgressBar({
      parent: args.parent,
      childFill: 1,
      height: 25,
      childOrdering: "vertical",
      childMargin: 2,
      bgColor: "#2224",
      progressColor: "#aaa6",
      fillX: 0.9,
      dockX: "center",
      paddingX: 4,
      paddingY: 8,
      ...(args.opts || {}),
    });

    this.damage = new CanvasProgressBar({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 1,
      fillX: true,
      height: 2,
      fillY: 0.05,
      bgColor: "#000",
      progressColor: "#028",
      progress: 0,
    });

    this.label = new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 2,
      fillX: true,
      autoFont: true,
      font: "$Hpx sans-serif",
      dockX: "start",
      dockY: "center",
      dockMarginX: 10,
      paddingY: 4,
      maxHeight: 15,
      label: "-",
      color: "#fff",
    });

    this.update();
  }

  protected alert(message: string) {
    this.pane.bgColor = "#a776";
    this.label.label += ` ${message}`;
    this.label.color = "#faa";
  }

  protected updateHasAmmo() {
    if (this.makeup.hasAmmo(this.cannon.caliber)) return;
    this.alert(i18next.t("hud.cannon.noAmmo"));
  }

  protected updateHasCrew() {
    if (this.cannon.alreadyManned()) return;
    this.alert(i18next.t("hud.cannon.noCrew"));
  }

  protected updateLocked() {
    if (!this.cannon.locked) return;
    this.label.label += " " + i18next.t("hud.cannon.locked");
    this.label.color = "#ee4";
    this.pane.bgColor = "#aa25";
    this.pane.border = { color: "#FF0B", width: 2.5, dashes: [4, 2] };
  }

  protected updateCooldown() {
    this.pane.progress = this.cannon.cooldown / this.cannon.shootRate;
  }

  protected updateDamage() {
    this.damage.progress = 1 - this.cannon.damage / this.cannon.maxDamage;
  }

  protected resetLabel() {
    this.label.label = translatePartName(this.cannon);
    this.label.color = "#fff";
  }

  protected resetBgColor() {
    this.pane.bgColor = "#2224";
    this.pane.border = null;
  }

  protected checkDestroyed(): boolean {
    if (this.cannon.damage < this.cannon.maxDamage) return false;

    this.pane.remove();
    return true;
  }

  protected update() {
    if (this.checkDestroyed()) return;
    this.resetLabel();
    this.resetBgColor();
    this.updateCooldown();
    this.updateLocked();
    this.updateHasAmmo();
    this.updateHasCrew();
    this.updateDamage();
  }

  public tick() {
    this.update();
  }
}

interface HudCannonListArgs {
  parent: CanvasUIElement;
  makeup: ShipMakeup;
}

class HudCannonList {
  pane: CanvasUIGroup;
  widgets: HudCannon[];
  makeup: ShipMakeup;

  constructor(args: HudCannonListArgs) {
    this.makeup = args.makeup;
    this.widgets = [];

    this.pane = new CanvasUIGroup({
      parent: args.parent,
      childOrdering: "vertical",
      fillX: true,
      childFill: 1,
      childMargin: 3,
    });

    new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 5,
      height: 16.5,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      label: i18next.t("hud.cannons"),
      color: "#fff",
    });

    this.populateCannonList();
  }

  protected populateCannonList() {
    for (const cannon of this.makeup.getPartsOf("cannon") as Cannon[]) {
      this.widgets.push(
        new HudCannon({
          parent: this.pane,
          cannon: cannon,
          makeup: this.makeup,
        }),
      );
    }
  }

  protected pruneWidgets() {
    this.widgets = this.widgets.filter(
      (w) => w.cannon.damage < w.cannon.maxDamage,
    );
  }

  public tick() {
    this.pruneWidgets();
    this.pane.bgColor = this.makeup.readyCannon != null ? "#F0E09018" : "#0000";

    for (const widget of this.widgets) widget.tick();
  }
}

interface HudEngineArgs {
  engine: Engine;
  makeup: ShipMakeup;
  parent: CanvasUIElement;
  opts?: Partial<CanvasUIArgs>;
}

class HudEngine {
  pane: CanvasPanel;
  label: CanvasLabel;
  engine: Engine;
  makeup: ShipMakeup;
  damage: CanvasProgressBar;

  constructor(args: HudEngineArgs) {
    this.engine = args.engine;
    this.makeup = args.makeup;

    this.pane = new CanvasPanel({
      parent: args.parent,
      childFill: 1,
      height: 25,
      childOrdering: "vertical",
      childMargin: 2,
      bgColor: "#2224",
      fillX: 0.9,
      dockX: "center",
      paddingX: 4,
      paddingY: 8,
      ...(args.opts || {}),
    });

    this.damage = new CanvasProgressBar({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 1,
      fillX: true,
      height: 2,
      fillY: 0.05,
      bgColor: "#000",
      progressColor: "#028",
      progress: 0,
    });

    this.label = new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 2,
      fillX: true,
      autoFont: true,
      font: "$Hpx sans-serif",
      dockX: "start",
      dockY: "center",
      dockMarginX: 10,
      paddingY: 4,
      maxHeight: 15,
      label: this.getLabel(),
      color: "#fff",
    });

    this.update();
  }

  protected getLabel() {
    return `${translatePartName(this.engine)}  (${translateEngineFuelType(this.engine)})`;
  }

  protected alert(message: string) {
    this.pane.bgColor = "#a776";
    this.label.label += ` - ${message}`;
    this.label.color = "#faa";
  }

  protected updateHasFuel() {
    if (this.engine.fuelType == null) return;
    if (this.makeup.hasFuel(this.engine.fuelType)) return;
    this.alert(i18next.t("hud.engine.noFuel"));
  }

  protected updateHasCrew() {
    if (this.engine.alreadyManned()) return;
    this.alert(i18next.t("hud.engine.noCrew"));
  }

  protected updateDamage() {
    this.damage.progress = 1 - this.engine.damage / this.engine.maxDamage;
  }

  protected resetLabel() {
    this.label.label = this.getLabel();
    this.label.color = "#fff";
  }

  protected resetBgColor() {
    this.pane.bgColor = "#2224";
  }

  protected checkDestroyed(): boolean {
    if (this.engine.damage < this.engine.maxDamage) return false;

    this.pane.remove();
    return true;
  }

  public update() {
    if (this.checkDestroyed()) return;
    this.resetLabel();
    this.resetBgColor();
    this.updateHasFuel();
    this.updateHasCrew();
    this.updateDamage();
  }

  public tick() {
    this.update();
  }
}

interface HudEngineListArgs {
  parent: CanvasUIElement;
  makeup: ShipMakeup;
}

class HudEngineList {
  pane: CanvasUIGroup;
  widgets: HudEngine[];
  makeup: ShipMakeup;

  constructor(args: HudEngineListArgs) {
    this.makeup = args.makeup;
    this.widgets = [];

    this.pane = new CanvasUIGroup({
      parent: args.parent,
      childOrdering: "vertical",
      fillX: true,
      childFill: 1,
      childMargin: 3,
    });

    new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 5,
      height: 16.5,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      label: i18next.t("hud.engines"),
      color: "#fff",
    });

    this.populateEngineList();
  }

  protected populateEngineList() {
    for (const engine of this.makeup.getPartsOf("engine") as Engine[]) {
      this.widgets.push(
        new HudEngine({
          parent: this.pane,
          engine: engine,
          makeup: this.makeup,
        }),
      );
    }
  }

  protected pruneWidgets() {
    this.widgets = this.widgets.filter(
      (w) => w.engine.damage < w.engine.maxDamage,
    );
  }

  public tick() {
    this.pruneWidgets();

    for (const widget of this.widgets) widget.tick();
  }
}

interface HudFuelArgs {
  parent: CanvasUIElement;
  fuel: string;
  makeup: ShipMakeup;
}

class HudFuel {
  fuelType: string;
  makeup: ShipMakeup;
  pane: CanvasProgressBar;
  maximum: number;
  label: CanvasLabel;

  constructor(args: HudFuelArgs) {
    this.fuelType = args.fuel;
    this.makeup = args.makeup;
    this.maximum = 0;

    this.pane = new CanvasProgressBar({
      parent: args.parent,
      fillX: true,
      childOrdering: "vertical",
      childMargin: 2,
      paddingX: 6,
      paddingY: 3,
      height: 22,
      //childFill: 1,
      bgColor: "#7781",
      progressColor: "89cb",
      progress: 1,
    });

    const labelOpts: CanvasLabelArgs = {
      parent: this.pane,
      color: "#eeee",
      fillY: 0.95,
      dockX: "start",
      height: 12,
      childOrdering: "horizontal",
      childFill: 1,
      dockMarginX: 5,
      autoFont: true,
      font: "$Hpx sans-serif",
      label: "-",
    };

    new CanvasLabel({
      ...labelOpts,
      label: translateFuelType(this.fuelType),
    });

    this.label = new CanvasLabel({
      ...labelOpts,
      color: "#aaee",
    });

    this.update();
  }

  protected update() {
    const amount = this.makeup.totalFuel(this.fuelType);
    if (amount > this.maximum) this.maximum = amount;
    this.pane.progress = amount / this.maximum;
    this.label.label = (Math.ceil(10 * amount) / 10).toString();
    this.label.color =
      amount >
      this.makeup
        .getReadyEngines()
        .filter((e) => e.fuelType === this.fuelType)
        .reduce((a, b) => a + b.fuelCost, 0) *
        15
        ? "#aaee"
        : "#faa";
  }

  public tick() {
    this.update();
  }
}

interface HudFuelListArgs {
  parent: CanvasUIElement;
  makeup: ShipMakeup;
}

class HudFuelList {
  makeup: ShipMakeup;
  pane: CanvasUIGroup;
  widgets: HudFuel[];

  constructor(args: HudFuelListArgs) {
    this.makeup = args.makeup;
    this.widgets = [];

    this.pane = new CanvasUIGroup({
      parent: args.parent,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 5,
      bgColor: "#0000",
      paddingX: 3,
      paddingY: 2,
    });

    new CanvasLabel({
      parent: this.pane,
      color: "#fff",
      autoFont: true,
      font: "bold $Hpx sans-serif",
      height: 16.5,
      label: i18next.t("hud.fuel"),
      childOrdering: "vertical",
      childMargin: 5,
    });

    const list = new CanvasUIGroup({
      parent: this.pane,
      fillX: true,
      paddingX: 2,
      childOrdering: "vertical",
      childMargin: 0,
      childFill: 1,
      bgColor: "#0001",
    });

    const names = new Set();
    for (const engine of this.makeup.getPartsOf("engine") as Engine[]) {
      const fuelType = engine.fuelType;
      if (fuelType == null || names.has(fuelType)) continue;
      this.widgets.push(
        new HudFuel({
          makeup: this.makeup,
          fuel: fuelType,
          parent: list,
        }),
      );
      names.add(fuelType);
    }
  }

  tick() {
    for (const widget of this.widgets) widget.tick();
  }
}

interface HudAmmoArgs {
  makeup: ShipMakeup;
  parent: CanvasUIElement;
  caliber: number;
}

class HudAmmo {
  makeup: ShipMakeup;
  caliber: number;
  pane: CanvasProgressBar;
  label: CanvasLabel;
  maximum: number;

  constructor(args: HudAmmoArgs) {
    this.makeup = args.makeup;
    this.caliber = args.caliber;
    this.pane = new CanvasProgressBar({
      parent: args.parent,
      height: 22,
      //childFill: 1,
      childOrdering: "vertical",
      childMargin: 2,
      paddingX: 6,
      paddingY: 3,
      fillX: true,
      progress: 1,
      bgColor: "#7781",
      progressColor: "c98b",
    });
    this.maximum = 0;

    const labelOpts: CanvasLabelArgs = {
      parent: this.pane,
      color: "#eeee",
      fillY: 0.95,
      dockX: "start",
      height: 12,
      childOrdering: "horizontal",
      childFill: 1,
      dockMarginX: 5,
      autoFont: true,
      font: "$Hpx sans-serif",
      label: "-",
    };

    new CanvasLabel({
      ...labelOpts,
      label: (this.caliber * 10).toFixed(0) + "mm",
    });

    this.label = new CanvasLabel({
      ...labelOpts,
      color: "#aaee",
    });

    this.update();
  }

  update() {
    const amount = this.makeup.totalAmmo(this.caliber);
    if (amount > this.maximum) this.maximum = amount;
    this.pane.progress = amount / this.maximum;
    this.label.label = amount.toFixed(0);
  }

  tick() {
    this.update();
  }
}

interface HudAmmoListArgs {
  makeup: ShipMakeup;
  parent: CanvasUIElement;
}

class HudAmmoList {
  pane: CanvasUIGroup;
  makeup: ShipMakeup;
  widgets: HudAmmo[];

  constructor(args: HudAmmoListArgs) {
    this.makeup = args.makeup;
    this.widgets = [];

    this.pane = new CanvasUIGroup({
      parent: args.parent,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 5,
      bgColor: "#0000",
      paddingX: 5,
      paddingY: 3,
    });

    new CanvasLabel({
      parent: this.pane,
      color: "#fff",
      autoFont: true,
      font: "bold $Hpx sans-serif",
      height: 16.5,
      label: i18next.t("hud.ammo"),
      childOrdering: "vertical",
      childMargin: 5,
    });

    const list = new CanvasUIGroup({
      parent: this.pane,
      fillX: true,
      paddingX: 2,
      childOrdering: "vertical",
      childMargin: 0,
      childFill: 1,
      bgColor: "#0001",
    });

    const names = new Set();
    for (const cannon of this.makeup.getPartsOf("cannon") as Cannon[]) {
      const caliber = cannon.caliber;
      if (names.has(caliber)) continue;
      this.widgets.push(
        new HudAmmo({
          makeup: this.makeup,
          caliber: caliber,
          parent: list,
        }),
      );
      names.add(caliber);
    }
  }

  tick() {
    for (const widget of this.widgets) widget.tick();
  }
}

interface HudCountersArgs {
  parent: CanvasUIElement;
  player: Player;
}

class HudCounters {
  player: Player;
  pane: CanvasPanel;
  updaters: (() => void)[];
  rows: CanvasUIGroup[] = [];

  constructor(args: HudCountersArgs) {
    this.player = args.player;
    this.updaters = [];
    this.pane = new CanvasPanel({
      parent: args.parent,
      fillX: true,
      childOrdering: "vertical",
      childMargin: 5,
      bgColor: "#0001",
    });

    this.addRow(
      i18next.t("hud.info.day", { day: this.player.game.difficulty + 1 }),
    );
    this.addRow(i18next.t("hud.info.dayTime"), (label) => {
      const dayTime = new Date(
        (this.player.game.state as PlayState).now * 1000,
      );
      label.label = dayTime.toISOString().slice(11, 19);
    });
    this.addRow("---");

    const statValue = (value: (player: Player) => number) => {
      return (label: CanvasLabel, player: Player) => {
        const money = value(player);
        label.label = money == 0 ? "-" : moneyString(money);
        label.color = money >= 0 ? "#aaf" : "#f98";
      };
    };

    const financialStatRow = (value: (player: Player) => number) => {
      return [
        statValue((player: Player) => value(player)),
        statValue((player: Player) => value(player) - player.totalSalary()),
        statValue(
          (player: Player) =>
            value(player) - player.totalSalary() - player.totalHullRepairCost(),
        ),
        statValue(
          (player: Player) =>
            value(player) - player.totalSalary() - player.totalRepairCost(),
        ),
      ];
    };

    const addStat = (name: string, value: (player: Player) => number) => {
      this.addRow(name, ...financialStatRow(value));
    };

    const headers: string[] = [
      "finance",
      "finance.current",
      "finance.minusSalary",
      "finance.minusHullRepair",
      "finance.minusOtherRepair",
    ].map((n) => i18next.t("hud.info." + n));
    this.addRow(headers[0], ...headers.slice(1));
    addStat(i18next.t("hud.info.finance.cash"), (player) => player.money);
    addStat(i18next.t("hud.info.finance.inventoryValue"), (player) =>
      player.totalInventoryValue(),
    );

    let initialAccrued: null | number = null;
    addStat(i18next.t("hud.info.finance.dayProfit"), (player) => {
      const accrued = player.money + player.totalInventoryValue();
      if (initialAccrued == null) initialAccrued = accrued;
      return accrued - initialAccrued;
    });
    addStat(i18next.t("hud.info.finance.expenditures"), () => 0);

    this.addRow("---");
    this.addRow(i18next.t("hud.info.velocity"), (label, player) => {
      if (player.possessed == null) return;
      label.label = `${(player.possessed.vel.length() / 10).toFixed(2)} m/s`;
    });
    this.addRow(i18next.t("hud.info.thrust"), (label, player) => {
      const thrust = player.makeup.maxEngineThrust();
      const weight = player.makeup.totalWeight();
      const accel = thrust / weight;
      label.label = `${(thrust / 1000).toFixed(2)} kN  /  ${(weight / 1000).toFixed(2)} t  =>  ${accel.toFixed(2)} m/s²`;
    });
    this.addRow(i18next.t("hud.info.kills"), (label, player) => {
      label.label = player.kills.toString();
    });
  }

  private addRow(
    name: string,
    ...values: (string | ((label: CanvasLabel, player: Player) => void))[]
  ): CanvasLabel[] {
    const row = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 1.5,
      height: 15,
      childFill: 1,
      fillX: true,
      paddingX: 8,
      paddingY: 2,
      bgColor: "#0000",
    });

    const i = this.rows.push(row);
    row.bgColor = `#${i % 2 ? "11" : "22"}08${i % 2 ? "08" : "11"}40`;

    const labels: CanvasLabel[] = [];

    const opts: Optional<CanvasLabelArgs, "label"> = {
      parent: row,
      childOrdering: "horizontal",
      childFill: 1,
      childMargin: 2,
      fillY: 0.95,
      autoFont: true,
      font: "$Hpx sans-serif",
      height: 12,
    };

    new CanvasLabel({
      ...opts,
      color: "#fee",
      font: "bold $Hpx sans-serif",
      label: name,
    });

    for (const value of values) {
      const label = new CanvasLabel({
        ...opts,
        color: "#aaf",
        label: "",
      });

      if (typeof value === "string") {
        label.label = value;
      } else {
        const appliedUpdater = value.bind(
          this,
          label,
          this.player,
        ) as () => void;
        this.updaters.push(appliedUpdater);
        appliedUpdater();
      }

      labels.push(label);
    }

    return labels;
  }

  private update() {
    for (const updater of this.updaters) {
      updater();
    }
  }

  tick() {
    this.update();
  }
}

class Sinkometer {
  private player: Player;
  private panel: CanvasPanel;

  constructor(player: Player, parent: CanvasUIElement) {
    this.player = player;
    this.panel = new CanvasPanel({
      parent: parent,
      bgColor: "#00F6",
      fillX: 0.8,
      paddingX: 0,
      paddingY: 0,
      dockMarginX: 0,
      dockMarginY: 0,
      childMargin: 0,
      childOrdering: "vertical",
      dockY: "end",
      height: 10,
      dockX: "center",
    });
  }

  private update() {
    if (this.player.possessed == null || this.panel.parent == null) return;

    this.panel.fillY = this.player.possessed.phys.submersion();
  }

  tick() {
    this.update();
  }
}

interface HudArgs extends Partial<CanvasPanelArgs> {
  renderer: HudRenderer;
  parent: CanvasUIElement;
}

class Hud extends CanvasPanel {
  renderer: HudRenderer;
  play: PlayState;
  content: CanvasPanel;

  leaveIslandLabel: CanvasLabel;
  damageBar: HudDamageBar;
  cannonList: HudCannonList;
  engineList: HudEngineList;
  fuelList: HudFuelList;
  ammoList: HudAmmoList;
  counters: HudCounters;
  sinkometer: Sinkometer;
  delayedInit: null | (() => void);

  toggleHud() {
    this.hidden = !this.hidden;
  }

  get player() {
    if (this.play.player == null)
      throw new Error("Cannot draw HUD for a playerless game");
    return this.play.player;
  }

  get makeup() {
    return this.player.makeup;
  }

  constructor(args: HudArgs) {
    super({
      ...args,
      fillY: 0.3,
      height: 200,
      fillX: true,
      dockY: "end",
      bgColor: "#0000",
      paddingX: 5,
      paddingY: 5,
    });

    this.renderer = args.renderer;
    this.play = this.renderer.game;

    this.delayedInit = () => {
      this.content = new CanvasPanel({
        parent: this,
        fillX: true,
        fillY: true,
        bgColor: "#0001",
        paddingX: 5,
        paddingY: 5,
      });

      new CanvasLabel({
        height: 10.5,
        dockX: "start",
        dockMarginX: 35,
        parent: this.content,
        childOrdering: "vertical",
        childMargin: 2,
        color: "#ffac",
        label: i18next.t("hud.toggleHud"),
      });

      this.leaveIslandLabel = new CanvasLabel({
        parent: args.parent,
        dockX: "center",
        dockY: "start",
        height: 20,
        autoFont: true,
        font: "bold $Hpx sans-serif",
        dockMarginY: 90,
        color: "#fecd",
        label: i18next.t("hud.status.leave"),
      });

      this.damageBar = new HudDamageBar({
        parent: this.content,
        makeup: this.makeup,
      });

      // HUD panels
      const panelWrapper = new CanvasPanel({
        parent: this.content,
        fillX: true,
        childOrdering: "vertical",
        childFill: 1,
        childMargin: 2,
        bgColor: "#0003",
      });

      const addPanel = (
        callback: (parent: CanvasPanel) => void,
        options: Partial<CanvasPanelArgs> = {},
      ) => {
        const panel = new CanvasPanel({
          parent: panelWrapper,
          childOrdering: "horizontal",
          childMargin: 5,
          childFill: 1,
          fillY: true,
          paddingY: 3,
          bgColor: "#0002",
          ...options,
        });

        callback(panel);
      };

      addPanel(
        (panel: CanvasUIElement) => {
          this.cannonList = new HudCannonList({
            parent: panel,
            makeup: this.makeup,
          });
        },
        { childFill: 0.5 },
      );

      addPanel(
        (panel: CanvasUIElement) => {
          this.engineList = new HudEngineList({
            parent: panel,
            makeup: this.makeup,
          });
        },
        { childFill: 0.5 },
      );

      addPanel(
        (panel: CanvasUIElement) => {
          this.fuelList = new HudFuelList({
            parent: panel,
            makeup: this.makeup,
          });
          this.ammoList = new HudAmmoList({
            parent: panel,
            makeup: this.makeup,
          });
        },
        { childFill: 0.3 },
      );

      addPanel(
        (panel: CanvasUIElement) => {
          this.counters = new HudCounters({
            parent: panel,
            player: this.player,
          });
        },
        { childFill: 1.2 },
      );

      addPanel(
        (panel: CanvasUIElement) => {
          this.sinkometer = new Sinkometer(this.player, panel);
        },
        { childFill: 0.02 },
      );
    };
  }

  tick(deltaTime: number) {
    if (
      this.player.possessed == null ||
      this.makeup.hullDamage > this.makeup.make.maxDamage
    ) {
      return;
    }

    if (this.delayedInit != null) {
      this.delayedInit();
      this.delayedInit = null;
    }

    this.leaveIslandLabel.hidden =
      !this.player.inShopRange() || this.player.possessed.dying;
    this.leaveIslandLabel.label = this.player.possessed.inDanger()
      ? i18next.t("hud.status.leaveChase")
      : i18next.t("hud.status.leave");
    this.leaveIslandLabel.color = this.player.possessed.inDanger()
      ? "#f82d"
      : "#fecb";

    this.damageBar.tick(deltaTime);
    this.cannonList.tick();
    this.engineList.tick();
    this.fuelList.tick();
    this.ammoList.tick();
    this.counters.tick();
    this.sinkometer.tick();
  }
}

interface TickerMessage {
  color: string;
  message?: string | null;
  amount?: number | null;
  scale?: number;
  expiry: number;
}

export type TickerMessageArgs = Omit<TickerMessage, "expiry">;

interface TickerMessageBox extends CanvasUIGroup {
  children: [CanvasLabel] | [CanvasLabel, CanvasLabel];
}

interface TickerRows extends CanvasUIGroup {
  children: TickerMessageBox[];
}

interface TickerPanel extends CanvasPanel {
  children: [CanvasLabel, TickerRows];
}

class StatusTicker {
  private gainLabel: CanvasLabel;
  private totalGain = 0;
  private messages: TickerMessage[] = [];
  private panel: TickerPanel;
  private tickerRows: TickerRows;
  private messageMap = new Map<TickerMessage, CanvasUIGroup>();
  private standardLabelArgs: Partial<CanvasLabelArgs> = {
    childOrdering: "horizontal",
    childMargin: 30,
    autoFont: true,
    font: "bold $Hpx sans-serif",
    dockY: "center",
    alignY: "center",
    fillY: 1,
  };
  private bounce = 0;
  private unbounceSpeed = 60;
  private state: PlayState;

  public maxMessages = 8;

  constructor(state: PlayState, parent: CanvasUIElement) {
    this.state = state;
    this.panel = new CanvasPanel({
      parent: parent,
      fillX: 0.35,
      fillY: 0.2,
      width: 400,
      height: 200,
      bgColor: "#0000",
      paddingX: 25,
      paddingY: 10,
    }) as TickerPanel;

    this.gainLabel = new CanvasLabel({
      parent: this.panel,
      hidden: true,
      label: "",
      autoFont: true,
      height: 20,
      maxHeight: 20,
      font: "bold $Hpx sans-serif",
      x: 25,
      color: "#55DA",
      childOrdering: "vertical",
      childMargin: 20,
    });

    this.tickerRows = new CanvasUIGroup({
      parent: this.panel,
      childOrdering: "vertical",
      childMargin: 10,
      childFill: 1,
      fillX: true,
      bgColor: "#0000",
    }) as TickerRows;
  }

  private now() {
    return this.state.now;
  }

  private pruneMessages() {
    for (const old of this.messages.slice(0, -this.maxMessages)) {
      this.removeMessage(old, false);
    }

    this.messageMap.forEach((group, message) => {
      const timeLeft = message.expiry - this.now();

      if (timeLeft < 0) {
        this.removeMessage(message);
      } else if (timeLeft < 1) {
        group.opacity = timeLeft;
      }
    });
  }

  private updateGainLabel() {
    console.log(this.totalGain);
    if (Math.abs(this.totalGain) < 0.001 || this.messages.length === 0) {
      this.totalGain = 0;
      this.gainLabel.label = "";
      this.gainLabel.hidden = true;
    } else {
      this.gainLabel.label = costString(-this.totalGain);
      this.gainLabel.hidden = false;
    }
  }

  private removeMessage(toRemove: TickerMessage, addBounce = true) {
    if (this.messages.indexOf(toRemove) !== -1) {
      this.messages.splice(this.messages.indexOf(toRemove), 1);
      this.updateGainLabel();
    }

    const el = this.messageMap.get(toRemove);

    if (el != null) {
      if (addBounce) this.bounce += el.realHeight + el.childMargin;
      el.remove();
      this.messageMap.delete(toRemove);
    }
  }

  private addMessageChild(message: TickerMessage): TickerMessageBox {
    const group: TickerMessageBox = new CanvasUIGroup({
      parent: this.tickerRows,
      fillX: true,
      paddingX: 10,
      paddingY: 5,
      height: 24,
      bgColor: "#111A",
      childOrdering: "vertical",
      childMargin: 8,
    }) as TickerMessageBox;

    if (message.amount != null) {
      const string = costString(-message.amount);
      new CanvasLabel({
        parent: group,
        label: message.message == null ? string : `(${string})`,
        color: message.message == null ? message.color : "#580",
        ...this.standardLabelArgs,
        height: 16 * (message.scale ?? 1),
      });
    }

    if (message.message != null) {
      new CanvasLabel({
        parent: group,
        label: message.message,
        color: message.color,
        ...this.standardLabelArgs,
        height: 16 * (message.scale ?? 1),
      });
    }

    return group;
  }

  public addMessage(message: TickerMessageArgs, duration: number) {
    const messageItem: TickerMessage = {
      ...message,
      expiry: this.now() + duration,
    };
    this.messages.push(messageItem);
    this.messageMap.set(messageItem, this.addMessageChild(messageItem));
    if (message.amount != null) {
      this.totalGain += message.amount;
      this.updateGainLabel();
    }
  }

  private update() {
    this.pruneMessages();
    this.gainLabel.opacity = Math.max(
      ...this.tickerRows.children.map((child) => child.opacity),
    );
  }

  private unbounce(deltaTime: number) {
    if (this.bounce > 0) {
      if (this.messages.length === 0) {
        this.bounce = 0;
        this.tickerRows.y = 0;
        return;
      }
      this.bounce -= deltaTime * this.unbounceSpeed;
      if (this.bounce < 0) this.bounce = 0;
      this.tickerRows.y = this.bounce;
      this.tickerRows.updateCache();
    }
  }

  public tick(deltaTime: number) {
    this.update();
    this.unbounce(deltaTime);
  }
}

class HudRenderer {
  public game: PlayState;
  protected fpsCounter: FpsCounter;
  protected root: CanvasRoot;
  protected hud: Hud;
  protected hudMessage: CanvasLabel;
  protected statusTicker: StatusTicker;

  constructor(game: PlayState) {
    this.game = game;
    this.root = new CanvasRoot(game.game);
    this.fpsCounter = new FpsCounter({ parent: this.root });
    this.hud = new Hud({ parent: this.root, renderer: this });
    this.statusTicker = new StatusTicker(game, this.root);
  }

  public addMessage(message: TickerMessageArgs, duration: number) {
    this.statusTicker.addMessage(message, duration);
  }

  public toggleHud() {
    this.hud.toggleHud();
  }

  protected renderPauseScreen() {
    const game = this.game;
    const ctx = game.drawCtx;

    if (!game.game.paused) return false;

    ctx.fillStyle = "#44228830";
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.fillStyle = "#eeffffc0";
    ctx.font = "40px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(i18next.t("hud.paused"), game.width / 2, game.height / 4);
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      i18next.t("hud.pauseMessage"),
      game.width / 2,
      game.height / 4 + 55,
    );

    return true;
  }

  protected renderDeathScreen(): boolean {
    const game = this.game;
    const ctx = game.drawCtx;

    if (game.player == null) {
      return false;
    }

    if (game.player.possessed == null) {
      return false;
    }

    if (!game.player.possessed.dying) {
      return false;
    }

    ctx.fillStyle = "#22222240";
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.fillStyle = "#ffff00a0";
    ctx.font = "60px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(i18next.t("hud.status.rip"), game.width / 2, game.height / 2);
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      i18next.t("hud.status.tryAgain"),
      game.width / 2,
      game.height / 4 + 55,
    );

    return true;
  }

  public tick(deltaTime: number) {
    this.fpsCounter.tick(deltaTime);

    if (!this.game.game.paused) {
      this.hud.tick(deltaTime);
      this.statusTicker.tick(deltaTime);
    }
  }

  public renderUI(ctx: UIDrawContext) {
    if (this.renderDeathScreen()) this.hud.hidden = true;

    this.root.checkChangeDimensions(this.game.width, this.game.height);
    this.root.checkUpdateCache();
    this.root.render(ctx);

    this.renderPauseScreen();
  }
}

export class GameRenderer {
  game: PlayState;
  r_objects: ObjectRenderer;
  r_terrain: TerrainRenderer;
  r_hud: HudRenderer;

  constructor(game: PlayState) {
    this.game = game;
    this.r_objects = new ObjectRenderer(game);
    this.r_terrain = new TerrainRenderer(game);
    this.r_hud = new HudRenderer(game);
  }

  public toggleHud() {
    if (this.game.player == null) return;
    if (this.game.player.possessed != null && this.game.player.possessed.dying)
      return;
    this.r_hud.toggleHud();
  }

  protected renderBackground() {
    const ctx = this.game.drawCtx;

    const bgColor = "#3377aa";
    ctx.fillStyle = bgColor;

    ctx.fillRect(0, 0, this.game.width, this.game.height);
  }

  public tick(deltaTime: number) {
    this.r_hud.tick(deltaTime);
  }

  private makeUIDrawContext(): UIDrawContext {
    return {
      ctx: this.game.drawCtx,
      game: this.game.game,
    };
  }

  public render() {
    this.renderBackground();
    this.r_terrain.renderTerrain();
    this.r_objects.renderObjects();
    this.r_hud.renderUI(this.makeUIDrawContext());
  }
}
