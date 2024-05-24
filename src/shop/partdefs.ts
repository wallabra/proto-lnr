import {
  CannonArgs,
  EngineArgs,
  ShipPartArgsSuper,
} from "../objects/shipmakeup";

export type PartRarity = number | "always";

export const OARS: PartDef<EngineArgs> = {
  name: "Oars",
  cost: 30,
  thrust: 600,
  vulnerability: 0.0002,
  maxDamage: 20,
  rarity: 1,
  manned: 25,
  weight: 3,
};

export const DEFAULT_ENGINE = {
  name: "Steamy",
  cost: 350,
  thrust: 2500,
  maxDamage: 100,
  fuel: { type: "coal", cost: 0.008 },
  shopRepeat: 2,
  rarity: 1,
  manned: 10,
  weight: 20,
};

export const DEFAULT_CANNON = {
  name: "Shooty",
  cost: 500,
  caliber: 4,
  range: 900,
  shootRate: 2,
  shopRepeat: 2,
  maxDamage: 100,
  rarity: 1,
  spread: Math.PI / 12,
  manned: 10,
  weight: 50,
};

export interface BasePartDef {
  shopRepeat?: number;
  rarity: PartRarity;
  name: string;
}

export type EngineDef = BasePartDef & EngineArgs;
export type CannonDef = BasePartDef & CannonArgs;

export type PartDef<PType extends ShipPartArgsSuper> = PType & BasePartDef;

export const PARTDEFS: {
  ["engine"]: PartDef<EngineDef>[];
  ["cannon"]: PartDef<CannonDef>[];
} = {
  engine: [
    OARS,
    DEFAULT_ENGINE,
    {
      name: "Hot Betty",
      thrust: 3500,
      cost: 700,
      maxDamage: 180,
      fuel: {
        type: "coal",
        cost: 0.025,
      },
      shopRepeat: 2,
      rarity: 3,
      manned: 15,
      weight: 40,
    },
    {
      name: "Piston Boy",
      maxDamage: 130,
      thrust: 3700,
      cost: 1200,
      fuel: {
        type: "diesel",
        cost: 0.05,
      },
      shopRepeat: 2,
      rarity: 1.5,
      weight: 20,
    },
    {
      name: "Oilytron",
      thrust: 4200,
      cost: 1440,
      maxDamage: 200,
      fuel: {
        type: "diesel",
        cost: 0.12,
      },
      rarity: 4,
      weight: 26,
    },
    {
      name: "Howitzer",
      maxDamage: 280,
      thrust: 5200,
      cost: 1900,
      fuel: {
        type: "diesel",
        cost: 0.15,
      },
      rarity: 7,
      weight: 33,
    },
    {
      name: "V-Star",
      thrust: 7500,
      maxDamage: 300,
      cost: 2000,
      fuel: {
        type: "diesel",
        cost: 0.17,
      },
      manned: 15,
      rarity: 4,
      weight: 40,
    },
  ],
  cannon: [
    DEFAULT_CANNON,
    {
      name: "WX Hefty",
      caliber: 5.5,
      range: 600,
      cost: 700,
      maxDamage: 150,
      shootRate: 3.5,
      shopRepeat: 2,
      rarity: 2,
      spread: Math.PI / 10,
      manned: 10,
      weight: 70,
    },
    {
      name: "WX Hefty Mk-II",
      caliber: 5.5,
      range: 700,
      cost: 820,
      maxDamage: 170,
      shootRate: 2.4,
      rarity: 2.5,
      spread: Math.PI / 11,
      manned: 10,
      weight: 72,
    },
    {
      name: "Juggernaut",
      caliber: 7.5,
      range: 550,
      cost: 2100,
      maxDamage: 400,
      shootRate: 3.5,
      rarity: 5,
      spread: Math.PI / 9,
      manned: 18,
      weight: 120,
    },
    {
      name: "Speedy",
      caliber: 4,
      range: 800,
      cost: 650,
      maxDamage: 130,
      shootRate: 1.0,
      shopRepeat: 2,
      rarity: 1.5,
      spread: Math.PI / 10.5,
      manned: 10,
      weight: 60,
    },
    {
      name: "Chain Cannon",
      caliber: 4,
      range: 600,
      cost: 2300,
      maxDamage: 160,
      shootRate: 0.3,
      rarity: 4,
      spread: Math.PI / 8,
      manned: 18,
      weight: 120,
    },
  ],
};
