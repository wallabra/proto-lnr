import Vec2 from "victor";
import Superstate from "./superstates/base";
import { Player } from "./player";
import { TerraDef, defPlaceholder } from "./terrain";
import { PlayState } from "./superstates/play";
import MouseHandler from "./mouse";
import { KeyHandler } from "./keyinput";
import randomParts from "./shop/randomparts";
import random from "random";

export class Game {
  canvas: HTMLCanvasElement;
  drawCtx: CanvasRenderingContext2D;
  player: Player | null;
  state: Superstate;
  zoom: number;
  mouse: MouseHandler;
  keyboard: KeyHandler;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (ctx == null)
      throw new Error("Couldn't get a drawing context from the game canvas!");
    this.drawCtx = ctx;
    this.zoom = 1000;
    const play = (this.state = this.setState(PlayState, defPlaceholder));
    this.player = new Player(
      this,
      play.makeShip(Vec2(0, 0), { makeup: "default" }),
    );
    play.resetPlayerShip();
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

  nextLevel(terraDef: TerraDef = defPlaceholder, numNPCs: number = 40) {
    const play = this.setState(PlayState, terraDef);
    let toSpawn = numNPCs;
    play.resetPlayerShip();

    while (toSpawn > 0) {
      const aiship = play.makeShip(
        Vec2(Math.random() * 1500 + 400, 0).rotateBy(
          Math.random() * Math.PI * 2,
        ),
        { angle: Math.random() * Math.PI * 2, make: "random" },
      );
      if (aiship.floor > play.waterLevel * 0.5) {
        aiship.die();
        continue;
      }
      const parts = randomParts(
        3 + random.exponential(1.5)() * 15,
        aiship.makeup.make,
      );
      for (const part of parts) {
        aiship.makeup.addPart(part);
        aiship.makeup.inventory.addItem(part);
        aiship.makeup.addDefaultDependencies(part);
      }
      play.makeAIFor(aiship);
      //aiship.setInstigator(playerShip);
      toSpawn--;
    }
  }

  tickPlayer(deltaTime: number) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    this.tickPlayer(deltaTime);
    this.state.tick(deltaTime);
  }

  render() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.state.render();
  }
}
