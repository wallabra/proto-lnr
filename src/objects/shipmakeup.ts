import { FoodItem, FuelItem, ShipInventory, ShipItem } from "../inventory";
import { Cannonball } from "./cannonball";
import { Ship } from "./ship";
import Vec2 from "victor";

export class ShipPart implements ShipItem {
  type: string;
  name: string;
  cost: number;
  damage: number;
  manned: boolean;
  maxDamage: number;
  vulnerability: number;
  dying: boolean;

  constructor(
    type,
    name,
    cost,
    maxDamage,
    vulnerability = 0,
    damage = 0,
    manned = false,
  ) {
    this.type = type;
    this.cost = cost;
    this.name = name;
    this.damage = damage;
    this.maxDamage = maxDamage;
    this.manned = manned;
    this.vulnerability = vulnerability;
    this.dying = false;
  }

  damagePart(damage: number) {
    this.damage += damage;
    if (this.damage > this.maxDamage) {
      this.dying = true;
    }
  }

  applyToShip(shipMakeup: ShipMakeup) {
    shipMakeup.addPart(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(deltaTime: number) {}

  getItemLabel(): string {
    return `{this.type} {this.name}`;
  }
}

export default class Crew extends ShipPart {
  salary: number;
  hunger: number;

  constructor(name, salary, hunger = 0) {
    super("crew", name, 0, 0.1, 0.02);
    this.salary = salary;
    this.hunger = hunger;
  }

  getItemLabel(): string {
    return `crewmate {this.name}`;
  }
}

export class CannonballAmmo implements ShipItem {
  type = "ammo";
  name: string;
  cost: number;
  caliber: number;
  amount: number;
  dying: boolean;

  constructor(caliber, amount = 15) {
    this.caliber = caliber;
    this.amount = amount;
    this.type = "ammo";
    this.cost = this.estimateCost();
    this.name = `{this.caliber}cm cannonball ammo`;
    this.dying = false;
  }

  estimateCost() {
    return 20 * this.caliber * this.amount;
  }

  getItemLabel() {
    return `{this.caliber}mm cannonball ammo (x{this.amount})`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  specialImpact(cannonball: Cannonball, victimShip: Ship) {}
}

export class Cannon extends ShipPart {
  caliber: number;
  cooldown: number;
  range: number;
  shootRate: number;

  constructor(
    name,
    cost,
    caliber,
    range,
    shootRate,
    maxDamage = 0.6,
    vulnerability = 0.1,
    damage = 0,
  ) {
    super("cannon", name, cost, maxDamage, vulnerability, damage);
    this.caliber = caliber;
    this.range = range;
    this.shootRate = shootRate;
    this.cooldown = 0;
  }

  private shootCannonball(deltaTime: number, ship: Ship, dist: number) {
    const cball = ship.play.spawnCannonball(ship, { size: this.caliber });
    cball.phys.vspeed = dist / 250;
    const airtime = cball.airtime();

    const velComp = ship.angNorm.dot(ship.vel);

    dist =
      dist -
      ship.pos.clone().subtract(ship.cannonballSpawnSpot()).length() -
      velComp * airtime;
    const targSpeed = Math.min(this.range, (dist / airtime) * deltaTime);
    cball.phys.vel = Vec2(targSpeed, 0).rotateBy(ship.angle).add(ship.vel);

    return cball;
  }

  airtime(deltaTime: number, ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(deltaTime, ship, dist);
    const airtime = tempCannonball.airtime;
    tempCannonball.destroy();
    return airtime;
  }

  private coolDown(deltaTime: number) {
    this.cooldown = Math.max(0, this.cooldown - deltaTime);
  }

  private afterShot() {
    this.cooldown = this.shootRate;
  }

  shoot(deltaTime: number, ship: Ship, dist: number) {
    // TODO: spawn cannonball
    if (!ship.makeup.spendAmmo(this.caliber)) {
      return false;
    }

    this.shootCannonball(deltaTime, ship, dist);
    this.afterShot();
    return true;
  }

  static default(): Cannon {
    return new Cannon("Shooty", 160, 4, 900, 2);
  }

  tick(deltaTime: number) {
    this.coolDown(deltaTime);
  }
}

export class Engine extends ShipPart {
  fuelType: string;
  fuelCost: number;
  thrust: number;

  constructor(
    name,
    cost,
    thrust,
    fuelType,
    fuelCost = 0.02,
    maxDamage = 0.9,
    vulnerability = 0.3,
    damage = 0,
    manned = false,
  ) {
    super("engine", name, cost, maxDamage, vulnerability, damage, manned);
    this.thrust = thrust;
    this.fuelType = fuelType;
    this.fuelCost = fuelCost;
  }

  static default(): Engine {
    return new Engine("Oary", 80, 0.3, null, 0);
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
}

export const DEFAULT_MAKE: ShipMake = {
  name: "Defaulty",
  slots: [{ type: "Cannon" }, { type: "Cannon" }, { type: "Engine" }],
  maxDamage: 50,
  drag: 0.04,
  size: 20,
};

export class ShipMakeup {
  make: ShipMake;
  parts: Array<ShipPart>;
  hullDamage: number;
  inventory: ShipInventory;

  get ammo() {
    return <CannonballAmmo[]>this.inventory.getItemsOf("ammo");
  }

  get fuel() {
    return <FuelItem[]>this.inventory.getItemsOf("fuel");
  }

  get food() {
    return <FoodItem[]>this.inventory.getItemsOf("food");
  }

  constructor(make, hullDamage = 0) {
    this.parts = [];
    this.make = make;
    this.hullDamage = hullDamage;
    this.inventory = new ShipInventory();
  }

  defaultLoadout() {
    this.inventory.addItem(this.addPart(Cannon.default()));
    this.inventory.addItem(this.addPart(Engine.default()));
    this.inventory.addItem(new CannonballAmmo(4, 60));
    return this;
  }

  numSlotsOf(type) {
    return this.make.slots
      .map((s) => s.type === type)
      .reduce((a, b) => +b + a, 0);
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
    if (this.slotsRemaining(part.type)) {
      return null;
    }
    this.parts.push(part);
    return part;
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

  spendFood(amount: number) {
    for (const food of this.food) {
      if (food.amount >= amount) {
        food.amount -= amount;
        return true;
      }

      amount -= food.amount;
      food.amount = 0;
    }

    this.pruneSpentFood();

    return amount <= 0;
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
      console.log(ammo.caliber, ammo.amount);
    }

    return false;
  }

  damageShip(amount: number) {
    this.hullDamage += amount;
    for (const part of this.parts) {
      const partDamage = Math.random() * amount * part.vulnerability;
      part.damagePart(partDamage);
    }
    return this.hullDamage > this.make.maxDamage;
  }

  hasFuel(fuelType: string | null) {
    if (fuelType == null) return false;

    return this.fuel.some((f: FuelItem) => f.name === fuelType && f.amount > 0);
  }

  getReadyEngines(): Array<Engine> {
    return (<Array<Engine>>this.getPartsOf("engine")).filter((p: Engine) =>
      this.hasFuel(p.fuelType),
    );
  }

  get drag() {
    return this.make.drag;
  }

  get nextReadyCannon(): Cannon | null {
    for (const cannon of <Array<Cannon>>this.getPartsOf("cannon")) {
      if (this.hasAmmo(cannon.caliber) && cannon.cooldown === 0) {
        return cannon;
      }
    }

    return null;
  }

  get shootRate() {
    return this.nextReadyCannon.shootRate;
  }

  get maxShootRange() {
    return this.nextReadyCannon.range;
  }

  tick(deltaTime: number) {
    this.parts.forEach((p) => p.tick(deltaTime));
  }
}
