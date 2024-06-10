import Vec2 from "victor";
import random from "random";
import { lerp } from "./util";

export const SECTOR_SIZE = 32;
export const SECTOR_RES = 8;
export const SECTOR_AREA = SECTOR_SIZE * SECTOR_SIZE;
export const SECTOR_REAL_SIZE = SECTOR_SIZE * SECTOR_RES;

export class TerraSector {
  heights: Array<number>;

  constructor() {
    this.heights = new Array(SECTOR_AREA).fill(0);
  }
}

export interface TerraDef {
  (x: number, y: number): number;
}

interface LandfillDef {
  center: Vec2;
  radius: number;
  height: number;
}

function landfill(def: LandfillDef) {
  const cx = def.center.x;
  const cy = def.center.y;
  const { radius, height } = def;
  return function (x: number, y: number): number {
    const ox = (x - cx) / radius;
    const oy = (y - cy) / radius;
    const distSq = ox * ox + oy * oy;
    return height - distSq * height;
  };
}

function randomLandfill(scale: number = 1): LandfillDef {
  return {
    center: new Vec2(random.uniform(0, 800 * scale)(), 0).rotateBy(
      Math.PI * Math.random() * 2,
    ),
    radius: random.uniform(100, 400 * scale)(),
    height: random.uniform(0.4, 1.0)(),
  };
}

function randomLandfills(scale: number = 1): LandfillDef[] {
  return new Array(random.uniformInt(5, 20)())
    .fill(null)
    .map(() => randomLandfill(scale));
}

function landfills(
  landfills: LandfillDef[] = randomLandfills(),
  roughness: number = 20,
) {
  const funcs = landfills.map((def) => landfill(def));

  return (x: number, y: number) => {
    const vals = funcs.map((f) => f(x, y));
    return Math.max(
      0,
      Math.log(
        Math.max(
          0.000001,
          vals.map((v) => Math.exp(v * roughness)).reduce((a, b) => a + b, 0),
        ),
      ) / roughness,
    );
  };
}

export function landfillGenerator(distFactor: number = 1): TerraDef {
  return landfills(randomLandfills(distFactor));
}

export class Terrain {
  definition: TerraDef;
  sectors: Map<string, TerraSector>;
  cached: Map<string, number[]>;
  cacheSize: number;
  cacheRes: number;

  constructor(definition: TerraDef, cacheSize: number = 256, cacheRes: number = 4) {
    this.definition = definition;
    this.sectors = new Map();
    this.cached = new Map();
    this.cacheSize = cacheSize;
    this.cacheRes = cacheRes;
  }

  get cacheRowLen() {
    return this.cacheSize / this.cacheRes;
  }

  gradientAt(x: number, y: number): Vec2 {
    return new Vec2(
      this.heightAt(x + 0.5, y) - this.heightAt(x - 0.5, y),
      this.heightAt(x, y + 0.5) - this.heightAt(x, y - 0.5),
    );
  }

  realHeightAt(x: number, y: number) {
    return this.definition(x, y);
  }

  private genCache(cx: number, cy: number): number[] {
    const bx = cx * this.cacheSize + this.cacheRes / 2;
    const by = cy * this.cacheSize + this.cacheRes / 2;
    const len = this.cacheRowLen;
    const area = len * len;
    return new Array(area).fill(0).map((_, idx) => {
      const ix = idx % len;
      const iy = (idx - ix) / len;
      return this.realHeightAt(bx + ix * this.cacheRes, by + iy * this.cacheRes);
    });
  }

  getCache(cx: number, cy: number) {
    const key = "" + cx + "," + cy;
    if (this.cached.has(key)) {
      return this.cached.get(key);
    }
    const vals = this.genCache(cx, cy);
    this.cached.set(key, vals);
    return vals;
  }

  cacheCoords(x: number, y: number) {
    return { x: Math.floor(x / this.cacheSize), y: Math.floor(y / this.cacheSize) };
  }

  heightAt(x: number, y: number) {
    const csize = this.cacheSize;
    const cres = this.cacheRes;
    const clen = this.cacheRowLen;
    const ccoord = this.cacheCoords(x, y);
    const cached = this.getCache(ccoord.x, ccoord.y);
    const cx = x - ccoord.x * csize;
    const cy = y - ccoord.y * csize;
    const ix = Math.floor(cx / cres);
    const iy = Math.floor(cy / cres);

    // bilinear interpolation
    const alpha_x = ix % 1;
    const alpha_y = iy % 1;
    const ix2 = Math.min(ix + 1, clen - 1);
    const iy2 = Math.min(iy + 1, clen - 1);
    const ltop = lerp(cached[iy * clen + ix], cached[iy * clen + ix2], alpha_x);
    const lbottom = lerp(cached[iy2 * clen + ix], cached[iy2 * clen + ix2], alpha_x);
    return lerp(ltop, lbottom, alpha_y);
  }

  getSector(x: number, y: number): TerraSector {
    if (!this.sectors.has("" + x + "," + y)) {
      this.renderSector(x, y);
    }

    return <TerraSector>this.sectors.get("" + x + "," + y);
  }

  setSector(x: number, y: number, sector: TerraSector) {
    this.sectors.set("" + x + "," + y, sector);
  }

  renderSector(x: number, y: number) {
    const sector = new TerraSector();
    const baseX = x * SECTOR_REAL_SIZE;
    const baseY = y * SECTOR_REAL_SIZE;
    for (let i = 0; i < SECTOR_AREA; i++) {
      const cx = i % SECTOR_SIZE;
      const cy = (i - cx) / SECTOR_SIZE;
      sector.heights[i] = this.definition(
        baseX + cx * SECTOR_RES,
        baseY + cy * SECTOR_RES,
      );
    }
    this.setSector(x, y, sector);
  }
}
