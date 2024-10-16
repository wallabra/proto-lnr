import { Game } from "../game";

export abstract class Superstate {
  game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  get canvas() {
    return this.game.canvas;
  }

  get drawCtx() {
    return this.game.drawCtx;
  }

  get player() {
    return this.game.player;
  }

  public abstract tick(deltaTime: number): void;
  public abstract render(): void;
  public deinit() {}
  public init() {}
}
