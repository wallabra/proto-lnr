import { Cannonball } from "../objects/cannonball";
import type { CannonballParams } from "../objects/cannonball";
import { Ship } from "../objects/ship";
import type { ShipParams } from "../objects/ship";
import { PhysicsSimulation } from "../objects/physics";
import type { PhysicsParams } from "../objects/physics";
import { PhysicsObject } from "../objects/physics";
import { Terrain } from "../terrain";
import type { TerraDef } from "../terrain";
import { Superstate } from "./base";
import Victor from "victor";
import { AIController } from "../ai/ai";
import { GameRenderer } from "../render";
import type { Renderable, TickerMessageArgs } from "../render";
import type { Game } from "../game";
import { PlayMouseHandler } from "../mouse";
import { PlayKeyHandler } from "../keyinput";
import random from "random";
import type { ShipMakeup } from "../objects/shipmakeup";
import { SoundEngine } from "../sfx";
import { Decor } from "../objects/props/decor";
import type { Nullish } from "utility-types";
import { getRandomSpawnClass } from "../spawn";
import i18next from "i18next";

export interface GameObject {
  dying: boolean;
  type: string;
}

export interface Tickable extends GameObject {
  tick: (deltaTime: number) => void;
}

export interface Physicable extends GameObject {
  phys: PhysicsObject;
}

export function isGameObject(other: object): other is GameObject {
  return (
    "dying" in other &&
    "type" in other &&
    typeof other.dying === "boolean" &&
    typeof other.type === "string"
  );
}

export function isTickable(other: object): other is Tickable {
  return (
    isGameObject(other) && "tick" in other && typeof other.tick === "function"
  );
}

export function isPhysicable(other: object): other is Physicable {
  return (
    isGameObject(other) &&
    "phys" in other &&
    other.phys instanceof PhysicsObject
  );
}

export class PlayState extends Superstate {
  terrain: Terrain | null;
  tickables: Tickable[] = [];
  physicables: Physicable[] = [];
  renderables: Renderable[] = [];
  allObjects: GameObject[] = [];
  renderer: GameRenderer = new GameRenderer(this);
  physics: PhysicsSimulation = new PhysicsSimulation(this);
  public sfx: SoundEngine | null;
  continuousSpawnTimer: number | null = null;
  public now: number = 0;
  private currCameraPos: Victor = new Victor(0, 0);

  /** The speed at which the camera scrolls towards targetCameraPos.
   *
   * This value is a multiplier on the distance, per second. It MUST be
   * a value between 0 and 1.
   */
  public cameraScrollSpeed: number = 0.85;

  constructor(game: Game, terraDef: TerraDef) {
    super(game);
    this.setTerrain(new Terrain(terraDef));
    this.reloadSoundEngine();
  }

  addTickerMessage(message: TickerMessageArgs, duration: number) {
    this.renderer.r_hud.addMessage(message, duration);
  }

  reloadSoundEngine() {
    if (this.player?.possessed == null) {
      this.sfx = null;
      return false;
    }

    const ship = this.player.possessed;

    if (this.sfx != null) {
      if (this.sfx.perspective !== ship.phys) {
        this.sfx.perspective = ship.phys;
        this.sfx.update();
      }
    } else {
      this.sfx = new SoundEngine(ship.phys);
    }

    return true;
  }

  addShip(ship: Ship) {
    this.tickables.push(ship);
    this.renderables.push(ship);
    this.physicables.push(ship);
    this.allObjects.push(ship);
  }

  public killAllNPCs() {
    this.tickables.forEach((t) => {
      if (t.type !== "ship") {
        return;
      }
      if (t === this.player?.possessed) {
        return;
      }

      (t as Ship).die();
    });
  }

  public objectsInRadius(
    at: Victor,
    radius: number,
  ): { obj: Physicable; offs: Victor }[] {
    if (radius <= 0)
      throw new Error("Cannot find objects in non-positive radius");

    const baseCompare = radius * radius;

    return this.physicables
      .filter(
        (obj) =>
          obj.phys.pos.clone().subtract(at).lengthSq() <
          baseCompare + obj.phys.size * obj.phys.size,
      )
      .map((obj) => ({
        obj,
        offs: obj.phys.pos.clone().subtract(at),
      }));
  }

  setupNPCs(numNPCs: number) {
    if (this.player?.possessed == null) {
      throw new Error(
        "setupNPCs can only be called when a player ship already exists",
      );
    }

    let toSpawn = numNPCs;
    let radiusBonus = 0;
    let attempts = 0;

    while (toSpawn > 0) {
      if (attempts >= 10) {
        attempts = 0;
        radiusBonus += 50;

        if (radiusBonus > 500) {
          console.warn(
            `Couldn't spawn ${numNPCs.toString()} NPCs; stopped after ${(numNPCs - toSpawn).toString()}`,
          );
          break;
        }
      }

      const squadPos = new Victor(
        Math.sqrt(Math.random()) * (1500 + radiusBonus) + 400 + radiusBonus / 2,
        0,
      ).rotate(Math.random() * Math.PI * 2);

      if (
        squadPos.clone().subtract(this.player.possessed.pos).length() <
        this.player.possessed.size * this.player.possessed.lateralCrossSection +
          800
      ) {
        attempts++;
        continue;
      }

      const squad = this.spawnRandomNPCs(squadPos, radiusBonus);
      toSpawn -= squad.length;
    }
  }

  spawnRandomNPCs(squadPos: Victor, radiusBonus = 0): Ship[] {
    return getRandomSpawnClass().spawnSquad(this, squadPos, {}, radiusBonus);
  }

  spawnEdgeNPCs(): Ship[] {
    return this.spawnRandomNPCs(
      new Victor(Math.max(2000, random.normal(2500, 300)()), 0).rotate(
        Math.random() * Math.PI * 2,
      ),
    );
  }

  startContinuousSpawns(interval = 30) {
    this.stopContinuousSpawns();
    this.continuousSpawnTimer = this.game.setInterval(
      () => this.spawnEdgeNPCs(),
      interval * 1000,
    );
  }

  stopContinuousSpawns() {
    if (this.continuousSpawnTimer !== null) {
      this.game.clearInterval(this.continuousSpawnTimer);
      this.continuousSpawnTimer = null;
    }
  }

  spawnDecor() {
    if (this.terrain == null) {
      return;
    }

    // WIP: better num. decor to spawn
    for (let _ = 0; _ < 10000; _++) {
      const terrainWidth = 8000; // WIP: better max decor spawn radius

      const dpos = new Victor(
        Math.sqrt(Math.random() * terrainWidth * terrainWidth),
        0,
      ).rotateBy(Math.random() * Math.PI * 2);

      if (this.terrain.heightAt(dpos.x, dpos.y) < this.waterLevel) {
        continue;
      }

      this.makeNewDecor(dpos);
    }
  }

  makeNewDecor(pos: Victor) {
    this.spawn(Decor, pos, {});
  }

  spawnPlayerFleet() {
    const player = this.player;

    if (player == null) {
      throw new Error(
        "Called spawnPlayerFleet while superstate player is null",
      );
    }

    if (player.possessed !== null) {
      this.removeObj(player.possessed);
    }

    const pos = new Victor(1600, 0).rotateBy(Math.PI * 2 * Math.random());

    let playerShip: Ship | null = null;

    const addShip = (
      money: number,
      makeup: ShipMakeup,
      offs: Victor | null = null,
    ): Ship => {
      let spawnPos = pos;
      if (offs != null) spawnPos = spawnPos.clone().add(offs);

      const ship = this.makeShip(spawnPos, {
        money: money,
        makeup: makeup,
        angle: pos.clone().invert().angle(),
      });
      ship.vel = new Victor(ship.maxEngineThrust() / ship.weight, 0).rotateBy(
        ship.angle,
      );

      if (playerShip != null) {
        ship.follow(playerShip);
        this.makeAIFor(ship);
      }

      return ship;
    };

    let money = player.money;
    playerShip = player.possessed = addShip(money / 2, player.makeup);
    const member = player.fleet.find(
      (member) => member.makeup === player.makeup,
    );
    if (member != null) {
      member.ship = playerShip;
    } else {
      console.warn(
        "Could not find the player fleet member to register spawned player ship",
      );
    }
    const ships = [playerShip];

    if (player.fleet.filter((s) => s.makeup.captain != null).length > 0) {
      money /= 2;
      const moneyPart =
        money / player.fleet.filter((s) => s.makeup.captain != null).length;

      for (const member of player.fleet) {
        if (member.makeup.captain == null) {
          continue;
        }
        const offs = new Victor(
          playerShip.size * playerShip.lateralCrossSection * 2 +
            random.uniform(30, 200)(),
          0,
        ).rotateBy(Math.PI * Math.random() * 2);

        const ship = addShip(moneyPart, member.makeup, offs);
        ships.push(ship);
        member.ship = ship;
      }
    }

    this.reloadSoundEngine();
    player.updateMoneyFromFleet();
    this.updateCameraPos(0);

    return ships;
  }

  removeObj(toRemove: Tickable | Renderable | { phys: PhysicsObject }) {
    const it = this.tickables.indexOf(toRemove as Tickable);
    const ir = this.renderables.indexOf(toRemove as Renderable);
    const ip = this.physicables.indexOf(toRemove as Physicable);
    const io = this.allObjects.indexOf(toRemove as GameObject);

    if (it !== -1) {
      this.tickables.splice(it, 1);
    }

    if (ir !== -1) {
      this.renderables.splice(it, 1);
    }

    if (ip !== -1) {
      this.physicables.splice(ip, 1);
    }

    if (io !== -1) {
      this.allObjects.splice(io, 1);
    }

    if ((toRemove as { phys: PhysicsObject | Nullish }).phys != null) {
      this.physics.removePhysObj((toRemove as { phys: PhysicsObject }).phys);
    }
  }

  get width() {
    return this.game.width;
  }

  get height() {
    return this.game.height;
  }

  makeShip(pos: Victor, params?: Partial<ShipParams>) {
    const res = new Ship(this.game, pos, params);
    this.addShip(res);
    return res;
  }

  makeAIFor(ship: Ship) {
    const res = new AIController(this, ship);
    this.addAI(res);
    return res;
  }

  get waterLevel() {
    return 0.1;
  }

  tickTickables(deltaTime: number) {
    this.tickables.forEach((obj) => {
      if (obj.dying) {
        return;
      }
      obj.tick(deltaTime);
    });
  }

  private pruneDestroyedTickables() {
    this.tickables = this.tickables.filter((t) => !t.dying);
  }

  private pruneDestroyedPhysicables() {
    this.physicables = this.physicables.filter((p) => !p.dying);
  }

  private pruneDestroyedAllObjects() {
    this.allObjects = this.allObjects.filter((o) => !o.dying);
  }

  private updateCameraPos(deltaTime: number) {
    if (deltaTime == 0) {
      // Instant reset
      this.currCameraPos = this.targetCameraPos();
    } else {
      // Smooth update
      this.currCameraPos.add(
        this.targetCameraPos()
          .subtract(this.currCameraPos)
          .multiplyScalar(1 - Math.pow(1 - this.cameraScrollSpeed, deltaTime)),
      );
    }
  }

  public cameraPos(): Victor {
    return this.currCameraPos;
  }

  public targetCameraPos(): Victor {
    if (this.player?.possessed != null) {
      return this.player.possessed.pos.clone();
    } else {
      return new Victor(0, 0);
    }
  }

  makePhysObj(pos: Victor, params?: Partial<PhysicsParams>) {
    return this.physics.makePhysObj(pos, params);
  }

  render() {
    this.renderer.render();
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    if (!this.game.paused) {
      this.physics.tick(deltaTime);
      this.tickTickables(deltaTime);
      this.pruneDestroyedTickables();
      this.pruneDestroyedPhysicables();
      this.pruneDestroyedAllObjects();
      this.updateCameraPos(deltaTime);
      this.now += deltaTime;
    }
    this.renderer.tick(deltaTime);
    if (this.sfx != null) {
      this.sfx.update();
    }
  }

  spawnCannonball(ship: Ship, params?: Partial<CannonballParams>) {
    if (params == null) params = {};
    if (params.speed == null) params.speed = 2;
    if (params.angle == null) params.angle = ship.angle;
    if (params.vel == null)
      params.vel = new Victor(params.speed, 0)
        .rotateBy(params.angle)
        .add(ship.vel);
    if (params.size == null) params.size = 3.5;
    if (params.vspeed == null) params.vspeed = 2;
    if (params.height == null)
      params.height = ship.height + ship.size * 0.01 + 0.2;
    if (params.buoyancy == null) params.buoyancy = 0;

    const cball = new Cannonball(this, ship, params);
    this.tickables.push(cball);
    this.renderables.push(cball);
    this.physicables.push(cball);
    this.allObjects.push(cball);
    return cball;
  }

  setTerrain(terrain: Terrain) {
    this.terrain = terrain;
  }

  heightAt(x: number, y: number) {
    // from 0 to 1
    if (this.terrain == null) {
      return 0;
    } else {
      return this.terrain.heightAt(x, y);
    }
  }

  addAI(ai: AIController) {
    this.tickables.push(ai);
  }

  spawn<A extends Tickable & Renderable & Physicable, P extends PhysicsParams>(
    objType: new (play: PlayState, pos: Victor, params?: Partial<P>) => A,
    pos: Victor,
    params: Partial<P>,
  ): A {
    const res = new objType(this, pos, params);
    this.tickables.push(res);
    this.renderables.push(res);
    this.physicables.push(res);
    this.allObjects.push(res);
    return res;
  }

  override init() {
    this.game.setMouseHandler(PlayMouseHandler);
    this.game.setKeyboardHandler(PlayKeyHandler);

    if (this.player?.possessed != null) {
      this.addShip(this.player.possessed);
      this.updateCameraPos(0);
    }

    // WIP: add other gamemodes beside Free Play
    console.log("Selected gamemode would be " + this.game.gamemode);

    this.startContinuousSpawns();

    this.addTickerMessage(
      {
        message: i18next.t("hud.startDay", { day: this.game.difficulty + 1 }),
        color: "#FF9",
        scale: 1.5,
      },
      30,
    );
  }

  override deinit() {
    this.stopContinuousSpawns();
  }

  spawnArgs<A, T extends Tickable & Renderable & Physicable>(
    objType: new (play: PlayState, ...args: A[]) => T,
    ...args: A[]
  ): T {
    const res = new objType(this, ...args);
    this.tickables.push(res);
    this.renderables.push(res);
    this.physicables.push(res);
    this.allObjects.push(res);
    return res;
  }
}
