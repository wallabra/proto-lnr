import Victor from "victor";
import {
  TerraSector,
  SECTOR_AREA,
  SECTOR_SIZE,
  SECTOR_REAL_SIZE,
  SECTOR_RES,
  Terrain,
} from "./terrain";
import { PlayState } from "./superstates/play";
import { rgbString, interpColor, lerp, moneyString, unlerp } from "./util";
import {
  CanvasLabel,
  CanvasLabelArgs,
  CanvasPanel,
  CanvasPanelArgs,
  CanvasProgressBar,
  CanvasRoot,
  CanvasUIArgs,
  CanvasUIElement,
  CanvasUIGroup,
  UIDrawContext,
} from "./ui";
import { Optional } from "utility-types";
import { Player } from "./player";
import { Cannon, Engine, ShipMakeup } from "./objects/shipmakeup";

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
      if (!obj.dying) obj.render(info);
    }
  }
}

type RGB = [number, number, number];

export class TerrainRenderer {
  terrain: Terrain | null;
  game: PlayState;
  renderedSectors: Map<string, HTMLImageElement>;

  constructor(game: PlayState) {
    this.game = game;
    this.terrain = game.terrain;
    this.renderedSectors = new Map();
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
    zoom: number,
  ) {
    if (this.terrain == null) {
      return;
    }

    const gcx = cx / zoom;
    const gcy = cy / zoom;

    for (let tileIdx = 0; tileIdx < SECTOR_AREA; tileIdx++) {
      const tx = tileIdx % SECTOR_SIZE;
      const ty = (tileIdx - tx) / SECTOR_SIZE;

      const height = sector.heights[tileIdx];
      const drawX = tx * SECTOR_RES;
      const drawY = ty * SECTOR_RES;

      const gradient = this.terrain.gradientAt(
        gcx + tx * SECTOR_RES,
        gcy + ty * SECTOR_RES,
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

  drawTerrainSector(
    sx: number,
    sy: number,
    sdlef: number,
    sdtop: number,
    sector: TerraSector,
    zoom: number,
  ) {
    const ctx = this.game.drawCtx;
    const key = `${sx},${sy}`;
    const sectorSize = SECTOR_REAL_SIZE * zoom;
    let image = this.renderedSectors.get(key);

    if (image == null) {
      const x = sx * sectorSize;
      const y = sy * sectorSize;

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = SECTOR_REAL_SIZE;
      renderCanvas.height = SECTOR_REAL_SIZE;
      const renderCtx = renderCanvas.getContext("2d");

      if (renderCtx == null) {
        throw new Error(
          "Could not make internal buffer to draw terrain chunk!",
        );
      }

      renderCtx.imageSmoothingEnabled = false;

      this.renderTerrainSector(renderCtx, x, y, sector, zoom);

      const imgData = renderCanvas.toDataURL("image/png", "image/octet-scream");
      const imgEl = document.createElement("img");
      imgEl.src = imgData;
      this.renderedSectors.set(key, imgEl);
      image = imgEl;
      renderCanvas.remove();
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sdlef, sdtop, sectorSize + 1, sectorSize + 1);
    ctx.imageSmoothingEnabled = true;
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

    const sectorSize = SECTOR_REAL_SIZE * zoom;

    const minSectorX = Math.floor(minX / SECTOR_REAL_SIZE);
    const minSectorY = Math.floor(minY / SECTOR_REAL_SIZE);
    const maxSectorX = Math.ceil(maxX / SECTOR_REAL_SIZE);
    const maxSectorY = Math.ceil(maxY / SECTOR_REAL_SIZE);
    const minDrawX = minSectorX * sectorSize + this.game.width / 2;
    const minDrawY = minSectorY * sectorSize + this.game.height / 2;

    // draw sectors as diversely coloured squares
    const sectorW = maxSectorX - minSectorX;
    const sectorH = maxSectorY - minSectorY;
    const sectorArea = sectorW * sectorH;

    for (let si = 0; si < sectorArea; si++) {
      const sx = si % sectorW;
      const sy = (si - sx) / sectorW;
      const sdlef = minDrawX - cam.x * zoom + sx * sectorSize;
      const sdtop = minDrawY - cam.y * zoom + sy * sectorSize;

      const sector = this.terrain.getSector(minSectorX + sx, minSectorY + sy);

      this.drawTerrainSector(
        minSectorX + sx,
        minSectorY + sy,
        sdlef,
        sdtop,
        sector,
        zoom,
      );
    }
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

  tick(deltaTime: number) {
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

  updateBar() {
    this.bar.progress = this.damageProgress();
  }

  updateLabel() {
    this.label.label =
      "Hull: " +
      (this.makeup.hullDamage === 0
        ? `100%`
        : `${Math.floor(100 * (1 - this.damageProgress()))}%${this.damageProgress() < 0.985 ? "" : "!"}`);
  }

  damageProgress() {
    return this.makeup.hullDamage / this.makeup.make.maxDamage;
  }

  tick(_timeDelta: number) {
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
      label: this.cannon.name,
      color: "#fff",
    });

    this.update();
  }

  alert(message: string) {
    this.pane.bgColor = "#a776";
    this.label.label += ` (${message})`;
    this.label.color = "#faa";
  }

  updateHasAmmo() {
    if (this.makeup.hasAmmo(this.cannon.caliber)) return;
    this.alert("No Ammo!");
  }

  updateHasCrew() {
    if (this.cannon.alreadyManned()) return;
    this.alert("No Crew!");
  }

  updateCooldown() {
    this.pane.progress = this.cannon.cooldown / this.cannon.shootRate;
  }

  updateDamage() {
    this.damage.progress = 1 - this.cannon.damage / this.cannon.maxDamage;
  }

  resetLabel() {
    this.label.label = this.cannon.name;
    this.label.color = "#fff";
  }

  resetBgColor() {
    this.pane.bgColor = "#2224";
  }

  checkDestroyed(): boolean {
    if (this.cannon.damage < this.cannon.maxDamage) return false;

    this.pane.remove();
    return true;
  }

  update() {
    if (this.checkDestroyed()) return;
    this.resetLabel();
    this.resetBgColor();
    this.updateCooldown();
    this.updateHasAmmo();
    this.updateHasCrew();
    this.updateDamage();
  }

  tick(_deltaTime: number) {
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
      label: "Cannons",
      color: "#fff",
    });

    this.populateCannonList();
  }

  populateCannonList() {
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

  pruneWidgets() {
    this.widgets = this.widgets.filter(
      (w) => w.cannon.damage < w.cannon.maxDamage,
    );
  }

  tick(deltaTime: number) {
    this.pruneWidgets();
    this.pane.bgColor = this.makeup.readyCannon != null ? "#F0E09018" : "#0000";

    for (const widget of this.widgets) widget.tick(deltaTime);
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

  getLabel() {
    return `${this.engine.name}  (${this.engine.fuelType})`;
  }

  alert(message: string) {
    this.pane.bgColor = "#a776";
    this.label.label += ` - ${message}`;
    this.label.color = "#faa";
  }

  updateHasFuel() {
    if (this.makeup.hasFuel(this.engine.fuelType)) return;
    this.alert("No Fuel!");
  }

  updateHasCrew() {
    if (this.engine.alreadyManned()) return;
    this.alert("No Crew!");
  }

  updateDamage() {
    this.damage.progress = 1 - this.engine.damage / this.engine.maxDamage;
  }

  resetLabel() {
    this.label.label = this.getLabel();
    this.label.color = "#fff";
  }

  resetBgColor() {
    this.pane.bgColor = "#2224";
  }

  checkDestroyed(): boolean {
    if (this.engine.damage < this.engine.maxDamage) return false;

    this.pane.remove();
    return true;
  }

  update() {
    if (this.checkDestroyed()) return;
    this.resetLabel();
    this.resetBgColor();
    this.updateHasFuel();
    this.updateHasCrew();
    this.updateDamage();
  }

  tick(_deltaTime: number) {
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
      label: "Engines",
      color: "#fff",
    });

    this.populateEngineList();
  }

  populateEngineList() {
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

  pruneWidgets() {
    this.widgets = this.widgets.filter(
      (w) => w.engine.damage < w.engine.maxDamage,
    );
  }

  tick(deltaTime: number) {
    this.pruneWidgets();

    for (const widget of this.widgets) widget.tick(deltaTime);
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
      label: this.fuelType,
    });

    this.label = new CanvasLabel({
      ...labelOpts,
      color: "#aaee",
    });

    this.update();
  }

  update() {
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

  tick(_deltaTime: number) {
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
      label: "Fuel",
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
      if (names.has(fuelType)) continue;
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

  tick(deltaTime: number) {
    for (const widget of this.widgets) widget.tick(deltaTime);
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
      label: Math.round(this.caliber * 10) + "mm",
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

  tick(_deltaTime: number) {
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
      label: "Ammo",
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

  tick(deltaTime: number) {
    for (const widget of this.widgets) widget.tick(deltaTime);
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

    this.addRow(
      "Financial",
      "Current",
      "- Salary",
      "- Hull Repair",
      "- Other Repair",
    );
    addStat("Cash", (player) => player.money);
    addStat("Inventory Value", (player) => player.totalInventoryValue());

    let initialAccrued = null;
    addStat("Day Profit", (player) => {
      const accrued = player.money + player.totalInventoryValue();
      if (initialAccrued == null) initialAccrued = accrued;
      return accrued - initialAccrued;
    });
    addStat("Expenditures", () => 0);

    this.addRow("---");
    this.addRow("Velocity", (label, player) => {
      label.label = `${(player.possessed.vel.length() / 10).toFixed(2)} m/s`;
    });
    this.addRow("Thrust & Weight", (label, player) => {
      const thrust = player.makeup.maxEngineThrust();
      const weight = player.makeup.totalWeight();
      const accel = thrust / weight;
      label.label = `${(thrust / 1000).toFixed(2)} kN  /  ${(weight / 1000).toFixed(2)} t  =>  ${accel.toFixed(2)} m/s²`;
    });
    this.addRow("Kills", (label, player) => {
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

    const labels = [];

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
        const appliedUpdater = value.bind(this, label, this.player);
        this.updaters.push(appliedUpdater);
        appliedUpdater();
      }

      labels.push(label);
    }

    return labels;
  }

  update() {
    for (const updater of this.updaters) {
      updater();
    }
  }

  tick(_deltaTime: number) {
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
  delayedInit: null | (() => void);

  toggleHud() {
    this.hidden = !this.hidden;
  }

  get player() {
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
        label: "Press H to toggle this HUD.",
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
        label: "Press L to leave the island.",
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
    };
  }

  tick(deltaTime: number) {
    if (
      this.player == null ||
      this.makeup == null ||
      this.makeup.hullDamage > this.makeup.make.maxDamage
    ) {
      return;
    }

    if (this.delayedInit != null) {
      this.delayedInit();
      this.delayedInit = null;
    }

    this.leaveIslandLabel.hidden = !this.player.inShopRange();
    this.leaveIslandLabel.label = this.player.possessed.inDanger()
      ? "You cannot leave the island; someone's chasing you!"
      : "Press L to leave island.";
    this.leaveIslandLabel.color = this.player.possessed.inDanger()
      ? "#f82d"
      : "#fecb";

    this.damageBar.tick(deltaTime);
    this.cannonList.tick(deltaTime);
    this.engineList.tick(deltaTime);
    this.fuelList.tick(deltaTime);
    this.ammoList.tick(deltaTime);
    this.counters.tick(deltaTime);
  }
}

class HudRenderer {
  game: PlayState;
  fpsCounter: FpsCounter;
  root: CanvasRoot;
  hud: Hud;
  hudMessage: CanvasLabel;

  constructor(game: PlayState) {
    this.game = game;
    this.root = new CanvasRoot(game);
    this.fpsCounter = new FpsCounter({ parent: this.root });
    this.hud = new Hud({ parent: this.root, renderer: this });
  }

  toggleHud() {
    this.hud.toggleHud();
  }

  renderPauseScreen() {
    const game = this.game;
    const ctx = game.drawCtx;

    if (!game.game.paused) return false;

    ctx.fillStyle = "#44228830";
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.fillStyle = "#eeffffc0";
    ctx.font = "40px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("paused", game.width / 2, game.height / 4);
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("(Press P to unpause)", game.width / 2, game.height / 4 + 55);

    return true;
  }

  renderDeathScreen() {
    const game = this.game;
    const ctx = game.drawCtx;

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
    ctx.fillText("rip", game.width / 2, game.height / 2);
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      "(Press R to start a new game)",
      game.width / 2,
      game.height / 4 + 55,
    );

    return true;
  }

  tick(deltaTime: number) {
    this.fpsCounter.tick(deltaTime);
    if (!this.game.game.paused) this.hud.tick(deltaTime);
  }

  renderUI(ctx: UIDrawContext) {
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

  toggleHud() {
    if (this.game.player.possessed != null && this.game.player.possessed.dying)
      return;
    this.r_hud.toggleHud();
  }

  renderBackground() {
    const ctx = this.game.drawCtx;

    const bgColor = "#3377aa";
    ctx.fillStyle = bgColor;

    ctx.fillRect(0, 0, this.game.width, this.game.height);
  }

  tick(deltaTime: number) {
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
