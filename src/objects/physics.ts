import Vec2 from "victor";
import { PlayState } from "../superstates/play";
import { Ship } from "./ship";
import { ObjectRenderInfo } from "../render";

export interface PhysicsParams {
  size: number;
  angle: number;
  vel: Vec2;
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
}

export class PhysicsSimulation {
  play: PlayState;
  objects: Array<PhysicsObject>;

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

  makePhysObj(pos: Vec2, params?: Partial<PhysicsParams>) {
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
  play: PlayState;
  lastFloor: { age: number; floor: number } | null;
  frozen: boolean = false;
  size: number;
  angle: number;
  pos: Vec2;
  lastPos: Vec2;
  height: number;
  vspeed: number;
  weight: number;
  baseDrag: number;
  baseFriction: number;
  angVel: number;
  angleDrag: number;
  gravity: number;
  buoyancy: number;
  age: number;
  dying: boolean;
  restitution: number;
  displacement: number = 0;

  constructor(play: PlayState, pos: Vec2, params?: Partial<PhysicsParams>) {
    if (params == null) params = {};
    this.play = play;
    this.pos = pos;
    this.lastPos = pos.clone();
    if (params.vel) this.vel = params.vel;
    this.size = params.size ?? 1;
    this.angle = params.angle ?? 0;
    this.angVel = params.angVel ?? 0;
    this.age = 0;
    this.height =
      params.height != null
        ? params.height
        : Math.max(play.waterLevel, this.floor);
    this.vspeed = params.vspeed ?? 0;
    this.weight = params.weight ?? 1;
    this.baseDrag = params.baseDrag ?? 0.5;
    this.baseFriction = params.baseFriction ?? 0.007;
    this.angleDrag = params.angleDrag ?? 0.05;
    this.dying = false;
    this.gravity = params.gravity ?? 1.5;
    this.buoyancy = params.buoyancy ?? 0.06;
    this.restitution = params.restitution ?? 0.5;
  }

  setPos(newPos: Vec2) {
    const vel = this.vel;
    this.pos = newPos.clone();
    this.vel = vel;
  }

  shift(offset: Vec2) {
    this.pos.add(offset);
    this.lastPos.add(offset);
  }

  playSound(name: string, volume: number = 1.0) {
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
    return this.lastFloor.floor;
  }

  slideDownLand(deltaTime: number) {
    const floor = this.floor;
    if (floor <= this.play.waterLevel || this.height > floor + 0.1) {
      return;
    }
    const dHeight = this.heightGradient();
    this.applyForce(
      deltaTime,
      new Vec2(
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

  set vel(vel: Vec2) {
    this.lastPos = this.pos.clone().subtract(vel);
  }

  applyTorque(deltaTime: number | null, torque: number) {
    if (deltaTime == null) deltaTime = 1;
    const factor = deltaTime / this.angularInertia();
    const offs = torque * factor;
    this.angVel += offs;
  }

  applyTorqueAt(deltaTime: number | null, pos: Vec2, force: Vec2) {
    const arm = pos.clone().subtract(this.pos);
    const torque =
      arm
        .clone()
        .rotate(Math.PI / 2)
        .dot(force) / arm.lengthSq();
    this.applyTorque(deltaTime, torque);
  }

  applyForce(deltaTime: number | null, force: Vec2) {
    if (deltaTime == null) deltaTime = 1;
    const factor = -deltaTime / this.weight;
    const offs = force.clone().multiplyScalar(factor);
    this.lastPos.add(offs);
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
    return this.size * this.baseDrag * 3;
  }

  airDrag() {
    return this.size * this.baseDrag * 0.3;
  }

  inWater() {
    return (
      this.floor <= this.play.waterLevel &&
      this.height <= this.play.waterLevel + 0.05
    );
  }

  dragVector() {
    return new Vec2(1, 1);
  }

  physDrag(deltaTime: number) {
    const inWater = this.inWater();

    const drag = inWater ? this.waterDrag() : this.airDrag();

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

  vecMomentum(): Vec2 {
    return this.vel.multiplyScalar(this.weight);
  }

  orbitalVelocityAt(pos: Vec2): Vec2 {
    const rel = pos.clone().subtract(this.pos);
    return rel.rotate(Math.PI / 2).multiplyScalar(this.angVel);
  }

  angularInertia(): number {
    // TODO: make depend on geometry
    return this.weight;
  }

  angularInertiaAt(pos: Vec2): number {
    return this.weight / pos.clone().subtract(this.pos).length();
  }

  orbitalMomentumAt(pos: Vec2): Vec2 {
    return this.orbitalVelocityAt(pos).multiplyScalar(
      this.angularInertiaAt(pos),
    );
  }

  momentumRelativeTo(other: PhysicsObject): number {
    return this.momentum(this.vel.subtract(other.vel).length());
  }

  physFriction(deltaTime: number) {
    const floor = this.floor;

    if (this.height > this.floor + 0.01) {
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
      this.vel = new Vec2(0, 0);
    } else {
      this.applyForce(deltaTime, fricForce);
    }
  }

  heightGradient() {
    const terrain = this.play.terrain;
    if (terrain == null) return new Vec2(0, 0);
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

    if (this.height < floor) {
      this.height = floor;
      this.vspeed = 0;
      return;
    }

    if (inWater && this.height < this.play.waterLevel) {
      this.vspeed += this.buoyancy * deltaTime;
    } else {
      this.vspeed -= this.gravity * deltaTime;
    }
  }

  physAngle(deltaTime: number) {
    this.angle += this.angVel * deltaTime;
    this.angVel -= this.angVel * this.angleDrag * deltaTime;
    this.angle = this.angle % (Math.PI * 2);
  }

  get angNorm() {
    return new Vec2(1, 0).rotateBy(this.angle);
  }

  tick(deltaTime: number) {
    if (this.frozen) return;

    this.age += deltaTime;

    this.physAngle(deltaTime);
    this.physGravity(deltaTime);
    this.physVel(deltaTime);
    this.physDrag(deltaTime);
    this.physFriction(deltaTime);
    this.slideDownLand(deltaTime);
  }
}
