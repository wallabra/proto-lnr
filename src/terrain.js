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
  return Math.pow((Math.sin((60 * (Math.sin(y / 100)+Math.sin(x / 80)) ) / 50) + 1) / 2, 4);
}

export class Terrain {
  constructor(definition) {
    this.definition = definition;
    this.sectors = new Map();
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