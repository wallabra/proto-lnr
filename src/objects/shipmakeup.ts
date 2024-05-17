import { Optional } from "utility-types";
import { FoodItem, FuelItem, ShipInventory, ShipItem } from "../inventory";
import { Cannonball } from "./cannonball";
import { Ship } from "./ship";
import Vec2 from "victor";
import { Player } from "../player";

export interface ShipPartArgs {
  type: string;
  name?: string;
  cost?: number;
  damage?: number;
  manned?: boolean;
  maxDamage: number;
  vulnerability: number;
  repairCostScale?: number;
}

export class ShipPart implements ShipItem {
  type: string;
  name: string | null;
  cost: number;
  damage: number;
  manned: boolean;
  maxDamage: number;
  vulnerability: number;
  dying: boolean;
  repairCostScale: number;

  constructor(args: ShipPartArgs) {
    this.type = args.type;
    this.cost = args.cost || 0;
    this.name = args.name || null;
    this.damage = args.damage || 0;
    this.maxDamage = args.maxDamage;
    this.manned = args.manned || false;
    this.vulnerability = args.vulnerability;
    this.repairCostScale = args.repairCostScale || 2;
    this.dying = false;
  }

  repairCost() {
    return this.damage * this.repairCostScale;
  }

  damagePart(damage: number) {
    this.damage += damage;
    if (this.damage > this.maxDamage) {
      this.dying = true;
    }
  }

  tryRepair(owner: Player) {
    const cost = this.repairCost();
    const maxFix = owner.money / this.repairCostScale;

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tick(deltaTime: number) {}

  getItemLabel(): string {
    return `${this.type} ${this.name}`;
  }
}

export type ShipPartArgsSuper = Omit<ShipPartArgs, "type">;

export interface CrewArgs extends ShipPartArgsSuper {
  salary: number;
  hunger: number;
}

export class Crew extends ShipPart {
  salary: number;
  hunger: number;

  constructor(args: CrewArgs) {
    super({ type: "crew", ...args });
    this.salary = args.salary;
    this.hunger = args.hunger;
  }

  getItemLabel(): string {
    return `crewmate ${this.name}`;
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
    this.name = `${this.caliber}cm cannonball ammo`;
    this.dying = false;
  }

  sphericalVolume() {
    return (4 / 3) * Math.PI * Math.pow(this.caliber / 2, 3);
  }

  estimateCost() {
    return 0.004 * this.sphericalVolume() * this.amount;
  }

  getItemLabel() {
    return `${Math.round(this.caliber * 10)}mm cannonball ammo (x${this.amount})`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  specialImpact(cannonball: Cannonball, victimShip: Ship) {}
}

export interface CannonArgs
  extends Optional<ShipPartArgsSuper, "maxDamage" | "vulnerability"> {
  caliber: number;
  range?: number;
  shootRate: number;
}

export class Cannon extends ShipPart {
  caliber: number;
  cooldown: number;
  range: number;
  shootRate: number;

  constructor(args: CannonArgs) {
    super({ type: "cannon", maxDamage: 8, vulnerability: 0.02, ...args });
    this.caliber = args.caliber;
    this.range = args.range || 600;
    this.shootRate = args.shootRate;
    this.cooldown = 0;
  }

  private shootCannonball(deltaTime: number, ship: Ship, dist: number) {
    dist = Math.min(dist, this.range);

    const cball = ship.play.spawnCannonball(ship, { size: this.caliber });
    cball.phys.vspeed = dist / 250;
    const airtime = cball.airtime();

    const velComp = ship.angNorm.dot(ship.vel);

    dist =
      dist -
      ship.pos.clone().subtract(ship.cannonballSpawnSpot()).length() -
      velComp * airtime;
    const targSpeed = (dist / airtime) * deltaTime;
    cball.phys.vel = Vec2(targSpeed, 0).rotateBy(ship.angle).add(ship.vel);

    return cball;
  }

  public airtime(deltaTime: number, ship: Ship, dist: number) {
    const tempCannonball = this.shootCannonball(deltaTime, ship, dist);
    const airtime = tempCannonball.airtime();
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
    return new Cannon({
      name: "Shooty",
      cost: 160,
      caliber: 4,
      range: 900,
      shootRate: 2,
    });
  }

  tick(deltaTime: number) {
    this.coolDown(deltaTime);
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

export class Engine extends ShipPart {
  fuelType: string;
  fuelCost: number;
  thrust: number;

  constructor(args: EngineArgs) {
    super({ type: "engine", maxDamage: 6, vulnerability: 0.3, ...args });
    this.thrust = args.thrust;
    this.fuelType = (args.fuel && args.fuel.type) || null;
    this.fuelCost = (args.fuel && args.fuel.cost) || 0.02;
  }

  static default(): Engine {
    return new Engine({
      name: "Steamy",
      cost: 160,
      thrust: 1.2,
      fuel: { type: "coal", cost: 0.008 },
    });
  }

  static oars(): Engine {
    return new Engine({
      name: "Oars",
      cost: 30,
      thrust: 0.5,
      vulnerability: 0.003,
      maxDamage: 1,
    });
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
}

export const DEFAULT_MAKE: ShipMake = {
  name: "Defaulty",
  slots: [
    { type: "cannon" },
    { type: "cannon" },
    { type: "cannon" },
    { type: "engine" },
    { type: "engine" },
  ],
  maxDamage: 50,
  drag: 0.3,
  size: 20,
  lateralCrossSection: 1.7,
  repairCostScale: 7,
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
    this.inventory.addItem(this.addPart(Cannon.default()));
    this.inventory.addItem(this.addPart(Engine.default()));
    this.inventory.addItem(this.addPart(Engine.oars()));
    this.inventory.addItem(new CannonballAmmo(4, 25));
    this.inventory.addItem(new FuelItem("coal", 0.8, 40));
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
    const idx = this.parts.indexOf(part);
    if (idx === -1) return;
    this.parts.splice(idx, 1);
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
    }

    return false;
  }

  damageShip(amount: number) {
    this.hullDamage += amount;
    for (const part of this.parts) {
      const partDamage = Math.random() * amount * part.vulnerability;
      part.damagePart(partDamage);
    }
    this.pruneDestroyedParts();
    return this.hullDamage > this.make.maxDamage;
  }

  hasFuel(fuelType: string) {
    return this.fuel.some((f: FuelItem) => f.name === fuelType && f.amount > 0);
  }

  getReadyEngines(): Array<Engine> {
    return (<Array<Engine>>this.getPartsOf("engine")).filter(
      (p: Engine) => p.fuelType == null || this.hasFuel(p.fuelType),
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
    const cannons = (<Array<Cannon>>this.getPartsOf("cannon")).sort(
      (a, b) => a.cooldown - b.cooldown,
    );
    return cannons[0] || null;
  }

  get readyCannon(): Cannon | null {
    // return the biggest caliber cannon currently available
    const cannons = (<Array<Cannon>>this.getPartsOf("cannon"))
      .filter((c) => c.cooldown === 0 && this.hasAmmo(c.caliber))
      .sort((a, b) => b.caliber - a.caliber);
    return cannons[0] || null;
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
