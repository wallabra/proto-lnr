import Vec2 from "victor";
import Superstate from "./superstates/base";
import { Player } from "./player";
import { TerraDef, defPlaceholder } from "./terrain";
import { PlayState } from "./superstates/play";
import MouseHandler from "./mouse";
import { KeyHandler } from "./keyinput";
import randomParts from "./shop/randomparts";
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
    const ctx = canvas.getContext("2d");
    if (ctx == null)
      throw new Error("Couldn't get a drawing context from the game canvas!");
    this.drawCtx = ctx;
    this.zoom = 1000;
    this.restart();
  }

  restart() {
    const play = (this.state = this.setState(PlayState, defPlaceholder));
    this.resetPlayer();
    play.resetPlayerShip();
    this.nextLevel();
  }

  resetPlayer() {
    if (!(this.state instanceof PlayState)) return;

    this.player = new Player(
      this,
      (this.state as PlayState).makeShip(new Vec2(0, 0), { makeup: "default" }),
    );
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

  nextLevel(
    terraDef: TerraDef = defPlaceholder,
    numNPCs: number | null = null,
  ) {
    if (numNPCs == null) numNPCs = random.uniformInt(25, 70)();

    const play = this.setState(PlayState, terraDef);
    let toSpawn = numNPCs;
    play.resetPlayerShip();

    while (toSpawn > 0) {
      let leader: Ship = null;
      let squadSize = Math.ceil(0.8 + random.exponential(2)());
      const squadPos = new Vec2(Math.random() * 1500 + 400, 0).rotateBy(
        Math.random() * Math.PI * 2,
      );
      if (
        squadPos.clone().subtract(play.player.possessed.pos).length() <
        play.player.possessed.size * play.player.possessed.lateralCrossSection +
          800
      ) {
        continue;
      }
      while (squadSize) {
        const aiship = play.makeShip(
          new Vec2(random.uniform(100, 400)(), 0)
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
          continue;
        }
        if (aiship.floor > play.waterLevel * 0.5) {
          aiship.die();
          continue;
        }
        const parts = randomParts(
          Math.max(
            2.5,
            3.5 + random.exponential(1.5)() * (leader == null ? 15 : 6),
          ) * random.uniform(1, aiship.makeup.make.slots.length)(),
          aiship.makeup.make,
        );
        for (const part of parts) {
          aiship.makeup.addPart(part);
          aiship.makeup.inventory.addItem(part);
          aiship.makeup.addDefaultDependencies(part);
        }
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
