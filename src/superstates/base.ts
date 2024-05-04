import { Game } from "../game";
import { Player } from "../player";

export default abstract class Superstate {
  game: Game;
  canvas: HTMLCanvasElement;
  drawCtx: CanvasRenderingContext2D;
  player: Player | null;

  constructor(game: Game) {
    this.game = game;
    this.canvas = this.game.canvas;
    this.drawCtx = this.game.drawCtx;
    this.player = this.game.player;
  }

  public abstract tick(deltaTime: number);
  public abstract render();
  public abstract init();
}
