import { ShipMake } from "../objects/shipmakeup";

export interface ShipMakeDef extends ShipMake {
  rarity: number;
}

export function pickRandomDef() {}

export const DEFAULT_MAKE: ShipMakeDef = {
  name: "Dependable Dave",
  cost: 2600,
  rarity: 5,
  slots: [
    { type: "cannon" },
    { type: "cannon" },
    { type: "cannon" },
    { type: "engine" },
    { type: "engine" },
  ],
  maxDamage: 5000,
  drag: 50,
  size: 20,
  lateralCrossSection: 1.7,
  repairCostScale: 1.5,
  weight: 4000,
};

export const MAKEDEFS: ShipMakeDef[] = [
  {
    name: "Patroller",
    cost: 900,
    slots: [{ type: "cannon" }, { type: "engine" }],
    maxDamage: 2000,
    drag: 50,
    size: 12,
    lateralCrossSection: 2,
    repairCostScale: 1.1,
    weight: 1000,
    rarity: 1,
  },
  {
    name: "Queen Bee",
    cost: 1400,
    slots: [{ type: "cannon" }, { type: "cannon" }, { type: "engine" }],
    maxDamage: 2600,
    drag: 50,
    size: 16,
    lateralCrossSection: 1.4,
    repairCostScale: 1.3,
    weight: 2000,
    rarity: 2,
  },
  {
    name: "Hubris",
    cost: 1700,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 2400,
    drag: 50,
    size: 14,
    lateralCrossSection: 2.5,
    repairCostScale: 1.3,
    weight: 1800,
    rarity: 2.5,
  },
  DEFAULT_MAKE,
  {
    name: "Wisp o' the Morning",
    cost: 4000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 6000,
    drag: 50,
    size: 22,
    lateralCrossSection: 1.8,
    repairCostScale: 1.6,
    weight: 7000,
    rarity: 7,
  },
  {
    name: "High Harpooner",
    cost: 6000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 7500,
    drag: 50,
    size: 22,
    lateralCrossSection: 2.15,
    repairCostScale: 2,
    weight: 8500,
    rarity: 11,
  },
  {
    name: "High Seas Roberts",
    cost: 7700,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 7500,
    drag: 50,
    size: 24,
    lateralCrossSection: 2.45,
    repairCostScale: 2.3,
    weight: 9900,
    rarity: 13,
  },
  {
    name: "Jasper",
    cost: 10000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 9000,
    drag: 50,
    size: 27,
    lateralCrossSection: 1.4,
    repairCostScale: 1.9,
    weight: 11000,
    rarity: 16,
  },
  {
    name: "Marie Antoniette",
    cost: 14000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 12000,
    drag: 50,
    size: 33,
    lateralCrossSection: 2.2,
    repairCostScale: 2.5,
    weight: 16000,
    rarity: 26,
  },
  {
    name: "Vicky Victorious",
    cost: 19000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
    ],
    maxDamage: 14500,
    drag: 50,
    size: 35,
    lateralCrossSection: 2.6,
    repairCostScale: 2.7,
    weight: 17000,
    rarity: 33,
  },
];
