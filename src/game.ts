import Vec2 from "victor";
import Superstate from "./superstates/base";
import { Player } from "./player";
import { TerraDef, landfillGenerator } from "./terrain";
import { PlayState } from "./superstates/play";
import MouseHandler from "./mouse";
import { KeyHandler } from "./keyinput";
import random from "random";
import { Ship } from "./objects/ship";

export class Game {
  canvas: HTMLCanvasElement;
  drawCtx: CanvasRenderingContext2D;
  player: Player | null;
  state: Superstate;
  zoom: number;
  mouse: MouseHandler;
  keyboard: KeyHandler;
  paused: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.player = null;
    const ctx = canvas.getContext("2d");
    if (ctx == null)
      throw new Error("Couldn't get a drawing context from the game canvas!");
    this.drawCtx = ctx;
    this.zoom = 1000;
    this.restart();
  }

  restart(terradef: TerraDef = landfillGenerator()) {
    this.setPlayState(terradef);
    this.resetPlayer();
    this.setupPlayerFleet();
    this.setupNPCs();
  }

  nextLevel(terradef: TerraDef = landfillGenerator()) {
    this.setPlayState(terradef);
    this.setupPlayerFleet();
    this.setupNPCs();
  }

  resetPlayer() {
    this.player = new Player(
      this,
      (this.state as PlayState).makeShip(new Vec2(0, 0), { makeup: "default" }),
    );
    console.log(this.player);
  }

  togglePaused() {
    this.paused = !this.paused;
  }

  setMouseHandler<M extends MouseHandler>(
    handlerType: new (game: Game) => M,
  ): M {
    if (this.mouse != null) {
      this.mouse.deregister();
    }

    const res = (this.mouse = new handlerType(this));
    res.register();
    return res;
  }

  setKeyboardHandler<K extends KeyHandler>(
    handlerType: new (game: Game) => K,
  ): K {
    if (this.keyboard != null) {
      this.keyboard.deregister();
    }

    const res = (this.keyboard = new handlerType(this));
    res.register();
    return res;
  }

  setState<T extends Superstate>(
    stateType: new (game: Game, ...args) => T,
    ...args
  ): T {
    const res = new stateType(this, ...args);
    this.state = res;
    res.init();
    return res;
  }

  inputHandler(name: string, event) {
    if (name === "RESTART") {
      this.restart();
    }

    if (this.player == null) {
      return;
    }

    this.player.inputEvent(name, event);
  }

  setPlayer(player: Player) {
    this.player = player;
  }

  get width() {
    return this.canvas.getBoundingClientRect().width;
  }

  get height() {
    return this.canvas.getBoundingClientRect().height;
  }

  get drawScale() {
    const smallEdge = Math.min(this.width, this.height);
    return smallEdge / this.zoom;
  }

  setPlayState(terraDef: TerraDef) {
    const play = this.setState(PlayState, terraDef);
    return play;
  }

  setupPlayerFleet() {
    const play = this.state as PlayState;
    play.spawnPlayerFleet();
  }

  setupNPCs(numNPCs: number | null = null) {
    const play = this.state as PlayState;

    if (numNPCs == null) numNPCs = random.uniformInt(25, 90)();

    let toSpawn = numNPCs;
    let radiusBonus = 0;
    let attempts = 0;

    while (toSpawn) {
      if (attempts >= 50) {
        attempts = 0;
        radiusBonus += 50;
      }
      let leader: Ship = null;
      let squadSize = Math.ceil(0.8 + random.exponential(1.7)() * 1.3);
      const squadPos = new Vec2(
        Math.sqrt(Math.random()) * 1500 + 400 + radiusBonus,
        0,
      ).rotateBy(Math.random() * Math.PI * 2);
      if (
        squadPos.clone().subtract(play.player.possessed.pos).length() <
        play.player.possessed.size * play.player.possessed.lateralCrossSection +
          800
      ) {
        attempts++;
        continue;
      }
      while (squadSize && toSpawn) {
        const aiship = play.makeShip(
          new Vec2(100 + 300 * Math.sqrt(Math.random()), 0)
            .rotateBy(Math.random() * Math.PI * 2)
            .add(squadPos),
          {
            angle: Math.random() * Math.PI * 2,
            make: leader != null ? leader.makeup.make : "random",
          },
        );
        if (
          aiship.pos.clone().subtract(play.player.possessed.pos).length() <
          aiship.size * aiship.lateralCrossSection +
            play.player.possessed.size *
              play.player.possessed.lateralCrossSection +
            600
        ) {
          aiship.die();
          attempts++;
          continue;
        }
        if (aiship.floor > play.waterLevel * 0.5) {
          aiship.die();
          attempts++;
          continue;
        }
        aiship.makeup.giveRandomParts(+(leader == null) * 9);
        play.makeAIFor(aiship);
        if (leader == null) {
          leader = aiship;
        } else {
          aiship.follow(leader);
        }
        toSpawn--;
        squadSize--;
        //-- fun mode 1: instant shower of death
        //aiship.aggro(play.player.possessed);
        //-- fun mode 2: everyone loves you & protects you to death
        //if (Math.random() < 0.3 && aiship.makeup.nextReadyCannon != null) {
        //  aiship.follow(play.player.possessed);
        //}
      }
    }
  }

  tickPlayer(deltaTime: number) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    if (this.paused) return;
    this.tickPlayer(deltaTime);
    this.keyboard.tick();
    this.state.tick(deltaTime);
  }

  render() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.state.render();
  }
}
