import {
  CannonArgs,
  EngineArgs,
  ShipPartArgsSuper,
} from "../objects/shipmakeup";

export type PartRarity = number | "always";

export const OARS: PartDef<EngineArgs> = {
  name: "Oars",
  cost: 30,
  thrust: 0.5,
  vulnerability: 0.003,
  maxDamage: 1,
  rarity: "always",
  manned: 12,
};

export const DEFAULT_ENGINE = {
  name: "Steamy",
  cost: 160,
  thrust: 1.2,
  fuel: { type: "coal", cost: 0.008 },
  shopRepeat: 2,
  rarity: 1,
  manned: 10,
};

export const DEFAULT_CANNON = {
  name: "Shooty",
  cost: 160,
  caliber: 4,
  range: 900,
  shootRate: 2,
  shopRepeat: 2,
  rarity: 1,
  spread: Math.PI / 12,
  manned: 10,
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
      thrust: 1.7,
      cost: 700,
      maxDamage: 8,
      fuel: {
        type: "coal",
        cost: 0.025,
      },
      shopRepeat: 2,
      rarity: 3,
      manned: 15,
    },
    {
      name: "Piston Boy",
      maxDamage: 6,
      thrust: 2.3,
      cost: 1200,
      fuel: {
        type: "diesel",
        cost: 0.05,
      },
      shopRepeat: 2,
      rarity: 1.5,
      manned: 12,
    },
    {
      name: "Howitzer",
      maxDamage: 15,
      thrust: 3.0,
      cost: 2500,
      fuel: {
        type: "diesel",
        cost: 0.15,
      },
      rarity: 7,
      manned: 13,
    },
    {
      name: "Oilytron",
      thrust: 2.7,
      cost: 1440,
      fuel: {
        type: "diesel",
        cost: 0.12,
      },
      rarity: 4,
      manned: 15,
    },
  ],
  cannon: [
    DEFAULT_CANNON,
    {
      name: "WX Hefty",
      caliber: 5.5,
      range: 600,
      cost: 622,
      shootRate: 3.5,
      shopRepeat: 2,
      rarity: 2,
      spread: Math.PI / 10,
      manned: 10,
    },
    {
      name: "WX Hefty Mk-II",
      caliber: 5.5,
      range: 700,
      cost: 700,
      shootRate: 2.4,
      rarity: 2.5,
      spread: Math.PI / 11,
      manned: 10,
    },
    {
      name: "Juggernaut",
      caliber: 7.5,
      range: 550,
      cost: 1200,
      shootRate: 3.5,
      rarity: 5,
      spread: Math.PI / 9,
      manned: 18,
    },
    {
      name: "Speedy",
      caliber: 4,
      range: 800,
      cost: 1000,
      shootRate: 1.0,
      shopRepeat: 2,
      rarity: 1.5,
      spread: Math.PI / 10.5,
      manned: 10,
    },
    {
      name: "Chain Cannon",
      caliber: 4,
      range: 600,
      cost: 2300,
      shootRate: 0.3,
      rarity: 4,
      spread: Math.PI / 8,
      manned: 18,
    },
  ],
};
