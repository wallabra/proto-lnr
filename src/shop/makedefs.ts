import type { ShipMake } from "../objects/shipmakeup";

export interface ShipMakeDef extends ShipMake {
  rarity: number;
  shopChance?: number | null;
}

export function pickRandomDef() {}

export const DEFAULT_MAKE: ShipMakeDef = {
  name: "Dependable Dave",
  cost: 2600,
  rarity: 5,
  shopChance: 0.4,
  slots: [
    { type: "cannon" },
    { type: "cannon" },
    { type: "cannon" },
    { type: "vacuum" },
    { type: "engine" },
    { type: "engine" },
    { type: "armor" },
  ],
  maxDamage: 5000,
  drag: 50,
  size: 20,
  lateralCrossSection: 1.7,
  repairCostScale: 1.5,
  weight: 0.3,
};

export const MAKEDEFS: ShipMakeDef[] = [
  {
    name: "fisherman",
    cost: 350,
    slots: [{ type: "engine" }],
    maxDamage: 800,
    drag: 25,
    size: 8,
    lateralCrossSection: 2.5,
    repairCostScale: 1.1,
    weight: 0.3,
    rarity: 0.75,
    shopChance: 0.8,
  },
  {
    name: "patroller",
    cost: 900,
    slots: [{ type: "cannon" }, { type: "engine" }],
    maxDamage: 2000,
    drag: 50,
    size: 12,
    lateralCrossSection: 2,
    repairCostScale: 1.1,
    weight: 0.3,
    rarity: 1,
    shopChance: 0.6,
  },
  {
    name: "queenBee",
    cost: 1400,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "vacuum" },
      { type: "armor" },
    ],
    maxDamage: 2600,
    drag: 50,
    size: 16,
    lateralCrossSection: 1.4,
    repairCostScale: 1.3,
    weight: 0.3,
    rarity: 2,
    shopChance: 0.5,
  },
  {
    name: "hubris",
    cost: 1700,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "vacuum" },
      { type: "armor" },
    ],
    maxDamage: 2400,
    drag: 50,
    size: 14,
    lateralCrossSection: 2.5,
    repairCostScale: 1.3,
    weight: 0.3,
    rarity: 2.5,
    shopChance: 0.5,
  },
  DEFAULT_MAKE,
  {
    name: "wispOfTheMorning",
    cost: 4000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 6000,
    drag: 50,
    size: 22,
    lateralCrossSection: 1.8,
    repairCostScale: 1.6,
    weight: 0.3,
    rarity: 7,
    shopChance: 0.3,
  },
  {
    name: "highHarpooner",
    cost: 6000,
    slots: [
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "cannon" },
      { type: "engine" },
      { type: "engine" },
      { type: "engine" },
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 7500,
    drag: 50,
    size: 22,
    lateralCrossSection: 2.15,
    repairCostScale: 2,
    weight: 0.4,
    rarity: 11,
    shopChance: 0.25,
  },
  {
    name: "highSeasRoberts",
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
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 7500,
    drag: 50,
    size: 24,
    lateralCrossSection: 2.45,
    repairCostScale: 2.3,
    weight: 0.4,
    rarity: 13,
    shopChance: 0.2,
  },
  {
    name: "jasper",
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
      { type: "vacuum" },
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 9000,
    drag: 50,
    size: 27,
    lateralCrossSection: 1.4,
    repairCostScale: 1.9,
    weight: 0.4,
    rarity: 16,
    shopChance: 0.15,
  },
  {
    name: "marieAntoniette",
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
      { type: "vacuum" },
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 12000,
    drag: 50,
    size: 33,
    lateralCrossSection: 2.2,
    repairCostScale: 2.5,
    weight: 0.45,
    rarity: 26,
    shopChance: 0.115,
  },
  {
    name: "vickyVictorious",
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
      { type: "vacuum" },
      { type: "vacuum" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
      { type: "armor" },
    ],
    maxDamage: 14500,
    drag: 50,
    size: 35,
    lateralCrossSection: 2.6,
    repairCostScale: 2.7,
    weight: 0.45,
    rarity: 33,
    shopChance: 0.08,
  },
];
