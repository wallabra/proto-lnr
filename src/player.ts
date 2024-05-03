import Vec2 from "victor";

export class Player {
  constructor(ship: Ship) {
    this.possessed = ship;
    this.inputState = null;
    this.actions = [];
    this.registerActions();
  }

  steer(offs: Vec2, deltaTime: number) {
    const targ = offs.angle();
    this.possessed.steer(deltaTime, targ);
  }

  approach(offs: Vec2, deltaTime: number) {
    const dot = Vec2(1, 0).rotateBy(this.possessed.angle).dot(offs.norm());
    this.possessed.thrustForward(deltaTime, dot + 1 / 2);
  }

  inputEvent(name: string /*, event: KeyboardEvent*/) {
    if (name == "shoot") {
      this.inputState = "shoot";
    }
  }

  registerAction(name: string, callback: (deltaTime: float) => null) {
    this.actions.push((deltaTime) => {
      if (this.inputState == name) {
        this.inputState = null;
        callback(deltaTime);
      }
    });
  }

  registerActions() {
    this.registerAction("shoot", (/*deltaTime*/) => {
      const ms = window.mouseState;
      this.possessed.tryShoot(Vec2(ms.x, ms.y).length());
    });
  }

  doAction(deltaTime: number) {
    this.actions.forEach((act) => act(deltaTime));
  }

  doSteer(deltaTime: number) {
    if (!window.mouseState.steering) {
      return;
    }

    const offs = Vec2(window.mouseState.x, window.mouseState.y);

    if (
      offs.length() <
      this.possessed.size * this.possessed.lateralCrossSection * 2
    ) {
      // close enough
      return;
    }

    this.steer(offs, deltaTime);
    this.approach(offs, deltaTime);
  }

  tick(deltaTime: number) {
    if (this.possessed.dying) {
      return;
    }

    this.doSteer(deltaTime);
    this.doAction(deltaTime);
  }
}