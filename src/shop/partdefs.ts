import type {
  CannonArgs,
  EngineArgs,
  ShipPartArgsSuper,
  VacuumArgs,
} from "../objects/shipmakeup";

export type PartRarity = number | "always";

export const OARS: PartDef<EngineArgs & ShipPartArgsSuper> = {
  name: "Oars",
  cost: 30,
  thrust: 40000.0,
  vulnerability: 0.002,
  maxDamage: 20,
  rarity: 1,
  manned: 30,
  weight: 3,
  shopRepeat: 6,
  shopChance: 0.55,
  dropChance: 0.6,
};

export const DEFAULT_ENGINE = {
  name: "Steamy",
  cost: 350,
  thrust: 102400.0,
  maxDamage: 100,
  fuel: { type: "coal", cost: 0.008 },
  shopRepeat: 3,
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
  shopRepeat: 3,
  maxDamage: 100,
  rarity: 1,
  spread: Math.PI / 12,
  manned: 10,
  weight: 50,
  shopChance: 0.3,
};

export const DEFAULT_VACUUM: PartDef<VacuumArgs> = {
  name: "Slurpman",
  cost: 120,
  suckRadius: 90,
  suckStrength: 20000000,
  weight: 40,
  shopChance: 0.4,
  shopRepeat: 2,
  rarity: 1,
  maxDamage: 10,
  vulnerability: 0.0012,
};

export interface BasePartDef {
  shopRepeat?: number;
  rarity: PartRarity;
  name: string;
}

export type EngineDef = BasePartDef & EngineArgs;
export type CannonDef = BasePartDef & CannonArgs;

export type PartDef<PType> = PType & BasePartDef & ShipPartArgsSuper;
export type AnyPartDef = (typeof PARTDEFS)[keyof typeof PARTDEFS][number];

export const PARTDEFS: {
  ["engine"]: PartDef<EngineDef>[];
  ["cannon"]: PartDef<CannonDef>[];
  ["vacuum"]: PartDef<VacuumArgs>[];
} = {
  engine: [
    OARS,
    DEFAULT_ENGINE,
    {
      name: "Hot Betty",
      thrust: 143360.0,
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
      shopChance: 0.4,
    },
    {
      name: "Piston Boy",
      maxDamage: 130,
      thrust: 151552.0,
      cost: 1200,
      fuel: {
        type: "diesel",
        cost: 0.05,
      },
      shopRepeat: 2,
      rarity: 1.5,
      weight: 20,
      shopChance: 0.5,
    },
    {
      name: "Oilytron",
      thrust: 172032.0,
      cost: 1440,
      maxDamage: 200,
      fuel: {
        type: "diesel",
        cost: 0.12,
      },
      rarity: 4,
      weight: 26,
      shopChance: 0.3,
    },
    {
      name: "Howitzer",
      maxDamage: 280,
      thrust: 212992.0,
      cost: 2100,
      fuel: {
        type: "diesel",
        cost: 0.15,
      },
      rarity: 7,
      weight: 33,
      shopChance: 0.15,
    },
    {
      name: "V-Star",
      thrust: 327680.0,
      maxDamage: 400,
      cost: 3370,
      fuel: {
        type: "diesel",
        cost: 0.25,
      },
      manned: 10,
      rarity: 12,
      weight: 40,
      shopChance: 0.1,
    },
    {
      name: "Relic Rotator",
      thrust: 245760.0,
      maxDamage: 320,
      cost: 2770,
      fuel: {
        type: "diesel",
        cost: 0.19,
      },
      manned: 10,
      rarity: 8,
      weight: 36,
      shopChance: 0.12,
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
      shootRate: 4,
      shopRepeat: 3,
      rarity: 2,
      spread: Math.PI / 10,
      manned: 10,
      weight: 70,
      shopChance: 0.25,
    },
    {
      name: "WX Hefty Mk-II",
      caliber: 5.5,
      range: 700,
      cost: 820,
      maxDamage: 170,
      shootRate: 2.5,
      rarity: 2.5,
      spread: Math.PI / 11,
      manned: 10,
      weight: 72,
      shopRepeat: 2,
      shopChance: 0.2,
    },
    {
      name: "Juggernaut",
      caliber: 7.5,
      range: 550,
      cost: 2100,
      maxDamage: 400,
      shootRate: 5.5,
      rarity: 7,
      spread: Math.PI / 9,
      manned: 18,
      weight: 120,
      shopChance: 0.08,
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
      shopChance: 0.25,
    },
    {
      name: "Chain Cannon",
      caliber: 4,
      range: 600,
      cost: 2300,
      maxDamage: 160,
      shootRate: 0.3,
      rarity: 6,
      spread: Math.PI / 8,
      manned: 18,
      weight: 120,
      shopChance: 0.06,
    },
    {
      name: "Déluge",
      caliber: 4,
      range: 800,
      cost: 4000,
      maxDamage: 300,
      shootRate: 0.15,
      rarity: 9,
      spread: Math.PI / 11,
      manned: 12,
      weight: 400,
      shopChance: 0.02,
    },
    {
      name: "Viper-I",
      caliber: 6.2,
      range: 600,
      cost: 1100,
      maxDamage: 90,
      shootRate: 3,
      rarity: 5,
      spread: Math.PI / 11,
      manned: 12,
      weight: 70,
      shopChance: 0.3,
      shopRepeat: 2,
    },
    {
      name: "Viper-II",
      caliber: 6.2,
      range: 800,
      cost: 1320,
      maxDamage: 100,
      shootRate: 2.6,
      rarity: 5.5,
      spread: Math.PI / 11,
      manned: 12,
      weight: 70,
      shopChance: 0.3,
    },
    {
      name: "Viper-III",
      caliber: 6.2,
      range: 900,
      cost: 1600,
      maxDamage: 105,
      shootRate: 2.4,
      rarity: 6.2,
      spread: Math.PI / 11,
      manned: 13,
      weight: 80,
      shopChance: 0.2,
    },
    {
      name: "Titanium Ted",
      caliber: 4,
      range: 2000,
      cost: 1400,
      maxDamage: 120,
      shootRate: 3,
      rarity: 3,
      spread: Math.PI / 24,
      manned: 13,
      weight: 80,
      shopChance: 0.2,
      shopRepeat: 2,
    },
    {
      name: "Longshot",
      caliber: 5.5,
      range: 1800,
      cost: 1800,
      maxDamage: 160,
      shootRate: 4.5,
      rarity: 4.5,
      spread: Math.PI / 22,
      manned: 15,
      weight: 110,
      shopChance: 0.1,
    },
    {
      name: "Seraphim's Shot",
      caliber: 6.2,
      range: 1700,
      cost: 2100,
      maxDamage: 180,
      shootRate: 3,
      rarity: 8,
      spread: Math.PI / 20,
      manned: 18,
      weight: 150,
      shopChance: 0.06,
    },
  ],
  vacuum: [
    DEFAULT_VACUUM,
    {
      name: "Courier",
      cost: 200,
      suckRadius: 130,
      suckStrength: 50000000,
      weight: 110,
      shopChance: 0.2,
      shopRepeat: 2,
      rarity: 2,
      maxDamage: 15,
      vulnerability: 0.0012,
    },
    {
      name: "Whirlpool",
      cost: 320,
      suckRadius: 200,
      suckStrength: 80000000,
      weight: 90,
      shopChance: 0.2,
      rarity: 4.5,
      maxDamage: 20,
      vulnerability: 0.0014,
    },
  ],
};
