import type { Optional } from "utility-types";
import type { ShipItem } from "../inventory";
import {
  FoodItem,
  FuelItem,
  ShipInventory,
  computeResellCost,
} from "../inventory";
import type { Cannonball } from "./cannonball";
import type { Ship } from "./ship";
import Victor from "victor";
import type { Player } from "../player";
import {
  DEFAULT_CANNON,
  DEFAULT_ENGINE,
  DEFAULT_VACUUM,
  OARS,
} from "../shop/partdefs";
import { arrayCounter, moneyString, stripWeights } from "../util";
import match from "rustmatchjs";
import random from "random";
import { CREWDEFS } from "../shop/crewdefs";
import { FOODDEFS } from "../shop/fooddefs";
import { isPickup } from "./pickup";
import type { Pickup } from "./pickup";
import type { PlayState } from "../superstates/play";
import randomParts from "../shop/randomparts";
import { DEFAULT_MAKE } from "../shop/makedefs";
import type { ProjectileModifier } from "../combat/projectile";
import { addModifiersToAmmo, ALL_MODIFIERS } from "../combat/projectile";
import {
  translateCrewName,
  translateEngineFuelType,
  translateItemType,
  translatePartName,
} from "../internationalization";
import i18next from "i18next";

export function slots(make: ShipMake): Map<string, number> {
  return arrayCounter(make.slots.map((s) => s.type));
}

export interface ShipPartArgs {
  type: string;
  name: string;
  cost?: number;
  damage?: number;
  manned?: boolean | number;
  maxDamage: number;
  vulnerability?: number;
  repairCostScale?: number;
  dropChance?: number;
  shopChance?: number;
  weight: number;
}

export class ShipPart implements ShipItem {
  type: string;
  name: string;
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
    this.cost = args.cost ?? 0;
    this.name = args.name;
    this.damage = args.damage ?? 0;
    this.maxDamage = args.maxDamage;
    this.manned = args.manned ?? false;
    this.weight = args.weight;
    this.vulnerability = args.vulnerability ?? 0.01;
    this.repairCostScale = args.repairCostScale ?? 1.4;
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
              : ` (min. crew strength ${this.manned.toString()})`),
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
    if (this.damage === 0) return;

    const cost = this.repairCost();

    if (owner.money < cost) {
      const maxFix =
        (owner.money * this.maxDamage) / this.repairCostScale / this.cost;

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
    return `${translateItemType(this.type)} ${translatePartName(this)}`;
  }

  public strictBetterThan(other: this): boolean {
    return (
      this.rateSelf() > other.rateSelf() ||
      ((this.name === other.name || this.equivalentTo(other)) &&
        this.damage < other.damage)
    );
  }

  public betterThan(other: this): boolean {
    return this.rateSelf() > other.rateSelf();
  }

  public equivalentTo(other: this): boolean {
    return this.rateSelf() === other.rateSelf();
  }

  public rateSelf(): number {
    return 0;
  }

  public canAutoInstall(_makeup: ShipMakeup): boolean {
    return true;
  }

  protected partAutoResell(this: ShipPart, makeup: ShipMakeup): boolean {
    const installed = makeup.parts.filter((p) => p instanceof this.constructor);

    return (
      makeup.make.slots.filter((slot) => slot.type === this.type).length <=
        installed.length &&
      installed.filter(
        (p) => p instanceof this.constructor && this.betterThan(p),
      ).length === 0
    );
  }

  public autoResell(makeup: ShipMakeup): boolean {
    // cannot autoresell installed parts
    if (makeup.parts.indexOf(this) !== -1) return false;

    return this.partAutoResell(makeup);
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
  hunger = 0;
  manningPart: ShipPart | null = null;
  salaryWithhold = 0;
  strength: number;
  caloricIntake: number;
  cost: number;
  weight: number;
  type = "crew" as const;
  dying = false;
  name: string;
  integerAmounts: boolean;
  dropChance = 0;
  shopChance: number;

  nameInDeck(makeup: ShipMakeup) {
    const which =
      makeup.crew.filter((c) => c.name === this.name).indexOf(this) + 1;

    return (
      translateCrewName(this) + (which === 1 ? "" : " " + which.toString())
    );
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
      i18next.t(
        makeup == null
          ? "shopinfo.crew.salary"
          : "shopinfo.crew.salaryTomorrow",
        { salary: moneyString(this.nextSalary()) },
      ),
      i18next.t("shopinfo.crew.foodIntake", {
        foodIntake: this.caloricIntake.toFixed(0),
      }),
      i18next.t("shopinfo.crew.strength", {
        strength: this.strength.toFixed(0),
      }),
      ...(makeup == null
        ? []
        : [
            this.manningPart != null
              ? i18next.t("shopinfo.crew.manning", {
                  manningType: this.manningPart.getItemLabel(),
                })
              : makeup.captain === this
                ? i18next.t("shopinfo.crew.captain")
                : i18next.t("shopinfo.crew.idle"),
          ]),
    ];
  }

  autoResell(): boolean {
    return false;
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
    const reasons: string[] = [];
    if (this.isHungry()) reasons.push("hunger");
    if (this.isUnderpaid()) reasons.push("wage");
    return reasons.join(" and ");
  }

  isOccupied(): boolean {
    return this.manningPart != null;
  }

  getInventoryLabel(makeup: ShipMakeup): string {
    let res = this.nameInDeck(makeup);
    if (!this.isHappy())
      res +=
        " " +
        i18next.t("strike", {
          reason: i18next.t("strike.reason." + this.strikeReason()),
        });
    return res;
  }

  public getItemLabel(): string {
    return `${translateItemType("crewmate")} ${translateCrewName(this)}`;
  }

  assignToPart(makeup: ShipMakeup, part: ShipPart): boolean {
    if (!this.isHappy()) return false;
    if (makeup.captain === this) return false;
    if (this.manningPart != null) return false;
    if (part.alreadyManned()) return false;

    this.manningPart = part;
    part.mannedBy.push(this);
    return true;
  }

  setAsCaptain(makeup: ShipMakeup): boolean {
    if (this.manningPart != null) return false;
    if (makeup.captain != null) return false;

    makeup.captain = this;
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
    if (this.manningPart != null && this.manningPart.dying) {
      this.manningPart = null;
    }
  }

  static random(crewRandomArgs?: CrewRandomArgs): Crew | null {
    const args = { minStrength: null, maxStrength: null, ...crewRandomArgs };

    const applicable = CREWDEFS.filter(
      (c) =>
        (args.minStrength == null || (c.strength ?? 10) >= args.minStrength) &&
        (args.maxStrength == null || (c.strength ?? 10) <= args.maxStrength),
    );

    if (applicable.length === 0) return null;

    const crew = random.choice(applicable);
    if (crew == null) return null;
    return new Crew(crew);
  }
}

export const CANNONBALL_DENSITY = 0.3;

export class CannonballAmmo implements ShipItem {
  type = "ammo";
  name: string;
  cost: number;
  caliber: number;
  amount: number;
  dying: boolean;
  integerAmounts: boolean;
  weight: number;
  shopChance = 0.4;
  modifiers: Set<ProjectileModifier>;

  constructor(
    caliber: number,
    amount = 15,
    modifiers = new Set<ProjectileModifier>(),
  ) {
    this.caliber = caliber;
    this.amount = amount;
    this.type = "ammo";
    this.weight = (this.sphericalVolume() * CANNONBALL_DENSITY) / 50;
    this.cost = this.estimateCost();
    this.name = `${(this.caliber * 10).toFixed(0)}mm cannonball ammo`;
    this.dying = false;
    this.integerAmounts = true;
    this.modifiers = modifiers;
  }

  canConsolidate(other: CannonballAmmo): boolean {
    return (
      other.caliber === this.caliber &&
      this.modifiers.size === other.modifiers.size &&
      [...this.modifiers].every((o) => other.modifiers.has(o))
    );
  }

  sphericalVolume() {
    return (4 / 3) * Math.PI * Math.pow(this.caliber, 3);
  }

  estimateCost() {
    return 0.0004 * this.sphericalVolume() * this.amount;
  }

  getItemLabel() {
    return i18next.t(
      this.amount === 1 ? "cannonball" : ["cannonball.plural", "cannonball"],
      { caliber: (this.caliber * 10).toFixed(0) + "mm" },
    );
  }

  shopInfo(): string[] {
    return Array.from(this.modifiers).map((mod) =>
      i18next.t("shopinfo.projectileModifier", {
        modifierName: i18next.t("projectile.modifier." + mod.name),
      }),
    );
  }

  public autoResell(makeup: ShipMakeup): boolean {
    return (
      makeup.parts
        .filter((p) => p instanceof Cannon)
        .filter((c) => c.caliber === this.caliber).length === 0
    );
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

const DPS_CALIBER_EXPONENT = 3;
const DPS_CALIBER_EXPONENT_INVERSE = 1 / DPS_CALIBER_EXPONENT;

export class Cannon extends ShipPart {
  caliber: number;
  cooldown: number;
  range: number;
  shootRate: number;
  spread: number;
  public locked = false;

  public override _available(makeup: ShipMakeup): boolean {
    return makeup.hasAmmo(this.caliber) && this.cooldown === 0 && !this.locked;
  }

  override shopInfo(): string[] {
    return [
      i18next.t("shopinfo.cannon.caliber", {
        caliber: (this.caliber * 10).toFixed(0) + "mm",
      }),
      i18next.t("shopinfo.cannon.shootRate", {
        spm: (60 / this.shootRate).toFixed(2),
      }),
      i18next.t("shopinfo.cannon.range", {
        rangeMeters: (this.range / 10).toFixed(1) + "m",
      }),
      i18next.t("shopinfo.cannon.spread", {
        spread: ((this.spread * 360) / Math.PI).toFixed(1) + "°",
      }),
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

  override endLevelUpdate(_player: Player): void {
    this.cooldown = 0;

    // always unlock cannons at end of day
    this.locked = false;
  }

  cannonballSphericalVolume() {
    return (4 / 3) * Math.PI * Math.pow(this.caliber / 2, 3);
  }

  private shootCannonball(
    ship: Ship,
    dist: number,
    ammo: CannonballAmmo | null = null,
    spread = this.spread,
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
    cball.phys.vel = new Victor(targSpeed, 0)
      .rotateBy(cball.phys.angle)
      .add(ship.vel);

    cball.predictFall();

    if (ammo != null) cball.modifiers = new Set();

    return cball;
  }

  public airtime(ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(ship, dist, null);
    const airtime = tempCannonball.airtime();
    tempCannonball.destroy();
    return airtime;
  }

  public hitLocation(ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(ship, dist, null, 0);
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
    const ammo = ship.makeup.findAmmo(this.caliber);

    if (ammo == null) return null;

    const cannonball = this.shootCannonball(ship, dist, ammo);
    this.afterShot();

    ammo.amount -= 1;
    if (ammo.amount < 1) ship.makeup.inventory.removeItem(ammo);

    return cannonball;
  }

  static default(): Cannon {
    return new Cannon(DEFAULT_CANNON);
  }

  override tick(deltaTime: number) {
    this.coolDown(deltaTime);
  }

  public override rateSelf(): number {
    return (
      Math.pow(
        Math.pow((4 / 3) * Math.PI * this.caliber, DPS_CALIBER_EXPONENT) /
          this.shootRate,
        DPS_CALIBER_EXPONENT_INVERSE,
      ) + Math.pow((this.range * (Math.PI / 6)) / this.spread, 1 / 4)
    );
  }

  public override canAutoInstall(makeup: ShipMakeup): boolean {
    return makeup.hasAmmo(this.caliber);
  }
}

export interface VacuumArgs
  extends Optional<ShipPartArgsSuper, "vulnerability"> {
  suckRadius: number;
  suckStrength: number;
}

export class Vacuum extends ShipPart implements VacuumArgs {
  suckRadius: number;
  suckStrength: number;

  constructor(args: VacuumArgs) {
    super({
      type: "vacuum",
      ...args,
      vulnerability: args.vulnerability || 0.008,
    });
    this.suckRadius = args.suckRadius;
    this.suckStrength = args.suckStrength;
  }

  override shopInfo(): string[] {
    return [
      i18next.t("shopinfo.vacuum.range", {
        suckRadiusMeters: (this.suckRadius / 10).toFixed(0) + "m",
      }),
      i18next.t("shopinfo.vacuum.strength", {
        strength: (this.suckStrength / 1000).toFixed(2),
      }),
    ];
  }

  findCrates(ship: Ship): Pickup<ShipItem>[] {
    const res: Pickup<ShipItem>[] = [];

    for (const item of (ship.game.state as PlayState).tickables) {
      if (!isPickup(item)) continue;
      const crate = item as Pickup<ShipItem>;

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

  suckCrate(deltaTime: number, ship: Ship, crate: Pickup<ShipItem>) {
    crate.phys.applyForce(
      deltaTime,
      ship.pos
        .clone()
        .subtract(crate.phys.pos)
        .norm()
        .multiplyScalar(this.suckStrength)
        .divideScalar(
          Math.max(
            400,
            ship.pos.distanceSq(crate.phys.pos) -
              ship.lateralCrossSection * ship.size,
          ),
        ),
    );
  }

  suckCrates(deltaTime: number, ship: Ship) {
    for (const crate of this.findCrates(ship))
      this.suckCrate(deltaTime, ship, crate);
  }

  override tick(deltaTime: number, owner: Ship): void {
    this.suckCrates(deltaTime, owner);
  }

  public override rateSelf(): number {
    return this.suckRadius + this.suckStrength;
  }
}

export interface EngineArgs
  extends Optional<ShipPartArgsSuper, "maxDamage" | "vulnerability"> {
  fuel?: {
    type: string;
    cost?: number;
  };
  thrust: number;
}

export const FUEL_PROPS: Record<
  string,
  { cost: number; weight: number } | undefined
> = {
  coal: {
    cost: 3,
    weight: 8,
  },
  diesel: {
    cost: 2,
    weight: 3.5,
  },
};

export const SMOKE_COLORS: Record<string, number[]> = {
  diesel: [50, 60, 50],
  coal: [12, 12, 12],
};

export class Engine extends ShipPart {
  fuelType: string | null;
  fuelCost: number;
  thrust: number;

  public override _available(makeup: ShipMakeup): boolean {
    return this.fuelType == null || makeup.hasFuel(this.fuelType);
  }

  constructor(args: EngineArgs) {
    super({ type: "engine", maxDamage: 6, vulnerability: 0.03, ...args });
    this.thrust = args.thrust;
    this.fuelType = args.fuel?.type || null;
    this.fuelCost = args.fuel?.cost || 0.02;
  }

  getThrust(): number {
    return this.thrust * (1 - (0.5 * this.damage) / this.maxDamage);
  }

  override shopInfo(): string[] {
    return [
      i18next.t(
        this.fuelType == null
          ? "shopinfo.engine.noFuel"
          : "shopinfo.engine.fuelType",
        { fuelType: translateEngineFuelType(this) },
      ),
      ...(this.fuelType == null
        ? []
        : [
            i18next.t("shopinfo.engine.fuelCost", {
              fuelCost: (this.fuelCost * 60).toFixed(2),
            }),
          ]),
      i18next.t("shopinfo.engine.thrust", {
        thrust: (this.thrust / 10000).toFixed(2),
      }),
    ];
  }

  static default(): Engine {
    return new Engine(DEFAULT_ENGINE);
  }

  static oars(): Engine {
    return new Engine(OARS);
  }

  public override rateSelf(): number {
    return (
      this.thrust -
      (this.manned === false ? 0 : +this.manned * 50) -
      (this.fuelType == null ? 0 : this.fuelCost * 120)
    );
  }

  public override canAutoInstall(makeup: ShipMakeup): boolean {
    return this.fuelType == null || makeup.hasFuel(this.fuelType);
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
  slots: PartSlot[];
  maxDamage: number;
  drag: number;
  size: number;
  lateralCrossSection: number;
  repairCostScale: number;
  cost: number;
  weight: number;
}

const DEFAULT_FUEL_FACTOR = 800;

function generateShipName() {
  const namegen = i18next.t("ship.namegen", { returnObjects: true }) as {
    adjectives: string[];
    titles: string[];
    cores: string[];
    suffixes: string[];
  };
  const parts: (string | undefined)[] = [];

  if (Math.random() < 0.5) parts.push(random.choice(namegen.adjectives));
  if (Math.random() < 0.4) parts.push(random.choice(namegen.titles));
  parts.push(random.choice(namegen.cores));
  if (Math.random() < 0.25) parts.push(random.choice(namegen.suffixes));

  return parts.filter((part) => part != null).join(" ");
}

export interface ShipMakeupArgs {
  make?: ShipMake | null;
  hullDamage?: number | null;
  name?: string | null;
}

export class ShipMakeup {
  make: ShipMake;
  parts: ShipPart[];
  hullDamage: number;
  inventory: ShipInventory;
  name: string;
  captain: Crew | null;

  public static defaultMakeup(args: ShipMakeupArgs) {
    return new ShipMakeup(args).defaultLoadout();
  }

  public unassignCaptain() {
    this.captain = null;
  }

  subtractFood(hunger: number): number {
    if (hunger <= 0) return 0;
    for (const food of this.inventory.getItemsOf("food")) {
      if ((food.amount ?? 1) > hunger) {
        food.amount = (food.amount ?? 1) - hunger;
        return 0;
      }
      hunger -= food.amount ?? 1;
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

  get ammo(): CannonballAmmo[] {
    return this.inventory.getItemsOf("ammo");
  }

  get fuel(): FuelItem[] {
    return this.inventory.getItemsOf("fuel");
  }

  get food(): FoodItem[] {
    return this.inventory.getItemsOf("food");
  }

  get crew(): Crew[] {
    return this.inventory.getItemsOf("crew");
  }

  assignCrewTo(part: ShipPart): Crew | null {
    const crew = this.crew;
    if (crew.length === 0) return null;

    const res =
      crew.find((c) => c.assignToPart(this, part) && part.alreadyManned()) ||
      null;

    if (!res) part.unassignCrew();
    return res;
  }

  constructor(args: ShipMakeupArgs) {
    this.parts = [];
    this.make = args.make || DEFAULT_MAKE;
    this.hullDamage = args.hullDamage ?? 0;
    this.inventory = new ShipInventory();
    this.name = args.name ?? generateShipName();
  }

  setMake(make: ShipMake) {
    this.make = make;
  }

  public tryRepairHull(player: Player) {
    if (this.hullDamage === 0) return;

    const cost = this.hullRepairCost();

    if (player.money < cost) {
      this.hullDamage -= player.money / this.make.repairCostScale;
      player.money = 0;
    } else {
      player.money -= cost;
      this.hullDamage = 0;
    }
  }

  addDefaultFuel(part: ShipPart, ammoFactor = 1, fuelFactor = 1) {
    const res = match<string, ShipItem | null>(
      part.type,
      match.val("cannon", () => {
        const ammo = new CannonballAmmo(
          (part as Cannon).caliber,
          20 * ammoFactor,
        );
        addModifiersToAmmo(ammo);
        return ammo;
      }),
      match.val("engine", () => {
        const engine = part as Engine;
        if (engine.fuelType == null) return null;
        const fuelAmount = engine.fuelCost * DEFAULT_FUEL_FACTOR * fuelFactor;

        const props = FUEL_PROPS[engine.fuelType];
        if (props === undefined) {
          console.warn(
            `Fuel properties not found for fuel type '${engine.fuelType}'`,
          );
          return null;
        }

        return new FuelItem({
          name: engine.fuelType,
          cost: props.cost,
          amount: fuelAmount,
          weight: props.weight,
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

  addDefaultFood(crew: Crew, foodFactor = 1) {
    let nutrition = crew.caloricIntake * 2 * foodFactor;
    while (nutrition > 0) {
      const def = random.choice(FOODDEFS);
      if (def == null) break;
      const food = new FoodItem(def);
      nutrition -= food.amount;
      this.inventory.addItem(food);
    }
  }

  addDefaultCrew(part: ShipPart, foodFactor = 1): boolean {
    if (!part.manned) return false;
    let neededStrength = typeof part.manned === "number" ? part.manned : 1;
    while (neededStrength > 0) {
      const crew =
        Crew.random({ maxStrength: neededStrength }) || Crew.random();
      if (crew == null) {
        return false;
      }
      crew.assignToPart(this, part);
      this.addDefaultFood(crew, foodFactor);
      this.inventory.addItem(crew);
      neededStrength -= crew.strength;
    }
    return true;
  }

  addDefaultDependencies(
    part: ShipPart,
    ammoFactor = 1,
    fuelFactor = 1,
    foodFactor = 1,
  ): this {
    this.addDefaultFuel(part, ammoFactor, fuelFactor);
    this.addDefaultCrew(part, foodFactor);
    return this;
  }

  defaultLoadout(): this {
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

    this.ammo.forEach((ammo) => {
      ammo.modifiers = new Set(stripWeights(ALL_MODIFIERS));
    });

    return this;
  }

  giveRandomParts(
    armed = true,
    bonus = 0,
    ammoFactor = 1,
    fuelFactor = 1,
    foodFactor = 1,
  ): this {
    const parts = randomParts(
      Math.max(2.5, 3.5 + random.exponential(1.5)() * (10 + bonus)) *
        random.uniform(0.5, 1)() *
        this.make.slots.length,
      this.make,
    );
    for (const part of parts) {
      if (part instanceof Cannon && !armed) continue;
      this.addPart(part);
      this.inventory.addItem(part);
      this.addDefaultDependencies(part, ammoFactor, fuelFactor, foodFactor);
    }
    return this;
  }

  numSlotsOf(type: string): number {
    return this.make.slots
      .map((s) => +(s.type === type))
      .reduce((a, b) => a + b, 0);
  }

  numPartsOf(type: string): number {
    return this.parts.map((p) => p.type === type).reduce((a, b) => +b + a, 0);
  }

  getPartsOf(type: string): ShipPart[] {
    return this.parts.filter((p) => p.type === type);
  }

  slotsRemaining(type: string): number {
    return this.numSlotsOf(type) - this.numPartsOf(type);
  }

  addPart(part: ShipPart): ShipPart | null {
    if (this.parts.indexOf(part) !== -1) {
      return null;
    }
    if (this.slotsRemaining(part.type) <= 0) {
      return null;
    }
    this.parts.push(part);
    return part;
  }

  removePart(part: ShipPart): boolean {
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

  private pruneSpentAmmo() {
    for (const spent of this.ammo.filter((a) => a.amount === 0)) {
      spent.dying = true;
    }
  }

  pruneDestroyedParts() {
    this.parts = this.parts.filter((p) => !p.dying);
  }

  spendFuel(fuelType: string, amount: number): boolean {
    for (const fuel of this.fuel) {
      if (fuel.name !== fuelType) {
        continue;
      }

      if (fuel.amount >= amount) {
        fuel.amount = fuel.amount - amount;
        break;
      }

      amount -= fuel.amount;
      fuel.amount = 0;
    }

    this.pruneSpentFuel();

    return amount <= 0;
  }

  findAmmo(caliber: number): CannonballAmmo | null {
    const compatible = this.ammo
      .filter((a) => a.caliber === caliber)
      .sort((a, b) => b.modifiers.size - a.modifiers.size);

    return compatible[0] ?? null;
  }

  spendAmmo(caliber: number): boolean {
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

  hasAmmo(caliber: number): boolean {
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

  public killCrew(who: Crew) {
    if (this.crew.indexOf(who) === -1) return;

    who.dying = true;
    this.inventory.removeItem(who);

    if (who.manningPart != null && this.parts.indexOf(who.manningPart) !== -1) {
      who.manningPart.unassignCrew();
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

  hullResellCost() {
    return (
      this.make.cost *
      (1 -
        Math.min(
          0.9,
          (this.hullDamage * this.make.repairCostScale) / this.make.maxDamage,
        ))
    );
  }

  totalFood() {
    return this.inventory
      .getItemsOf("food")
      .map((i: FoodItem) => i.amount)
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

  getReadyEngines(): Engine[] {
    return (this.getPartsOf("engine") as Engine[]).filter((p: Engine) =>
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

  public maxAcceleration(): number {
    return (
      this.maxEngineThrust() /
      this.totalWeight() /
      this.drag /
      this.make.size /
      (1 + (this.make.lateralCrossSection - 1) / 2)
    );
  }

  get drag() {
    return this.make.drag;
  }

  public shouldFlee(): boolean {
    return this.hullDamage > 0.7 * this.make.maxDamage;
  }

  get nextReadyCannon(): Cannon | null {
    if (this.getPartsOf("cannon").length === 0) return null;

    // return the best cannon currently available
    const readyCannon = this.readyCannon;
    if (readyCannon) return readyCannon;

    // just return the cannon that's closest to ready to fire again
    const cannons = (this.getPartsOf("cannon") as Cannon[])
      .filter((c) => c.alreadyManned())
      .sort((a, b) => a.cooldown - b.cooldown);
    return cannons[0] || null;
  }

  get readyCannon(): Cannon | null {
    // return the biggest caliber cannon currently available
    const cannons = (this.getPartsOf("cannon") as Cannon[])
      .filter((c) => c.available(this))
      .sort((a, b) => b.caliber - a.caliber);
    return cannons[0] || null;
  }

  get shootRate() {
    if (this.nextReadyCannon == null) return 0;
    return this.nextReadyCannon.shootRate;
  }

  get maxShootRange() {
    if (this.nextReadyCannon == null) {
      return null;
    }
    return this.nextReadyCannon.range;
  }

  public hullWeight() {
    const volumeDm3 = (Math.PI * Math.pow(this.make.size, 3) * 4) / 3;
    const waterWeight = volumeDm3 * 0.997;
    return waterWeight * this.make.weight;
  }

  public totalWeight() {
    return (
      this.hullWeight() +
      this.inventory.items
        .map((item) => item.weight * (item.amount ?? 1))
        .reduce((a, b) => a + b, 0)
    );
  }

  tick(deltaTime: number, owner: Ship) {
    this.parts.forEach((p) => {
      p.tick(deltaTime, owner);
    });
  }

  endLevelUpdate(player: Player) {
    this.inventory.endLevelUpdate(player);
  }
}
