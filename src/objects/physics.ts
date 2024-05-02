import Vec2 from "victor";

interface PhysicsParams {
  size: number;
  angle: number;
  vel: Vec2;
  height: number;
  vspeed: number;
  weight: number;
  baseDrag: number;
  baseFriction: number;
  angleDrag: number;
  gravity: number;
  buoyancy: number;
}

export class PhysicsSimulation {
  constructor(game: Game) {
    this.game = game;
    this.objects = [];
  }

  makePhysObj(pos: Vec2, params?: Partial<PhysicsParams>) {
    const res = new PhysicsObject(this.game, pos, params);
    this.objects.push(res);
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
  constructor(game: Game, pos: Vec2, params?: Partial<PhysicsParams>) {
    if (params == null) params = {};
    this.game = game;
    this.pos = pos;
    this.lastPos = pos.clone();
    if (params.vel) this.vel = params.vel;
    this.size = params.size != null ? params.size : 1;
    this.angle = params.angle != null ? params.angle : 0;
    this.angVel = 0;
    this.age = 0;
    this.height =
      params.height != null
        ? params.height
        : Math.max(game.waterLevel, this.floor);
    this.vspeed = params.vspeed != null ? params.vspeed : 0;
    this.weight = params.weight != null ? params.weight : 1;
    this.baseDrag = params.baseDrag != null ? params.baseDrag : 0.6;
    this.baseFriction = params.baseFriction != null ? params.baseFriction : 0.2;
    this.angleDrag = params.angleDrag != null ? params.angleDrag : 0.05;
    this.dying = false;
    this.gravity = params.gravity != null ? params.gravity : 1.5;
    this.buoyancy = params.buoyancy != null ? params.buoyancy : 0.06;
  }

  get floor() {
    if (this.game.terrain == null) return 0;
    return this.game.terrain.heightAt(this.pos.x, this.pos.y);
  }

  slideDownLand(deltaTime: number) {
    const floor = this.floor;
    if (floor <= game.waterLevel || this.height > floor + 0.1) {
      return;
    }
    const dHeight = this.heightGradient().norm();
    this.applyForce(
      deltaTime,
      Vec2(
        -dHeight.x * this.gravity * this.weight,
        -dHeight.y * this.gravity * this.weight,
      ),
    );
  }

  get vel() {
    return this.pos.clone().subtract(this.lastPos);
  }

  set vel(vel: Vec2) {
    this.lastPos = this.pos.clone().subtract(vel);
  }

  applyForce(deltaTime: number, force: Vec2) {
    this.lastPos.subtract(
      force
        .clone()
        .multiply(Vec2(deltaTime * this.weight, deltaTime * this.weight)),
    );
  }

  physAngle(deltaTime: number) {
    this.angle += this.angVel * deltaTime;
    this.angVel -= this.angVel * this.waterDrag * deltaTime;
    this.angle = this.angle % (Math.PI * 2);
  }

  physVel() {
    const lastPos = this.pos.clone();
    this.pos = this.pos.clone().multiply(Vec2(2, 2)).subtract(this.lastPos);
    this.lastPos = lastPos;
  }

  waterDrag() {
    return this.baseDrag;
  }

  airDrag() {
    return this.baseDrag * 0.02;
  }

  physDrag(deltaTime: number) {
    const floor = this.floor;
    const inWater =
      floor < this.game.waterLevel &&
      this.height <= this.game.waterLevel + 0.01;

    const drag = inWater ? this.waterDrag() : this.airDrag();

    const currVel = this.vel;
    const dragForce = Vec2(-deltaTime * drag, -deltaTime * drag).multiply(
      currVel,
    );

    this.applyForce(deltaTime, dragForce);
  }

  physFriction(deltaTime: number) {
    const floor = this.floor;

    if (this.height > this.floor + 0.01) {
      return;
    }

    if (floor < this.game.waterLevel) {
      return;
    }

    const friction = this.baseFriction * this.weight;
    const fricForce = this.vel
      .clone()
      .norm()
      .multiply(Vec2(-friction, -friction));

    if (fricForce.length() * deltaTime > this.vel.length()) {
      this.vel = Vec2(0, 0);
    } else {
      this.applyForce(deltaTime, fricForce);
    }
  }

  heightGradient() {
    const terrain = this.game.terrain;
    return Vec2(
      terrain.heightAt(this.pos.x + 0.5, this.pos.y) -
        this.game.terrain.heightAt(this.pos.x - 0.5, this.pos.y),
      this.game.terrain.heightAt(this.pos.x, this.pos.y + 0.5) -
        this.game.terrain.heightAt(this.pos.x, this.pos.y - 0.5),
    );
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
    const inWater = floor < this.game.waterLevel;

    if (this.height < floor) {
      this.height = floor;
      this.vspeed = 0;
      return;
    }

    if (inWater && this.height < this.game.waterLevel) {
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

  tick(deltaTime: number) {
    this.age += deltaTime;

    this.physAngle(deltaTime);
    this.physGravity(deltaTime);
    this.physVel();
    this.physDrag(deltaTime);
    this.physFriction(deltaTime);
    this.slideDownLand(deltaTime);
  }
}
