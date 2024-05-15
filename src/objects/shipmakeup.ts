import { FoodItem, FuelItem, ShipItem } from "../inventory";
import { Cannonball } from "./cannonball";
import { Ship } from "./ship";

export class ShipPart implements ShipItem {
  type: string;
  name: string;
  cost: number;
  damage: number;
  manned: boolean;
  maxDamage: number;
  vulnerability: number;

  constructor(type, name, cost, maxDamage, vulnerability = 0, damage = 0, manned = false) {
    this.type = type;
    this.cost = cost;
    this.name = name;
    this.damage = damage;
    this.maxDamage = maxDamage;
    this.manned = manned;
    this.vulnerability = vulnerability;
  }

  applyToShip(shipMakeup: ShipMakeup) {
    shipMakeup.addPart(this);
  }
  
  tick(deltaTime: number) {}
}

export default class Crew extends ShipPart {
  salary: number;
  hunger: number;

  constructor(name, salary, hunger = 0) {
    super("crew", name, 0, 0.1, 0.02);
    this.salary = salary;
    this.hunger = hunger;
  }
}

export class CannonballAmmo {
  caliber: number;
  amount: number;

  constructor(caliber, amount = 15) {
    this.caliber = caliber;
    this.amount = amount;
  }

  specialImpact(cannonball: Cannonball, victimShip: Ship) {}
}

export class Cannon extends ShipPart {
  caliber: number;
  cooldown: number;
  shootRate: number;

  constructor(name, cost, caliber, shootRate, maxDamage = 0.6, vulnerability = 0.1, damage = 0) {
    super("cannon", name, cost, maxDamage, vulnerability, damage);
    this.caliber = caliber;
    this.shootRate = shootRate;
    this.cooldown = 0;
  }
  
  private shootCannonball(deltaTime: number, ship: Ship, dist: number) {
      const game = ship.game;

    const cball = ship.play.spawnCannonball(this, {});
    cball.phys.vspeed = dist / 250;
    const airtime = cball.airtimeme;

    const velComp = this.angNorm.dot(this.vel);

    //console.log(dist, airtime);
    dist =
      dist -
      this.pos.clone().subtract(this.cannonballSpawnSpot()).length() -
      velComp * airtime;
    const targSpeed = Math.min(
      this.maxCannonPower,
      (dist / airtime) * timeDelta,
    );
    cball.phys.vel = Vec2(targSpeed, 0).rotateBy(this.angle).add(this.vel);
  }
  
  private coolDown(deltaTime: number) {
      this.cooldown -= deltaTime;
  }
  
  private afterShot() {
      this.cooldown = this.shootRate;
  }
  
  shoot(ship: Ship, dist: number) {
      // TODO: spawn cannonball
      if (!ship.makeup.spendAmmo(this.caliber)) {
          return false;
      }
      
      this.shootCannonball(ship, dist);
      this.afterShot();
      return true;
  }
  
  tick(deltaTime: number) {
      this.coolDown(deltaTime);
  }
}

export class Engine extends ShipPart {
  fuelType: string;
  thrust: number;

  constructor(name, cost, thrust, fuelType, maxDamage = 0.9, vulnerability = 0.3, damage = 0, manned = false) {
    super("engine", name, cost, maxDamage, vulnerability, damage, manned = manned);
    this.thrust = thrust;
    this.fuelType = fuelType;
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
}

export class ShipMakeup {
  make: ShipMake;
  parts: Array<ShipPart>;
  food: Array<FoodItem>;
  fuel: Array<FuelItem>;
  ammo: Array<CannonballAmmo>;
  hullDamage: number;

  constructor(make, hullDamage = 0) {
    this.parts = [];
    this.make = make;
    this.hullDamage = hullDamage;
  }

  numSlotsOf(type) {
    return this.make.slots
      .map((s) => s.type === type)
      .reduce((a, b) => (+b + a), 0);
  }

  numPartsOf(type) {
    return this.parts
      .map((p) => p.type === type)
      .reduce((a, b) => (+b + a), 0);
  }

  getPartsOf(type) {
    return this.parts.filter((p) => p.type === type);
  }

  slotsRemaining(type) {
    return this.numSlotsOf(type) - this.numPartsOf(type);
  }

  addPart(part: ShipPart) {
    if (this.parts.indexOf(part) !== -1) {
      return false;
    }
    if (this.slotsRemaining(part.type)) {
      return false;
    }
    this.parts.push(part);
    return true;
  }

  private pruneSpentFuel() {
    this.fuel = this.fuel.filter((f) => f.amount > 0);
  }

  private pruneSpentFood() {
    this.food = this.food.filter((f) => f.amount > 0);
  }
  
  private pruneSpentAmmo() {
      this.ammo = this.ammo.filter((a) => a.amount > 0);
  }

  spendFood(amount: number) {
    for (let food of this.food) {
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
    for (let fuel of this.fuel) {
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
      
      for (let ammo of this.ammo) {
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
      for (let ammo of this.ammo) {
          if (ammo.caliber === caliber) {
              return true;
          }
      }
      
      return false;
  }
  
  damageShip(amount: number) {
      this.hullDamage += amount;
      for (let part of this.parts) {
          let partDamage = Math.random() * amount * part.vulnerability;
      }
  }
  
  get thrust() {
      return this.getPartsOf('engine').reduce((sum, p: Engine) => sum + p.thrust, 0);
  }
  
  get drag() {
      return this.make.drag;
  }
  
  get nextReadyCannon(): Cannon | null {
      for (let cannon of <Array<Cannon>> this.getPartsOf('cannon')) {
          if (this.hasAmmo(cannon.caliber) && cannon.cooldown === 0) {
              return cannon;
          }
      }
      
      return null;
  }
  
  get shootRate() {
    // TODO: depend on cannons
    return 2.0;
  }
  
  get maxShootRange() {
    // TODO: depend on cannons
    return 500;
  }
}
