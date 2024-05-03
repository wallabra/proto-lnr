import Vec2 from "victor";
import {
  TerraSector,
  SECTOR_AREA,
  SECTOR_SIZE,
  SECTOR_REAL_SIZE,
  SECTOR_RES,
  Terrain,
} from "./terrain.js";
import { rgbString, interpColor } from "./util.ts";
import { Game } from "./game.ts";

export type ObjectRenderInfo = {
  scale: number;
  ctx: CanvasRenderingContext2D;
  base: Vec2;
  cam: Vec2;
  smallEdge: number;
  renderer: ObjectRenderer;
};

export interface Renderable {
  render: (info: ObjectRenderInfo) => void;
  dying: boolean;
}

export class ObjectRenderer {
  renderables: Array<Renderable>;
  game: Game;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zoom: number;

  constructor(game: Game) {
    this.game = game;
    this.canvas = game.canvas;
    this.ctx = game.drawCtx;
    this.renderables = [];
    this.zoom = 1000;
  }

  renderObjects() {
    this.renderables = this.renderables.filter((o) => !o.dying);

    const ctx = this.game.drawCtx;
    const baseX = this.game.width / 2;
    const baseY = this.game.height / 2;

    const smallEdge = Math.min(this.canvas.width, this.canvas.height);
    const zoom = this.zoom / smallEdge;

    let cam;

    if (this.game.player != null && this.game.player.possessed != null) {
      cam = this.game.player.possessed.pos.clone();
    } else {
      cam = Vec2(0, 0);
    }

    const info: ObjectRenderInfo = {
      scale: zoom,
      ctx: ctx,
      base: Vec2(baseX, baseY),
      cam: cam,
      smallEdge: smallEdge,
      renderer: this,
    };

    for (const obj of this.renderables) {
      obj.render(info);
    }
  }
}

export class TerrainRenderer {
  terrain: Terrain | null;
  game: Game;
  renderedSectors: Map<string, HTMLImageElement>;

  constructor(game: Game) {
    this.game = game;
    this.terrain = game.terrain;
    this.renderedSectors = new Map();
  }

  interpTerrainColor(height: number) {
    // below waterLevel
    const rgb1 = [0, 10, 45];
    const rgb2 = [30, 60, 70];
    // above waterLevel
    const rgb3 = [50, 90, 30];
    const rgb4 = [180, 182, 197];

    let from;
    let to;
    let alpha;

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
        cx + tx * SECTOR_RES,
        cy + ty * SECTOR_RES,
      );
      const shadowness =
        height < this.game.waterLevel
          ? 0
          : Math.max(0, 30 * gradient.dot(Vec2(0, -1)));

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
  ) {
    const ctx = this.game.drawCtx;
    const key = `${sx},${sy}`;
    let image = this.renderedSectors.get(key);

    if (image == null) {
      const x = sx * SECTOR_REAL_SIZE;
      const y = sx * SECTOR_REAL_SIZE;

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

      this.renderTerrainSector(renderCtx, x, y, sector);

      const imgData = renderCanvas.toDataURL("image/png", "image/octet-scream");
      const imgEl = document.createElement("img");
      imgEl.src = imgData;
      this.renderedSectors.set(key, imgEl);
      image = imgEl;
      renderCanvas.remove();
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sdlef,
      sdtop,
      SECTOR_REAL_SIZE + 1,
      SECTOR_REAL_SIZE + 1,
    );
    ctx.imageSmoothingEnabled = true;
  }

  renderTerrain() {
    if (this.terrain == null) {
      return;
    }

    const cam = this.game.cameraPos();

    const minX = -(this.game.width / 2) + cam.x;
    const minY = -(this.game.height / 2) + cam.y;
    const maxX = this.game.width / 2 + cam.x;
    const maxY = this.game.height / 2 + cam.y;

    const minSectorX = Math.floor(minX / SECTOR_REAL_SIZE);
    const minSectorY = Math.floor(minY / SECTOR_REAL_SIZE);
    const maxSectorX = Math.ceil(maxX / SECTOR_REAL_SIZE);
    const maxSectorY = Math.ceil(maxY / SECTOR_REAL_SIZE);
    const minDrawX = minSectorX * SECTOR_REAL_SIZE + this.game.width / 2;
    const minDrawY = minSectorY * SECTOR_REAL_SIZE + this.game.height / 2;

    // draw sectors as diversely coloured squares
    const sectorW = maxSectorX - minSectorX;
    const sectorH = maxSectorY - minSectorY;
    const sectorArea = sectorW * sectorH;

    for (let si = 0; si < sectorArea; si++) {
      const sx = si % sectorW;
      const sy = (si - sx) / sectorW;
      const sdlef = minDrawX - cam.x + sx * SECTOR_REAL_SIZE;
      const sdtop = minDrawY - cam.y + sy * SECTOR_REAL_SIZE;

      const sector = this.terrain.getSector(minSectorX + sx, minSectorY + sy);

      this.drawTerrainSector(
        minSectorX + sx,
        minSectorY + sy,
        sdlef,
        sdtop,
        sector,
      );
    }
  }
}

class UIRenderer {
  game: Game;

  constructor(game) {
    this.game = game;
  }

  renderDeathScreen() {
    const game = this.game;

    // render death screen
    const ctx = game.drawCtx;

    if (
      game.player != null &&
      game.player.possessed != null &&
      game.player.possessed.dying
    ) {
      ctx.fillStyle = "#22222240";
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.fillStyle = "#ffff00";
      ctx.font = "60px Verdana serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("rip", game.width / 2, game.height / 2);
    }
  }

  renderKillScore() {
    const game = this.game;

    // render kill score
    const ctx = game.drawCtx;

    if (game.player != null && game.player.possessed != null) {
      ctx.fillStyle = "#0099ff";
      ctx.font = "30px Verdana serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(`K: ${game.player.possessed.killScore}`, 40, 40);
    }
  }

  renderUI() {
    this.renderKillScore();
    this.renderDeathScreen();
  }
}

export class Renderer {
  game: Game;
  r_objects: ObjectRenderer;
  r_terrain: TerrainRenderer;
  r_ui: UIRenderer;

  constructor(game) {
    this.game = game;
    this.r_objects = new ObjectRenderer(game);
    this.r_terrain = new TerrainRenderer(game);
    this.r_ui = new UIRenderer(game);
  }

  addRenderObj(obj: Renderable) {
    this.r_objects.renderables.push(obj);
  }

  renderBackground() {
    const ctx = this.game.drawCtx;

    const bgColor = "#3377aa";
    ctx.fillStyle = bgColor;

    ctx.fillRect(0, 0, this.game.width, this.game.height);
  }

  public render() {
    const game = this.game;

    game.canvas.width = game.width;
    game.canvas.height = game.height;

    this.renderBackground();
    this.r_terrain.renderTerrain();
    this.r_objects.renderObjects();
    this.r_ui.renderUI();
  }
}
