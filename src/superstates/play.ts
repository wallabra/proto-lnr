import { Cannonball } from "../objects/cannonball";
import type { CannonballParams } from "../objects/cannonball";
import { Ship } from "../objects/ship";
import type { ShipParams } from "../objects/ship";
import { PhysicsSimulation } from "../objects/physics";
import type { PhysicsParams, PhysicsObject } from "../objects/physics";
import { Terrain } from "../terrain";
import type { TerraDef } from "../terrain";
import { Superstate } from "./base";
import Victor from "victor";
import { AIController } from "../ai/ai";
import { GameRenderer } from "../render";
import type { Renderable } from "../render";
import type { Game } from "../game";
import { PlayMouseHandler } from "../mouse";
import { PlayKeyHandler } from "../keyinput";
import random from "random";
import type { ShipMakeup } from "../objects/shipmakeup";
import { SoundEngine } from "../sfx";
import { Decor } from "../objects/props/decor";
import type { Nullish } from "utility-types";

export interface Tickable {
  tick: (deltaTime: number) => void;
  dying: boolean;
  type: string;
}

export interface Physicable {
  phys: PhysicsObject;
}

export class PlayState extends Superstate {
  terrain: Terrain | null;
  tickables: Tickable[];
  renderables: Renderable[];
  renderer: GameRenderer;
  physics: PhysicsSimulation;
  public sfx: SoundEngine | null;

  constructor(game: Game, terraDef: TerraDef) {
    super(game);
    this.physics = new PhysicsSimulation(this);
    this.setTerrain(new Terrain(terraDef));
    this.tickables = [];
    this.renderables = [];
    this.renderer = new GameRenderer(this);
    this.reloadSoundEngine();
  }

  reloadSoundEngine() {
    if (this.player == null || this.player.possessed == null) {
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
  }

  setupNPCs(numNPCs: number) {
    if (this.player == null || this.player.possessed == null) {
      throw new Error(
        "setupNPCs can only be called when a player ship already exists",
      );
    }

    let toSpawn = numNPCs;
    let radiusBonus = 0;
    let attempts = 0;

    while (toSpawn) {
      if (attempts >= 50) {
        attempts = 0;
        radiusBonus += 50;
      }
      let leader: Ship | null = null;
      let squadSize = Math.max(
        1,
        Math.ceil(0.3 + random.exponential(1.7)() * 1.3) *
          (1 + this.game.difficulty / 3),
      );
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
      while (squadSize && toSpawn) {
        const aiship = this.makeShip(
          new Victor(100 + 300 * Math.sqrt(Math.random()), 0)
            .rotateBy(Math.random() * Math.PI * 2)
            .add(squadPos),
          {
            angle: Math.random() * Math.PI * 2,
            make: leader != null ? leader.makeup.make : "random",
          },
        );
        if (
          aiship.pos.clone().subtract(this.player.possessed.pos).length() <
          aiship.size * aiship.lateralCrossSection +
            this.player.possessed.size *
              this.player.possessed.lateralCrossSection +
            600
        ) {
          aiship.die();
          attempts++;
          continue;
        }
        if (aiship.floor > this.waterLevel * 0.5) {
          aiship.die();
          attempts++;
          continue;
        }
        aiship.makeup.giveRandomParts(
          +(leader == null) * (9 + this.game.difficulty * 3) +
            this.game.difficulty * 2,
        );
        this.makeAIFor(aiship);
        if (leader == null) {
          leader = aiship;
        } else {
          aiship.follow(leader);
        }
        toSpawn--;
        squadSize--;
        //-- fun mode 1: instant shower of death
        //aiship.aggro(this.player.possessed);
        //-- fun mode 2: everyone loves you & protects you to death
        //if (Math.random() < 0.3 && aiship.makeup.nextReadyCannon != null) {
        //  aiship.follow(this.player.possessed);
        //}
      }
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
    console.log("Player position:", pos);

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

    return ships;
  }

  removeObj(toRemove: Tickable | Renderable | { phys: PhysicsObject }) {
    const it = this.tickables.indexOf(toRemove as Tickable);
    const ir = this.renderables.indexOf(toRemove as Renderable);

    if (it !== -1) {
      this.tickables.splice(it, 1);
    }

    if (ir !== -1) {
      this.renderables.splice(it, 1);
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

  pruneDestroyedTickables() {
    this.tickables = this.tickables.filter((t) => !t.dying);
  }

  public cameraPos(): Victor {
    if (this.player != null && this.player.possessed != null) {
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
    if (params.height == null) params.height = ship.height + 0.2;
    if (params.buoyancy == null) params.buoyancy = 0;

    const cball = new Cannonball(this, ship, params);
    this.tickables.push(cball);
    this.renderables.push(cball);
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

  spawn<A extends Tickable & Renderable, P extends PhysicsParams>(
    objType: new (play: PlayState, pos: Victor, params?: Partial<P>) => A,
    pos: Victor,
    params: Partial<P>,
  ): A {
    const res = new objType(this, pos, params);
    this.tickables.push(res);
    this.renderables.push(res);
    return res;
  }

  init() {
    this.game.setMouseHandler(PlayMouseHandler);
    this.game.setKeyboardHandler(PlayKeyHandler);

    if (this.player != null && this.player.possessed != null) {
      this.addShip(this.player.possessed);
    }

    // WIP: add other gamemodes beside Free Play
    console.log("Selected gamemode would be " + this.game.gamemode);
  }

  spawnArgs<A, T extends Tickable & Renderable>(
    objType: new (play: PlayState, ...args: A[]) => T,
    ...args: A[]
  ): T {
    const res = new objType(this, ...args);
    this.tickables.push(res);
    this.renderables.push(res);
    return res;
  }
}
