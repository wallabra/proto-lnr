import Vec2 from "victor";
import random from "random";

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
  center: Vec2,
  radius: number,
  height: number
}

function landfill(def: LandfillDef) {
  const cx = def.center.x;
  const cy = def.center.y;
  const { radius, height } = def;
  return function(x: number, y: number): number {
    const ox = (x - cx) / radius;
    const oy = (y - cy) / radius;
    const distSq = (ox * ox) + (oy * oy);
    return height - distSq * height;
  }
}

function randomLandfill(scale: number = 1): LandfillDef {
  return {
    center: new Vec2(random.uniform(0, 800 * scale)(), 0).rotateBy(Math.PI * Math.random() * 2),
    radius: random.uniform(100, 400 * scale)(),
    height: random.uniform(0.4, 1.0)()
  };
}

function randomLandfills(scale: number = 1): LandfillDef[] {
  return new Array(random.uniformInt(5, 20)()).fill(null).map(() => randomLandfill(scale));
}

function landfills(landfills: LandfillDef[] = randomLandfills(), roughness: number = 20) {
  const funcs = landfills.map((def) => landfill(def));
  const len = funcs.length;

  return (x: number, y: number) => {
    const vals = funcs.map((f) => f(x, y));
    return Math.max(0, Math.log(Math.max(0.000001, vals.map((v) => Math.exp(v * roughness)).reduce((a, b) => a + b, 0))) / roughness);
  };
}

export function landfillGenerator(distFactor: number = 1): TerraDef {
  return landfills(randomLandfills(distFactor));
}

export class Terrain {
  definition: TerraDef;
  sectors: Map<string, TerraSector>;

  constructor(definition: TerraDef) {
    this.definition = definition;
    this.sectors = new Map();
  }

  gradientAt(x: number, y: number): Vec2 {
    return new Vec2(
      this.heightAt(x + 0.5, y) - this.heightAt(x - 0.5, y),
      this.heightAt(x, y + 0.5) - this.heightAt(x, y - 0.5),
    );
  }

  heightAt(x: number, y: number) {
    return this.definition(x, y);
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
