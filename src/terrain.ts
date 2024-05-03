import Vec2 from "victor";

export const SECTOR_SIZE = 32;
export const SECTOR_RES = 16;
export const SECTOR_AREA = SECTOR_SIZE * SECTOR_SIZE;
export const SECTOR_REAL_SIZE = SECTOR_SIZE * SECTOR_RES;

export class TerraSector {
  heights: Array<number>;

  constructor() {
    this.heights = new Array(SECTOR_AREA).fill(0);
  }
}

export function defPlaceholder(x: number, y: number): number {
  return Math.pow(
    Math.min(1, Math.max(0, 1 - Math.sqrt(x * x + y * y) / 900)),
    5,
  );
}

export type TerraDef = (x: number, y: number) => number;

export class Terrain {
  definition: TerraDef;
  sectors: Map<string, TerraSector>;

  constructor(definition: TerraDef) {
    this.definition = definition;
    this.sectors = new Map();
  }

  gradientAt(x: number, y: number) {
    return Vec2(
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
