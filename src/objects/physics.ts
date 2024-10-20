import Victor from "victor";
import type { PlayState } from "../superstates/play";
import type { Ship } from "./ship";
import type { ObjectRenderInfo } from "../render";
import { lerp } from "../util";

export interface PhysicsParams {
  size: number;
  angle: number;
  vel: Victor;
  height: number;
  vspeed: number;
  weight: number;
  baseDrag: number;
  baseFriction: number;
  angleDrag: number;
  angVel: number;
  gravity: number;
  buoyancy: number;
  restitution: number;
  frozen?: boolean;
  immovable?: boolean;
  capBuoyancy?: boolean;
}

export class PhysicsSimulation {
  play: PlayState;
  objects: PhysicsObject[];

  constructor(play: PlayState) {
    this.play = play;
    this.objects = [];
  }

  removePhysObj(obj: PhysicsObject) {
    const idx = this.objects.indexOf(obj);

    if (idx !== -1) {
      this.objects.splice(idx, -1);
    }
  }

  addPhysObj(obj: PhysicsObject) {
    this.objects.push(obj);
  }

  makePhysObj(pos: Victor, params?: Partial<PhysicsParams>) {
    const res = new PhysicsObject(this.play, pos, params);
    this.addPhysObj(res);
    return res;
  }

  tick(timeDelta: number) {
    this.objects = this.objects.filter((o) => !o.dying);

    for (const obj of this.objects) {
      obj.tick(timeDelta);
    }
  }
}

export class PhysicsObject {
  public play: PlayState;
  public lastFloor: { age: number; floor: number } | null = null;
  public frozen = false;
  public immovable = false;
  public size: number;
  public angle: number;
  public pos: Victor;
  public lastPos: Victor;
  public height: number;
  public vspeed: number;
  public weight: number;
  public baseDrag: number;
  public baseFriction: number;
  public angVel: number;
  public angleDrag: number;
  public gravity: number;
  public buoyancy: number;
  public age = 0;
  public tickAge = 0;
  public dying = false;
  public restitution: number;
  public displacement = 0;
  public capBuoyancy: boolean;

  private cachedVolume: number | null = null;

  constructor(play: PlayState, pos: Victor, params?: Partial<PhysicsParams>) {
    if (params == null) params = {};
    this.play = play;
    this.pos = pos.clone();
    this.lastPos = pos.clone();
    if (params.vel) this.vel = params.vel;
    this.size = params.size ?? 1;
    this.angle = params.angle ?? 0;
    this.angVel = params.angVel ?? 0;
    this.height =
      params.height != null
        ? params.height
        : Math.max(play.waterLevel, this.floor);
    this.vspeed = params.vspeed ?? 0;
    this.weight = params.weight ?? 1;
    this.baseDrag = params.baseDrag ?? 0.5;
    this.baseFriction = params.baseFriction ?? 0.007;
    this.angleDrag = params.angleDrag ?? 0.05;
    this.gravity = params.gravity ?? 9.7;
    this.buoyancy = params.buoyancy ?? 0.06;
    this.restitution = params.restitution ?? 0.5;
    this.frozen = params.frozen ?? false;
    this.immovable = params.immovable ?? false;
    this.capBuoyancy = params.capBuoyancy ?? false;
  }

  public verticalSize(): number {
    return this.size * 0.001;
  }

  /// How submerged this object is in water, between 0 and 1.
  public submersion(): number {
    if (!this.inWater()) return 0;

    const vsize = this.verticalSize();
    return Math.max(
      0,
      Math.min(1, (this.play.waterLevel - this.height + vsize) / (vsize * 2)),
    );
  }

  /// How much water by kg is currently being displaced by this object.
  public currentWaterDisplacementKg(): number {
    const submersion = this.submersion();
    const submergedVolDm3 =
      ((Math.PI * submersion * submersion * (3 - submersion)) / 3) *
      this.sphericalVolume();
    return submergedVolDm3 * 0.997; // 1 dm³ of water = 0.997 kg, conveniently
  }

  /// Whether this object is submerged to the very top.
  public isSubmerged(): boolean {
    return this.height + this.verticalSize() < this.play.waterLevel;
  }

  public isOnLand(): boolean {
    const floor = this.floor;
    return (
      floor > this.play.waterLevel &&
      this.height - this.verticalSize() < floor + 0.02
    );
  }

  /// The force, in N, that water makes on this object upward from displacement.
  public buoyantForce(): number {
    if (!this.inWater()) {
      return 0;
    }

    return this.currentWaterDisplacementKg() * this.gravity;
  }

  /// Theoretical spherical volume of this object.
  public sphericalVolume(): number {
    if (this.cachedVolume != null) return this.cachedVolume;
    return (this.cachedVolume = this._sphericalVolume());
  }

  _sphericalVolume(): number {
    return (4 * Math.PI * Math.pow(this.size, 3)) / 3;
  }

  setPos(newPos: Victor) {
    const vel = this.vel;
    this.pos = newPos.clone();
    this.vel = vel;
  }

  shift(offset: Victor) {
    this.pos.add(offset);
    this.lastPos.add(offset);
  }

  playSound(name: string, volume = 1.0) {
    if (this.play.sfx == null) return null;
    return this.play.sfx.play(this, name, volume);
  }

  touchingShip(ship: Ship) {
    if (Math.abs(this.height - ship.height) > 0.6) {
      return 0;
    }

    const collision = ship.collisionWithCircle([
      { center: this.pos.clone(), radius: this.size },
    ]);
    return collision == null ? 0 : -collision.dist;
  }

  private computeFloor() {
    if (this.play.terrain == null) return 0;
    return this.play.terrain.heightAt(this.pos.x, this.pos.y);
  }

  private regenLastFloor() {
    const floor = this.computeFloor();
    this.lastFloor = {
      age: this.age,
      floor: floor,
    };
  }

  get floor() {
    if (this.lastFloor == null || this.lastFloor.age !== this.age)
      this.regenLastFloor();
    if (this.lastFloor == null)
      throw new Error("regenLastFloor did not set the floor");
    return this.lastFloor.floor;
  }

  slideDownLand(deltaTime: number) {
    if (!this.isOnLand()) {
      return;
    }
    const dHeight = this.heightGradient();
    this.applyForce(
      deltaTime,
      new Victor(
        -dHeight.x * this.gravity * this.weight * 1000,
        -dHeight.y * this.gravity * this.weight * 1000,
      ),
    );
  }

  isVisible(info: ObjectRenderInfo) {
    const pos = info.base
      .clone()
      .add(this.pos.clone().subtract(info.cam).multiplyScalar(info.scale));
    const edge = this.size;

    return (
      pos.x > -edge &&
      pos.x < info.width + edge &&
      pos.y > -edge &&
      pos.y < info.height + edge
    );
  }

  get vel() {
    return this.pos.clone().subtract(this.lastPos);
  }

  set vel(vel: Victor) {
    if (this.immovable) return;
    this.lastPos = this.pos.clone().subtract(vel);
  }

  applyTorque(deltaTime: number | null, torque: number) {
    if (this.immovable) return;
    if (deltaTime == null) deltaTime = 1;
    const factor = deltaTime / this.angularInertia();
    const offs = torque * factor;
    this.angVel += offs;
  }

  applyTorqueAt(deltaTime: number | null, pos: Victor, force: Victor) {
    if (this.immovable) return;
    const arm = pos.clone().subtract(this.pos);
    const torque =
      arm
        .clone()
        .rotate(Math.PI / 2)
        .dot(force) / arm.lengthSq();
    this.applyTorque(deltaTime, torque);
  }

  applyForce(deltaTime: number | null, force: Victor) {
    if (this.immovable) return;
    if (deltaTime == null) deltaTime = 1;
    const factor = -deltaTime / this.weight;
    const offs = force.clone().multiplyScalar(factor);
    this.lastPos.add(offs);
  }

  applyForceVert(deltaTime: number | null, force: number) {
    if (this.immovable) return;
    if (deltaTime == null) deltaTime = 1;
    const factor = (0.3 * deltaTime) / this.weight;
    this.vspeed += force * factor;
  }

  physVel(deltaTime: number) {
    const offs = this.pos
      .clone()
      .subtract(this.lastPos)
      .multiplyScalar(deltaTime);
    this.displacement += offs.length();
    this.pos.add(offs);
    this.lastPos.add(offs);
  }

  waterDrag() {
    return this.size * this.baseDrag * 6.5;
  }

  airDrag() {
    return this.size * this.baseDrag * 0.3;
  }

  inWater() {
    return (
      this.floor <= this.play.waterLevel &&
      this.height - this.verticalSize() <= this.play.waterLevel
    );
  }

  dragVector() {
    return new Victor(1, 1);
  }

  physDrag(deltaTime: number) {
    const drag = lerp(this.airDrag(), this.waterDrag(), this.submersion());

    const dragForce = this.vel
      .clone()
      .multiplyScalar(-drag)
      .multiply(this.dragVector());
    this.applyForce(deltaTime, dragForce);
  }

  kineticEnergy(vel?: number): number {
    return (
      (1 / 2) * this.weight * (vel != null ? vel * vel : this.vel.lengthSq())
    );
  }

  kineticEnergyRelativeTo(other: PhysicsObject): number {
    return this.kineticEnergy(this.vel.subtract(other.vel).length());
  }

  momentum(vel?: number): number {
    return this.weight * (vel ?? this.vel.length());
  }

  vecMomentum(): Victor {
    return this.vel.multiplyScalar(this.weight);
  }

  orbitalVelocityAt(pos: Victor): Victor {
    const rel = pos.clone().subtract(this.pos);
    return rel.rotate(Math.PI / 2).multiplyScalar(this.angVel);
  }

  angularInertia(): number {
    // TODO: make depend on geometry
    return this.weight;
  }

  angularInertiaAt(pos: Victor): number {
    return this.weight / pos.clone().subtract(this.pos).length();
  }

  orbitalMomentumAt(pos: Victor): Victor {
    return this.orbitalVelocityAt(pos)
      .clone()
      .multiplyScalar(this.angularInertiaAt(pos));
  }

  momentumRelativeTo(other: PhysicsObject): number {
    return this.momentum(this.vel.subtract(other.vel).length());
  }

  physFriction(deltaTime: number) {
    const floor = this.floor;

    if (this.height > this.floor + 0.001) {
      return;
    }

    if (floor <= this.play.waterLevel) {
      return;
    }

    const steepness = 1 / (1 + this.heightGradient().length());
    const friction = this.baseFriction * this.weight * this.weight;
    const fricForce = this.vel
      .clone()
      .norm()
      .multiplyScalar(-friction * steepness);

    if ((fricForce.length() * deltaTime) / this.weight > this.vel.length()) {
      this.vel = new Victor(0, 0);
    } else {
      this.applyForce(deltaTime, fricForce);
    }
  }

  heightGradient() {
    const terrain = this.play.terrain;
    if (terrain == null) return new Victor(0, 0);
    return terrain.gradientAt(this.pos.x, this.pos.y);
  }

  circleIntersect(otherObj: PhysicsObject, scale: number) {
    const r1 = this.size * (scale || 1);
    const r2 = otherObj.size * (scale || 1);

    const dist = this.pos.clone().subtract(otherObj.pos).length();

    return dist <= r1 + r2;
  }

  physGravity(deltaTime: number) {
    this.height += this.vspeed * deltaTime;

    const floor = this.floor;
    const inWater = this.inWater();

    if (this.height - this.verticalSize() < floor) {
      this.height = floor + this.verticalSize();
      this.vspeed = 0;
      return;
    }

    if (inWater && this.height < this.play.waterLevel + this.verticalSize()) {
      let buoyancy = this.buoyancy * this.buoyantForce();
      if (buoyancy > this.weight * this.gravity * 2 && this.capBuoyancy)
        buoyancy = this.weight * this.gravity * 2;
      this.applyForceVert(deltaTime, buoyancy);
    }

    this.applyForceVert(deltaTime, -this.gravity * this.weight);
  }

  physAngle(deltaTime: number) {
    this.angle += this.angVel * deltaTime;
    this.angVel -= this.angVel * this.angleDrag * deltaTime;
    this.angle = this.angle % (Math.PI * 2);
  }

  get angNorm() {
    return new Victor(1, 0).rotateBy(this.angle);
  }

  tick(deltaTime: number) {
    if (this.frozen) return;

    this.age += deltaTime;
    this.tickAge++;

    this.physAngle(deltaTime);
    this.physGravity(deltaTime);
    this.physVel(deltaTime);
    this.physDrag(deltaTime);
    this.physFriction(deltaTime);
    this.slideDownLand(deltaTime);
  }
}
