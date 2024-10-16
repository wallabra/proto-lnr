import type { Superstate } from "./superstates/base";
import { Player } from "./player";
import type { InputEvent } from "./player";
import type { TerraDef } from "./terrain";
import { landfillGenerator } from "./terrain";
import { PlayState } from "./superstates/play";
import type { MouseHandler } from "./mouse";
import type { KeyHandler } from "./keyinput";
import random from "random";
import { MainMenuState } from "./superstates/start";

const DEFAULT_GAMEMODE = "freeplay";

interface Callback {
  (): void;
}

interface CallbackRegister {
  when: number;
  interval: number;
  callback: Callback;
  id: number;
}

class IntervalLoop {
  private nextCallbacks: CallbackRegister[] = [];
  private idCounter: number = 0;
  private timeCounter: number = 0;

  private sortCallbacks() {
    this.nextCallbacks = this.nextCallbacks.sort((a) => a.when);
  }

  public now(): number {
    return this.timeCounter;
  }

  private bumpCallback(reg: CallbackRegister): CallbackRegister {
    return {
      ...reg,
      when:
        reg.when +
        reg.interval * Math.ceil((this.now() - reg.when) / reg.interval),
    };
  }

  public setInterval(
    callback: Callback,
    interval: number,
    immediateCallback: boolean = false,
  ): number {
    const id = this.idCounter;

    this.nextCallbacks.push({
      id,
      interval,
      callback,
      when: this.timeCounter + interval,
    });
    this.idCounter++;

    if (immediateCallback) {
      callback();
    }

    return id;
  }

  public clearInterval(id: number): void {
    this.nextCallbacks = this.nextCallbacks.filter((reg) => reg.id !== id);
  }

  public clearAllIntervals() {
    this.nextCallbacks = [];
  }

  private checkExecute(): void {
    const now = this.now();
    for (const reg of this.nextCallbacks) {
      if (reg.when > now) break;

      reg.callback();
      this.nextCallbacks.shift();
      this.nextCallbacks.push(this.bumpCallback(reg));
    }
    this.sortCallbacks();
  }

  public tick(deltaTime: number): void {
    this.timeCounter += deltaTime;
    this.checkExecute();
  }
}

export class Game {
  canvas: HTMLCanvasElement;
  drawCtx: CanvasRenderingContext2D;
  player: Player | null;
  state: Superstate;
  zoom: number;
  mouse: MouseHandler | null;
  keyboard: KeyHandler | null;
  intervalLoop: IntervalLoop;
  gamemode: string = DEFAULT_GAMEMODE;
  paused = false;

  /** Difficulty level. Starts at zero.
   *
   * Multiplies (by 1+x) the number of ships spawned as well as how well
   * equipped they tend to be.
   */
  difficulty = 0;

  /** Difficulty progression, per day. */
  prog_difficulty = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.player = null;
    const ctx = canvas.getContext("2d");
    if (ctx == null)
      throw new Error("Couldn't get a drawing context from the game canvas!");
    this.drawCtx = ctx;
    this.zoom = 2000;
    this.setState(MainMenuState);
    this.intervalLoop = new IntervalLoop();
  }

  modifyNpcCount(npcs: number): number {
    return npcs * (1 + this.difficulty * 0.4);
  }

  restart(
    gamemode: string = DEFAULT_GAMEMODE,
    terradef: TerraDef = landfillGenerator(),
  ) {
    this.gamemode = gamemode;
    this.difficulty = 0;
    this.setPlayState(terradef);
    this.resetPlayer();
    this.setupPlayerFleet();
    this.setupNPCs();
    this.spawnDecor();
  }

  nextLevel(terradef: TerraDef = landfillGenerator()) {
    this.difficulty += this.prog_difficulty;
    this.setPlayState(terradef);
    this.setupPlayerFleet();
    this.setupNPCs();
    this.spawnDecor();
  }

  resetPlayer() {
    this.player = new Player(this);
    if (this.state instanceof PlayState) this.state.reloadSoundEngine();
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

  setState<T extends Superstate, A>(
    stateType: new (game: Game, ...args: A[]) => T,
    ...args: A[]
  ): T {
    if ((this.state as Superstate | undefined) != null) this.state.deinit();
    this.intervalLoop.clearAllIntervals();

    const res = new stateType(this, ...args);
    this.state = res;
    res.init();
    return res;
  }

  inputHandler(name: string, event: InputEvent) {
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
    const largeEdge = Math.max(this.width, this.height);
    return largeEdge / this.zoom;
  }

  setPlayState(terraDef: TerraDef) {
    const play = this.setState(PlayState, terraDef);
    return play;
  }

  setupPlayerFleet() {
    const play = this.state as PlayState;
    play.spawnPlayerFleet();
  }

  spawnDecor() {
    (this.state as PlayState).spawnDecor();
  }

  setupNPCs(numNPCs: number | null = null) {
    (this.state as PlayState).setupNPCs(
      Math.round(this.modifyNpcCount(numNPCs ?? random.uniformInt(30, 60)())),
    );
  }

  tickPlayer(deltaTime: number) {
    if (this.player != null) {
      this.player.tick(deltaTime);
    }
  }

  /// Order of tick operations
  tick(deltaTime: number) {
    if (!this.paused) {
      this.tickPlayer(deltaTime);
      if (this.keyboard != null) this.keyboard.tick();
      this.intervalLoop.tick(deltaTime);
    }
    this.state.tick(deltaTime);
  }

  render() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.state.render();
  }

  public setInterval(
    callback: Callback,
    interval: number,
    immediateCallback: boolean = false,
  ): number {
    return this.intervalLoop.setInterval(callback, interval, immediateCallback);
  }

  public clearInterval(id: number): void {
    this.intervalLoop.clearInterval(id);
  }
}
