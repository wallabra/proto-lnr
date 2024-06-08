import { Optional } from "utility-types";
import {
  FoodItem,
  FuelItem,
  ShipInventory,
  ShipItem,
  computeResellCost,
} from "../inventory";
import { Cannonball } from "./cannonball";
import { Ship } from "./ship";
import Vec2 from "victor";
import { Player } from "../player";
import {
  DEFAULT_CANNON,
  DEFAULT_ENGINE,
  DEFAULT_VACUUM,
  OARS,
} from "../shop/partdefs";
import arrayCounter from "array-counter";
import match from "rustmatchjs";
import random from "random";
import { CREWDEFS } from "../shop/crewdefs";
import { FOODDEFS } from "../shop/fooddefs";
import type { Pickup } from "./pickup";
import type { PlayState } from "../superstates/play";

export interface ShipPartArgs {
  type: string;
  name?: string;
  cost?: number;
  damage?: number;
  manned?: boolean | number;
  maxDamage?: number;
  vulnerability?: number;
  repairCostScale?: number;
  dropChance?: number;
  shopChance?: number;
  weight: number;
}

export function slots(make: ShipMake): { [type: string]: number } {
  return arrayCounter(make.slots.map((s) => s.type));
}

export class ShipPart implements ShipItem {
  type: string;
  name: string | null;
  cost: number;
  damage: number;
  manned: boolean | number;
  maxDamage: number;
  vulnerability: number;
  dying: boolean;
  repairCostScale: number;
  integerAmounts: boolean;
  weight: number;
  mannedBy: Crew[];
  dropChance: number;
  shopChance: number;

  constructor(args: ShipPartArgs) {
    this.type = args.type;
    this.cost = args.cost || 0;
    this.name = args.name || null;
    this.damage = args.damage || 0;
    this.maxDamage = args.maxDamage;
    this.manned = args.manned || false;
    this.weight = args.weight;
    this.vulnerability = args.vulnerability;
    this.repairCostScale = args.repairCostScale || 1.4;
    this.dropChance = args.dropChance ?? 0.4;
    this.shopChance = args.shopChance ?? 0.5;
    this.dying = false;
    this.integerAmounts = true;
    this.mannedBy = [];
  }

  onRemove(): void {
    this.unassignCrew();
  }

  unassignCrew(): void {
    const allCrew = Array.from(this.mannedBy);
    for (const crew of allCrew) {
      crew.unassign();
    }
  }

  endLevelUpdate(_player: Player) {}

  protected _available(_makeup: ShipMakeup): boolean {
    return true;
  }

  alreadyManned() {
    return (
      !this.manned ||
      (this.mannedBy.length > 0 &&
        (typeof this.manned !== "number" ||
          this.mannedBy
            .filter((c) => c.isHappy())
            .reduce((a, b) => a + b.strength, 0) >= this.manned))
    );
  }

  available(makeup: ShipMakeup): boolean {
    return this.alreadyManned() && this._available(makeup);
  }

  shopInfo(makeup?: ShipMakeup): string[] {
    return makeup != null && this.manned && !this.alreadyManned()
      ? [
          "Needs to be manned" +
            (typeof this.manned !== "number"
              ? ""
              : ` (min. crew strength ${this.manned})`),
        ]
      : [];
  }

  repairCost() {
    return (this.damage * this.cost * this.repairCostScale) / this.maxDamage;
  }

  damagePart(damage: number) {
    this.damage += damage;
    if (this.damage > this.maxDamage) {
      this.dying = true;
    }
  }

  tryRepair(owner: Player) {
    const cost = this.repairCost();
    const maxFix =
      (owner.money * this.maxDamage) / this.repairCostScale / this.cost;

    if (owner.money < cost) {
      this.damage -= maxFix;
      owner.money = 0;
    } else {
      owner.money -= cost;
      this.damage = 0;
    }
  }

  applyToShip(shipMakeup: ShipMakeup) {
    shipMakeup.addPart(this);
  }

  tick(_deltaTime: number, _owner: Ship) {}

  getInventoryLabel(_makeup: ShipMakeup): string {
    return this.getItemLabel();
  }

  getItemLabel(): string {
    return `${this.type} ${this.name}`;
  }
}

export type ShipPartArgsSuper = Omit<ShipPartArgs, "type">;

export interface CrewArgs {
  name: string;
  salary: number;
  strength?: number;
  caloricIntake?: number;
  weight?: number;
  shopChance?: number;
}

export interface CrewRandomArgs {
  minStrength?: number;
  maxStrength?: number;
}

export class Crew implements ShipItem {
  salary: number;
  hunger: number = 0;
  manningPart: ShipPart | null = null;
  salaryWithhold: number = 0;
  strength: number;
  caloricIntake: number;
  cost: number;
  weight: number;
  type = "crew" as const;
  dying: boolean = false;
  name: string;
  integerAmounts: boolean;
  dropChance: number = 0;
  shopChance: number;

  nameInDeck(makeup: ShipMakeup) {
    const which =
      makeup.crew.filter((c) => c.name === this.name).indexOf(this) + 1;

    return this.name + (which === 1 ? "" : " " + which);
  }

  maxSalaryWithhold(): number {
    return 3;
  }

  constructor(args: CrewArgs) {
    this.name = args.name;
    this.salary = args.salary;
    this.strength = args.strength || 10;
    this.cost = this.salary * 7;
    this.caloricIntake = args.caloricIntake || 5;
    this.integerAmounts = true;
    this.weight = args.weight || 20;
    this.shopChance = args.shopChance ?? 0.4;
  }

  onRemove() {
    this.unassign();
  }

  private payWages(player: Player) {
    const amount = this.nextSalary();
    if (player.money < amount) {
      this.salaryWithhold++;
    } else {
      player.money -= amount;
      this.salaryWithhold = 0;
    }
  }

  private consumeFood(makeup: ShipMakeup) {
    this.hunger += this.caloricIntake;
    this.hunger = makeup.subtractFood(this.hunger);
  }

  nextSalary(): number {
    return this.salary * (1 + this.salaryWithhold);
  }

  endLevelUpdate(player: Player) {
    this.payWages(player);
    this.consumeFood(player.makeup);
  }

  shopInfo(makeup?: ShipMakeup): string[] {
    return [
      (makeup == null ? "daily salary: " : "next day's salary: ") +
        this.nextSalary(),
      "daily food intake: " + this.caloricIntake,
      "manning strength: " + this.strength,
      ...(makeup == null
        ? []
        : [
            this.manningPart == null
              ? "idle"
              : "manning a " + this.manningPart.getItemLabel(),
          ]),
    ];
  }

  isHungry(): boolean {
    return this.hunger >= this.caloricIntake * 3;
  }

  isUnderpaid(): boolean {
    return this.salaryWithhold > this.maxSalaryWithhold();
  }

  isHappy(): boolean {
    return !this.isHungry() && !this.isUnderpaid();
  }

  strikeReason(): string {
    const reasons = [];
    if (this.isHungry()) reasons.push("hunger");
    if (this.isUnderpaid()) reasons.push("wage withholding");
    return reasons.join(" and ");
  }

  isOccupied(): boolean {
    return this.manningPart != null;
  }

  getInventoryLabel(makeup: ShipMakeup): string {
    let res = this.nameInDeck(makeup);
    if (!this.isHappy()) res += ` (on strike for ${this.strikeReason()})`;
    return res;
  }

  getItemLabel(): string {
    return `crewmate ${this.name}`;
  }

  assignToPart(part: ShipPart): boolean {
    if (!this.isHappy()) return false;
    if (this.manningPart != null) return false;
    if (part.alreadyManned()) return false;

    this.manningPart = part;
    part.mannedBy.push(this);
    return true;
  }

  unassign(): boolean {
    if (this.manningPart == null) return false;

    const idx = this.manningPart.mannedBy.indexOf(this);

    if (idx === -1) return false;

    this.manningPart.mannedBy.splice(idx, 1);
    this.manningPart = null;
    return true;
  }

  tick(_deltaTime: number): void {
    if (this.manningPart.dying) {
      this.manningPart = null;
    }
  }

  static random(crewRandomArgs?: CrewRandomArgs): Crew | null {
    const args = { minStrength: null, maxStrength: null, ...crewRandomArgs };

    const applicable = CREWDEFS.filter(
      (c) =>
        (args.minStrength == null || c.strength >= args.minStrength) &&
        (args.maxStrength == null || c.strength <= args.maxStrength),
    );

    if (applicable.length === 0) return null;

    return new Crew(random.choice(applicable));
  }
}

export const CANNONBALL_DENSITY = 0.065;

export class CannonballAmmo implements ShipItem {
  type = "ammo";
  name: string;
  cost: number;
  caliber: number;
  amount: number;
  dying: boolean;
  integerAmounts: boolean;
  weight: number;
  shopChance: number = 0.4;

  constructor(caliber, amount = 15) {
    this.caliber = caliber;
    this.amount = amount;
    this.type = "ammo";
    this.weight = this.sphericalVolume() * CANNONBALL_DENSITY;
    this.cost = this.estimateCost();
    this.name = `${this.caliber}cm cannonball ammo`;
    this.dying = false;
    this.integerAmounts = true;
  }

  canConsolidate(other: CannonballAmmo): boolean {
    return other.caliber === this.caliber;
  }

  sphericalVolume() {
    return (4 / 3) * Math.PI * Math.pow(this.caliber / 2, 3);
  }

  estimateCost() {
    return 0.004 * this.sphericalVolume() * this.amount;
  }

  getItemLabel() {
    return `${Math.round(this.caliber * 10)}mm cannonball${this.amount > 1 ? "s" : ""}`;
  }

  specialImpact(_cannonball: Cannonball, _victimShip: Ship) {}
}

export interface CannonArgs
  extends Optional<ShipPartArgsSuper, "maxDamage" | "vulnerability"> {
  caliber: number;
  range?: number;
  shootRate: number;
  spread?: number;
}

export class Cannon extends ShipPart {
  caliber: number;
  cooldown: number;
  range: number;
  shootRate: number;
  spread: number;

  protected _available(makeup: ShipMakeup): boolean {
    return makeup.hasAmmo(this.caliber) && this.cooldown === 0;
  }

  shopInfo(): string[] {
    return [
      "caliber: " + Math.round(this.caliber * 10) + "mm",
      "max SPM:" + 60 / this.shootRate,
      "max range: " + this.range,
      "spread (°): " + Math.ceil((this.spread * 360) / Math.PI),
    ];
  }

  constructor(args: CannonArgs) {
    super({ type: "cannon", maxDamage: 8, vulnerability: 0.02, ...args });
    this.caliber = args.caliber;
    this.range = args.range || 600;
    this.shootRate = args.shootRate;
    this.cooldown = 0;
    this.spread = args.spread || 0;
  }

  endLevelUpdate(_player: Player): void {
    this.cooldown = 0;
  }

  cannonballSphericalVolume() {
    return (4 / 3) * Math.PI * Math.pow(this.caliber / 2, 3);
  }

  private shootCannonball(
    ship: Ship,
    dist: number,
    spread: number = this.spread,
  ) {
    dist = Math.min(dist, this.range);

    const cball = ship.play.spawnCannonball(ship, {
      size: this.caliber,
      weight: this.cannonballSphericalVolume() * CANNONBALL_DENSITY,
    });
    cball.phys.vspeed = dist / 350;
    const distrib = random.uniform(-spread, spread);
    cball.phys.angle += (distrib() + distrib()) / 2;
    const airtime = cball.airtime();

    const velComp = ship.angNorm.dot(ship.vel);

    const targSpeed = Math.min(
      (dist - velComp + cball.phys.airDrag() * Math.pow(airtime, 2)) / airtime,
      this.range,
    );
    cball.phys.vel = new Vec2(targSpeed, 0)
      .rotateBy(cball.phys.angle)
      .add(ship.vel);

    cball.predictFall();
    return cball;
  }

  public airtime(ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(ship, dist);
    const airtime = tempCannonball.airtime();
    tempCannonball.destroy();
    return airtime;
  }

  public hitLocation(ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(ship, dist, 0);
    const location = tempCannonball.computePredictedFall();
    tempCannonball.destroy();
    return location;
  }

  private coolDown(deltaTime: number) {
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
  }

  private afterShot() {
    this.cooldown = this.shootRate;
  }

  shoot(ship: Ship, dist: number): Cannonball | null {
    // TODO: spawn cannonball
    if (!ship.makeup.spendAmmo(this.caliber)) {
      return null;
    }

    const cannonball = this.shootCannonball(ship, dist);
    this.afterShot();
    return cannonball;
  }

  static default(): Cannon {
    return new Cannon(DEFAULT_CANNON);
  }

  tick(deltaTime: number) {
    this.coolDown(deltaTime);
  }
}

export interface VacuumArgs
  extends Optional<ShipPartArgsSuper, "maxDamage" | "vulnerability"> {
  suckRadius: number;
  suckStrength: number;
}

export class Vacuum extends ShipPart implements VacuumArgs {
  suckRadius: number;
  suckStrength: number;

  constructor(args: VacuumArgs) {
    super({ type: "vacuum", ...args });
    this.suckRadius = args.suckRadius;
    this.suckStrength = args.suckStrength;
  }

  shopInfo(): string[] {
    return [
      "suck radius: " + this.suckRadius,
      "suck strength: " + this.suckStrength,
    ];
  }

  findCrates(ship: Ship): Pickup[] {
    const res = [];

    for (const item of (ship.game.state as PlayState).tickables) {
      if ((item as Pickup).bob == null) continue;
      const crate = item as Pickup;

      const dist = crate.phys.pos.distance(ship.pos);
      if (dist > ship.size * ship.lateralCrossSection + this.suckRadius)
        continue;

      res.push(item);
    }

    return res;
  }

  static default() {
    return new Vacuum(DEFAULT_VACUUM);
  }

  suckCrate(deltaTime: number, ship: Ship, crate: Pickup) {
    crate.phys.applyForce(
      deltaTime,
      ship.pos
        .clone()
        .subtract(crate.phys.pos)
        .norm()
        .multiplyScalar(this.suckStrength)
        .divideScalar(
          Math.max(
            0,
            ship.pos.distanceSq(crate.phys.pos) -
              ship.lateralCrossSection * ship.size,
          ) + 1,
        ),
    );
  }

  suckCrates(deltaTime: number, ship: Ship) {
    for (const crate of this.findCrates(ship))
      this.suckCrate(deltaTime, ship, crate);
  }

  tick(deltaTime: number, owner: Ship): void {
    this.suckCrates(deltaTime, owner);
  }
}

export interface EngineArgs
  extends Optional<ShipPartArgsSuper, "maxDamage" | "vulnerability"> {
  fuel?: {
    type: string;
    cost: number;
  };
  thrust: number;
}

export const FUEL_PROPS = {
  coal: {
    cost: 3,
    weight: 8,
  },
  diesel: {
    cost: 2,
    weight: 3.5,
  },
};

export const SMOKE_COLORS: { [fuelType: string]: number[] } = {
  diesel: [50, 60, 50],
  coal: [12, 12, 12],
};

export class Engine extends ShipPart {
  fuelType: string;
  fuelCost: number;
  thrust: number;

  protected _available(makeup: ShipMakeup): boolean {
    return this.fuelType == null || makeup.hasFuel(this.fuelType);
  }

  constructor(args: EngineArgs) {
    super({ type: "engine", maxDamage: 6, vulnerability: 0.03, ...args });
    this.thrust = args.thrust;
    this.fuelType = (args.fuel && args.fuel.type) || null;
    this.fuelCost = (args.fuel && args.fuel.cost) || 0.02;
  }

  getThrust(): number {
    return this.thrust * (1 - (0.5 * this.damage) / this.maxDamage);
  }

  shopInfo(): string[] {
    return [
      this.fuelType == null ? "no fuel" : "fuel type: " + this.fuelType,
      "fuel cost /min: " + Math.round(this.fuelCost * 600) / 10,
      "thrust: " + Math.round(this.thrust / 10) / 100 + "kN",
    ];
  }

  static default(): Engine {
    return new Engine(DEFAULT_ENGINE);
  }

  static oars(): Engine {
    return new Engine(OARS);
  }
}

/*export class Oars extends ShipPart {
  constructor(name, cost, maxDamage = 0.2, vulnerability = 0.008, fuelType, damage = 0) {
    super("engine", name, cost, maxDamage, vulnerability, damage, true);
  }
}*/

export interface PartSlot {
  type: string;
}

export interface ShipMake {
  name: string;
  slots: Array<PartSlot>;
  maxDamage: number;
  drag: number;
  size: number;
  lateralCrossSection: number;
  repairCostScale: number;
  cost: number;
  weight: number;
}

const DEFAULT_FUEL_FACTOR = 800;

const shipNameAdjectives = [
  "Venerable",
  "Ancient",
  "Perennial",
  "Indubitable",
  "Infallible",
  "Invictous",
  "Indestructible",
  "Beautiful",
  "Excellent",
  "Brilliant",
  "Shining",
  "Gleaming",
  "Powerful",
  "Forward",
  "Sweet",
  "Royal",
  "Perfect",
  "Immaculate",
  "Proud",
  "Pink",
  "Long",
];
const shipNameTitles = [
  "Monarch",
  "Senator",
  "Ruler",
  "Divine",
  "Leader",
  "Excellence",
  "Doctor",
  "Golden",
];
const shipNameCores = [
  "Mary",
  "James",
  "Marius",
  "Philius",
  "Edgar",
  "Ruth",
  "Vicky",
  "Lennard",
  "Sarutobian",
  "Julian",
  "Asparginensis",
  "Grum",
  "William",
  "Pyotr",
  "Nestor",
  "Phillipp",
  "Geraldius",
  "Johnson",
  "Becker",
  "Packard",
];
const shipNameSuffixes = [
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "Maximus",
  "the Pure",
  "the Vicious",
  "the Loving",
  "the Only",
  "the Unique",
  "the Last",
  "of the Court",
];

function generateShipName() {
  const parts: string[] = [];

  parts.push(random.choice(shipNameAdjectives));
  if (Math.random() < 0.4) parts.push(random.choice(shipNameTitles));
  parts.push(random.choice(shipNameCores));
  if (Math.random() < 0.25) parts.push(random.choice(shipNameSuffixes));

  return parts.join(" ");
}

export interface ShipMakeupArgs {
  make: ShipMake;
  hullDamage?: number;
  name?: string;
}

export class ShipMakeup {
  make: ShipMake;
  parts: Array<ShipPart>;
  hullDamage: number;
  inventory: ShipInventory;
  name: string;

  subtractFood(hunger: number): number {
    if (hunger <= 0) return 0;
    for (const food of this.inventory.getItemsOf("food")) {
      if (food.amount > hunger) {
        food.amount -= hunger;
        return 0;
      }
      hunger -= food.amount;
      food.amount = 0;
      food.dying = true;
    }
    this.inventory.pruneItems();
    return hunger;
  }

  hullRepairCost(): number {
    return (
      (this.hullDamage * this.make.repairCostScale * this.make.cost) /
      this.make.maxDamage
    );
  }

  get ammo() {
    return <CannonballAmmo[]>this.inventory.getItemsOf("ammo");
  }

  get fuel() {
    return <FuelItem[]>this.inventory.getItemsOf("fuel");
  }

  get food() {
    return <FoodItem[]>this.inventory.getItemsOf("food");
  }

  get crew() {
    return <Crew[]>this.inventory.getItemsOf("crew");
  }

  assignCrewTo(part: ShipPart): Crew | null {
    const crew = this.crew;
    if (crew.length === 0) return null;

    const res =
      crew.find((c) => c.assignToPart(part) && part.alreadyManned()) || null;

    if (!res) part.unassignCrew();
    return res;
  }

  constructor(args: ShipMakeupArgs) {
    this.parts = [];
    this.make = args.make;
    this.hullDamage = args.hullDamage ?? 0;
    this.inventory = new ShipInventory();
    this.name = args.name ?? generateShipName();
  }

  setMake(make: ShipMake) {
    this.make = make;
  }

  addDefaultFuel(part: ShipPart, factor: number = 1) {
    const res = match<string, ShipItem | null>(
      part.type,
      match.val("cannon", () => {
        return new CannonballAmmo((<Cannon>part).caliber, 20 * factor);
      }),
      match.val("engine", () => {
        const engine = <Engine>part;
        if (engine.fuelType == null) return null;
        const fuelAmount = engine.fuelCost * DEFAULT_FUEL_FACTOR * factor;
        return new FuelItem({
          name: engine.fuelType,
          cost: FUEL_PROPS[engine.fuelType].cost,
          amount: fuelAmount,
          weight: FUEL_PROPS[engine.fuelType].weight,
        });
      }),
      match.val("vacuum", () => {
        // TODO: add fuel required by vacuum, if any
        return null;
      }),
      match._(() => {
        throw new Error(
          "Cannot add default item for part of type: " + part.type,
        );
      }),
    );

    if (res != null) this.inventory.addItem(res);
    return res;
  }

  addDefaultFood(crew: Crew) {
    let nutrition = crew.caloricIntake * 2;
    while (nutrition > 0) {
      const food = new FoodItem(random.choice(FOODDEFS));
      nutrition -= food.amount;
      this.inventory.addItem(food);
    }
  }

  addDefaultCrew(part: ShipPart) {
    if (!part.manned) return false;
    let neededStrength = typeof part.manned === "number" ? part.manned : 1;
    while (neededStrength > 0) {
      const crew =
        Crew.random({ maxStrength: neededStrength }) || Crew.random();
      if (crew == null) {
        return false;
      }
      crew.assignToPart(part);
      this.addDefaultFood(crew);
      this.inventory.addItem(crew);
      neededStrength -= crew.strength;
    }
    return true;
  }

  addDefaultDependencies(part, factor: number = 1) {
    this.addDefaultFuel(part, factor);
    this.addDefaultCrew(part);
  }

  defaultLoadout() {
    const engines = [Engine.default(), Engine.default()];
    const cannons = [Cannon.default(), Cannon.default()];
    const vacuums = [Vacuum.default()];

    for (const engine of engines) {
      this.inventory.addItem(this.addPart(engine));
      this.addDefaultDependencies(engine);
    }
    for (const cannon of cannons) {
      this.inventory.addItem(this.addPart(cannon));
      this.addDefaultDependencies(cannon);
    }
    for (const vacuum of vacuums) {
      this.inventory.addItem(this.addPart(vacuum));
      this.addDefaultDependencies(vacuum);
    }

    return this;
  }

  numSlotsOf(type) {
    return this.make.slots
      .map((s) => +(s.type === type))
      .reduce((a, b) => a + b, 0);
  }

  numPartsOf(type) {
    return this.parts.map((p) => p.type === type).reduce((a, b) => +b + a, 0);
  }

  getPartsOf(type) {
    return this.parts.filter((p) => p.type === type);
  }

  slotsRemaining(type) {
    return this.numSlotsOf(type) - this.numPartsOf(type);
  }

  addPart(part: ShipPart) {
    if (this.parts.indexOf(part) !== -1) {
      return null;
    }
    if (this.slotsRemaining(part.type) <= 0) {
      return null;
    }
    this.parts.push(part);
    return part;
  }

  removePart(part: ShipPart) {
    part.onRemove();
    const idx = this.parts.indexOf(part);
    if (idx === -1) return false;
    this.parts.splice(idx, 1);
    return true;
  }

  private pruneSpentFuel() {
    for (const spent of this.fuel.filter((f) => f.amount === 0)) {
      spent.dying = true;
    }
  }

  private pruneSpentFood() {
    for (const spent of this.food.filter((f) => f.amount === 0)) {
      spent.dying = true;
    }
  }

  private pruneSpentAmmo() {
    for (const spent of this.ammo.filter((a) => a.amount === 0)) {
      spent.dying = true;
    }
  }

  pruneDestroyedParts() {
    this.parts = this.parts.filter((p) => !p.dying);
  }

  spendFuel(fuelType: string, amount: number) {
    for (const fuel of this.fuel) {
      if (fuel.name !== fuelType) {
        continue;
      }

      if (fuel.amount >= amount) {
        fuel.amount -= amount;
        break;
      }

      amount -= fuel.amount;
      fuel.amount = 0;
    }

    this.pruneSpentFuel();

    return amount <= 0;
  }

  spendAmmo(caliber: number) {
    let amount = 1;

    for (const ammo of this.ammo) {
      if (ammo.caliber !== caliber) {
        continue;
      }

      ammo.amount--;
      amount = 0;
    }

    this.pruneSpentAmmo();
    return amount <= 0;
  }

  hasAmmo(caliber: number) {
    for (const ammo of this.ammo) {
      if (ammo.caliber === caliber) {
        return true;
      }
    }

    return false;
  }

  private damageParts(amount: number) {
    for (const part of this.parts) {
      const partDamage = Math.random() * amount * part.vulnerability;
      part.damagePart(partDamage);
    }
  }

  damageShip(amount: number) {
    this.hullDamage += amount;
    this.damageParts(amount);
    this.pruneDestroyedParts();
    return this.hullDamage > this.make.maxDamage;
  }

  hasFuel(fuelType: string) {
    return this.fuel.some((f: FuelItem) => f.name === fuelType && f.amount > 0);
  }

  totalFuel(fuelType: string) {
    return this.fuel
      .filter((f: FuelItem) => f.name === fuelType)
      .reduce((a, b) => a + b.amount, 0);
  }

  totalAmmo(caliber: number) {
    return this.ammo
      .filter((a: CannonballAmmo) => a.caliber === caliber)
      .reduce((a, b) => a + b.amount, 0);
  }

  totalSalary() {
    return this.crew.map((c) => c.nextSalary()).reduce((a, b) => a + b, 0);
  }

  partsValue() {
    return this.parts
      .map((i) => computeResellCost(i))
      .reduce((a, b) => a + b, 0);
  }

  inventoryValue() {
    return this.inventory.items
      .filter(
        (i) => this.parts.indexOf(i as ShipPart) === -1 && !(i instanceof Crew),
      )
      .map((i) => computeResellCost(i))
      .reduce((a, b) => a + b, 0);
  }

  totalValue() {
    return this.inventoryValue() + this.partsValue();
  }

  totalFood() {
    return this.inventory
      .getItemsOf("food")
      .map((i) => i.amount)
      .reduce((a, b) => a + b, 0);
  }

  totalFoodIntake() {
    return this.crew
      .map((c) => c.caloricIntake + c.hunger)
      .reduce((a, b) => a + b, 0);
  }

  partRepairCost() {
    return this.parts.map((p) => p.repairCost()).reduce((a, b) => a + b, 0);
  }

  totalRepairCost() {
    return this.hullRepairCost() + this.partRepairCost();
  }

  getReadyEngines(): Array<Engine> {
    return (<Array<Engine>>this.getPartsOf("engine")).filter((p: Engine) =>
      p.available(this),
    );
  }

  maxEngineThrust(enginesList?: Engine[]): number {
    const engines = enginesList ?? this.getReadyEngines();
    if (engines.length === 0) return 0;
    return match(
      engines.filter((e) => e.available(this)),
      match.fn((a) => a.length === 0, 0),
      match._((engines: Engine[]) =>
        engines.map((e) => e.getThrust()).reduce((a, b) => a + b, 0),
      ),
    );
  }

  get drag() {
    return this.make.drag;
  }

  get nextReadyCannon(): Cannon | null {
    if (this.getPartsOf("cannon").length === 0) return null;

    // return the best cannon currently available
    const readyCannon = this.readyCannon;
    if (readyCannon) return readyCannon;

    // just return the cannon that's closest to ready to fire again
    const cannons = (<Array<Cannon>>this.getPartsOf("cannon"))
      .filter((c) => c.alreadyManned())
      .sort((a, b) => a.cooldown - b.cooldown);
    return cannons[0] || null;
  }

  get readyCannon(): Cannon | null {
    // return the biggest caliber cannon currently available
    const cannons = (<Array<Cannon>>this.getPartsOf("cannon"))
      .filter((c) => c.available(this))
      .sort((a, b) => b.caliber - a.caliber);
    return cannons[0] || null;
  }

  get shootRate() {
    return this.nextReadyCannon.shootRate;
  }

  get maxShootRange() {
    if (this.nextReadyCannon == null) {
      return null;
    }
    return this.nextReadyCannon.range;
  }

  totalWeight() {
    return (
      this.make.weight +
      this.inventory.items
        .map((item) => item.weight * (item.amount || 1))
        .reduce((a, b) => a + b, 0)
    );
  }

  tick(deltaTime: number, owner: Ship) {
    this.parts.forEach((p) => p.tick(deltaTime, owner));
  }

  endLevelUpdate(player: Player) {
    this.inventory.endLevelUpdate(player);
  }
}
