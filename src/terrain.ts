import Vec2 from "victor";
import random from "random";
//import { lerp } from "./util";

export const SECTOR_SIZE = 32;
export const SECTOR_RES = 8;
export const SECTOR_AREA = SECTOR_SIZE * SECTOR_SIZE;
export const SECTOR_REAL_SIZE = SECTOR_SIZE * SECTOR_RES;

interface LRUItem2D<T> {
  x: number;
  y: number;
  item: T;
}

class LRUMap2D<T> {
  private cache: LRUItem2D<T>[];
  private index: { [x: number]: { [y: number]: number } };
  private order: number[];
  private maxLen: number | null;

  constructor(maxLen: number | null = null) {
    this.clear();
    this.maxLen = maxLen;
  }

  public clear() {
    this.cache = [];
    this.index = {};
    this.order = [];
  }

  private _delete(idx: number) {
    const item = this.cache[idx];
    delete this.index[item.x][item.y];
    this.cache.splice(idx, 1);
  }

  private _setItem(item: LRUItem2D<T>, idx: number) {
    (this.index[item.x] ??= {})[item.y] = idx;
    this.order.push(idx);
  }

  private setItem(item: LRUItem2D<T>) {
    if (this.maxLen != null && this.cache.length > this.maxLen) {
      const idx = this.order.shift();
      this._delete(idx);
    }
    const newIdx = this.cache.push(item) - 1;
    this._setItem(item, newIdx);
    return this;
  }

  public set(x: number, y: number, item: T) {
    this.setItem({
      x,
      y,
      item,
    });
  }

  public get(x: number, y: number): T | null {
    const row = this.index[x];
    if (row == null) return null;
    const idx = row[y];
    if (idx == null) return null;

    const orderIdx = this.order.indexOf(idx);
    if (orderIdx > 0)
      this.order[0] = this.order.splice(orderIdx, 1, this.order[0])[0];

    return row[y] != null ? this.cache[row[y]].item : null;
  }

  public size() {
    return this.cache.length;
  }
}

export class TerraSector {
  heights: Array<number>;

  constructor() {
    this.heights = new Array(SECTOR_AREA).fill(0);
  }
}

export interface TerraDef {
  (x: number, y: number): number;
  boundingBox: BoundingBox;
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
    center: new Vec2(random.uniform(0, 500 * scale)(), 0).rotateBy(
      Math.PI * Math.random() * 2,
    ),
    radius: random.uniform(100, 250 * scale)(),
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

interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function isInBoundingBox(x: number, y: number, box: BoundingBox): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function boxUnion(...boxes: BoundingBox[]): BoundingBox {
  return boxes.reduce(
    (bounds, box) => ({
      left: Math.min(box.left, box.right, bounds.left),
      right: Math.max(box.left, box.right, bounds.right),
      top: Math.min(box.top, box.bottom, bounds.top),
      bottom: Math.max(box.top, box.bottom, bounds.bottom),
    }),
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity },
  );
}

function landfillBoundingBox(landfill: LandfillDef): BoundingBox {
  return {
    left: landfill.center.x - landfill.radius,
    right: landfill.center.x + landfill.radius,
    top: landfill.center.y - landfill.radius,
    bottom: landfill.center.y + landfill.radius,
  };
}

function multiLandfillBoundingBox(...landfills: LandfillDef[]): BoundingBox {
  return boxUnion(...landfills.map((l) => landfillBoundingBox(l)));
}

export function landfillGenerator(distFactor: number = 1): TerraDef {
  const ldefs = randomLandfills(distFactor);
  return Object.assign(landfills(ldefs), {
    boundingBox: multiLandfillBoundingBox(...ldefs),
  });
}

export class Terrain {
  definition: TerraDef;
  sectors: LRUMap2D<TerraSector>;
  cached: LRUMap2D<number[]>;
  cacheSize: number;
  cacheRes: number;

  constructor(
    definition: TerraDef,
    cacheSize: number = 512,
    cacheRes: number = 4,
  ) {
    this.definition = definition;
    this.sectors = new LRUMap2D();
    this.cached = new LRUMap2D();
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
    if (!isInBoundingBox(x, y, this.definition.boundingBox)) return 0;
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
      return this.realHeightAt(
        bx + ix * this.cacheRes,
        by + iy * this.cacheRes,
      );
    });
  }

  getCache(cx: number, cy: number) {
    let res = this.cached.get(cx, cy);
    if (res != null) {
      return res;
    }
    res = this.genCache(cx, cy);
    this.cached.set(cx, cy, res);
    return res;
  }

  cacheCoords(x: number, y: number) {
    return {
      x: Math.floor(x / this.cacheSize),
      y: Math.floor(y / this.cacheSize),
    };
  }

  heightAt(x: number, y: number) {
    if (!isInBoundingBox(x, y, this.definition.boundingBox)) return 0;

    const csize = this.cacheSize;
    const cres = this.cacheRes;
    const clen = this.cacheRowLen;
    const ccoord = this.cacheCoords(x, y);
    //console.debug('terrain cache size:', this.cached.size());
    const cached = this.getCache(ccoord.x, ccoord.y);
    const cx = x - ccoord.x * csize;
    const cy = y - ccoord.y * csize;
    const ix = Math.floor(cx / cres);
    const iy = Math.floor(cy / cres);

    // no longer use bilinear
    return cached[iy * clen + ix];

    // bilinear interpolation
    /*
    const alpha_x = ix % 1;
    const alpha_y = iy % 1;
    const ix2 = Math.min(ix + 1, clen - 1);
    const iy2 = Math.min(iy + 1, clen - 1);
    const ltop = lerp(cached[iy * clen + ix], cached[iy * clen + ix2], alpha_x);
    const lbottom = lerp(
      cached[iy2 * clen + ix],
      cached[iy2 * clen + ix2],
      alpha_x,
    );
    return lerp(ltop, lbottom, alpha_y);
    */
  }

  getSector(x: number, y: number): TerraSector {
    return this.sectors.get(x, y) ?? this.renderSector(x, y);
  }

  setSector(x: number, y: number, sector: TerraSector) {
    this.sectors.set(x, y, sector);
  }

  renderSector(x: number, y: number): TerraSector {
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
    return sector;
  }
}
