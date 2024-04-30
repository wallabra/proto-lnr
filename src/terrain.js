//@flow

const Vec2 = require('victor');

export const SECTOR_SIZE = 32;
export const SECTOR_RES = 16;
export const SECTOR_AREA = SECTOR_SIZE * SECTOR_SIZE;
export const SECTOR_REAL_SIZE = SECTOR_SIZE * SECTOR_RES;

class TerraSector {
  constructor() {
    this.heights = new Array(SECTOR_AREA).fill(0);
  }
}

export function defPlaceholder(x, y) {
  return Math.pow(Math.min(1, Math.max(0, 1 - Math.sqrt((x*x) + (y*y)) / 900)), 5);
}

export class Terrain {
  constructor(definition) {
    this.definition = definition;
    this.sectors = new Map();
  }
  
  gradientAt(x, y) {
    return Vec2(
      game.terrain.heightAt(x+0.5, y) - game.terrain.heightAt(x-0.5, y),
      game.terrain.heightAt(x, y+0.5) - game.terrain.heightAt(x, y-0.5)
    );
  }
  
  heightAt(x, y) {
    return this.definition(x, y);
  }
  
  getSector(x, y) {
    if (!this.sectors.has(""+x+","+y)) {
      this.renderSector(x, y);
    }
    
    return this.sectors.get(""+x+","+y);
  }
  
  setSector(x, y, sector) {
    this.sectors.set(""+x+","+y, sector);
  }
  
  renderSector(x, y) {
    let sector = new TerraSector();
    let baseX = x * SECTOR_REAL_SIZE;
    let baseY = y * SECTOR_REAL_SIZE;
    for (let i = 0; i < SECTOR_AREA; i++) {
      let cx = i % SECTOR_SIZE;
      let cy = (i - cx) / SECTOR_SIZE;
      sector.heights[i] = this.definition(baseX + cx * SECTOR_RES, baseY + cy * SECTOR_RES);
    }
    this.setSector(x, y, sector);
  }
}