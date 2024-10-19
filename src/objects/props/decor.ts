import type { ObjectRenderInfo, Renderable } from "../../render";
import type { PlayState, Tickable } from "../../superstates/play";
import type { PhysicsObject, PhysicsParams } from "../physics";
import type { RandomRange } from "../../util";
import { maybeRange, rwc } from "../../util";
import type Victor from "victor";

export interface DecorArgs extends Partial<PhysicsParams> {
  sprite?: string;
  drawScale?: number;
}

import SPRITE_GRASS from "data-url:../../sprites/grass.png";
import SPRITE_ROCK from "data-url:../../sprites/rock.png";
import SPRITE_FLAG from "data-url:../../sprites/flag.png";

const SPRITES: Record<
  string,
  {
    src: string;
    angleRandom: boolean | RandomRange;
    offset?: [number, number];
    drawScale?: number | RandomRange;
  }
> = {
  "grass.png": {
    src: SPRITE_GRASS,
    angleRandom: true,
    drawScale: { min: 0.3, max: 0.9 },
  },
  "rock.png": {
    src: SPRITE_ROCK,
    angleRandom: true,
    drawScale: { min: 0.4, max: 1.7 },
  },
  "flag.png": {
    src: SPRITE_FLAG,
    angleRandom: false,
    offset: [0, 0.5],
    drawScale: { min: 0.3, max: 0.5 },
  },
};

const SPRITE_CACHE = new Map<string, HTMLImageElement>();

function randomDecor(): string {
  return rwc([
    { item: "grass.png", weight: 1 },
    { item: "rock.png", weight: 1 / 8 },
    { item: "flag.png", weight: 1 / 30 },
  ]);
}

export class Decor implements Renderable, Tickable {
  public phys: PhysicsObject;
  protected play: PlayState;
  public dying: boolean;
  protected drawScale: number;
  protected spritePath: string;
  protected sprite: HTMLImageElement;
  protected args: DecorArgs | undefined;
  type = "decor";
  private setSize: boolean;

  constructor(play: PlayState, pos: Victor, args: DecorArgs) {
    this.play = play;
    this.spritePath = args.sprite ??= randomDecor();
    const def = SPRITES[this.spritePath];

    this.drawScale = args.drawScale ??= maybeRange(def.drawScale ?? 0.5);
    this.args = args;
    if (args.angle == null && def.angleRandom)
      args.angle =
        typeof def.angleRandom !== "boolean"
          ? maybeRange(def.angleRandom)
          : Math.random() * Math.PI * 2;
    this.preloadSprite();
    delete this.args;
    this.phys = play.makePhysObj(pos, args);
    this.phys.frozen = true;
  }

  private preloadSprite() {
    const { spritePath } = this;

    const cached = SPRITE_CACHE.get(spritePath);
    if (cached != null) {
      this.sprite = cached;
      return;
    }

    const sprite = document.createElement("img");
    const def = SPRITES[spritePath];
    sprite.src = def.src;

    if (def.angleRandom && this.args !== undefined) {
      this.args.angle ??= Math.random() * Math.PI * 2;
    }

    SPRITE_CACHE.set(spritePath, sprite);
    this.sprite = sprite;
  }

  render(info: ObjectRenderInfo): void {
    if (!this.sprite.complete) return;
    const def = SPRITES[this.spritePath];

    if (!this.phys.isVisible(info)) return;

    const { ctx, scale } = info;
    const { sprite } = this;

    const pos = info.toScreen(this.phys.pos);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(this.phys.angle);
    ctx.scale(scale * this.drawScale, scale * this.drawScale);

    const offScaleX = 0.5 + (def.offset != null ? def.offset[0] : 0);
    const offScaleY = 0.5 + (def.offset != null ? def.offset[1] : 0);

    ctx.imageSmoothingEnabled = false;
    try {
      ctx.drawImage(
        sprite,
        -sprite.width * offScaleX,
        -sprite.height * offScaleY,
      );
    } catch (e) {
      const error: Error = e as Error;
      console.warn(`Can't draw sprite ${this.spritePath}: ${error.toString()}`);
      this.dying = true;
      ctx.restore();
      return;
    }

    ctx.stroke();
    ctx.restore();

    // DEBUG
    // ctx.strokeStyle = '#F00';
    // ctx.lineWidth = 2;
    // ctx.beginPath();
    // ctx.arc(pos.x, pos.y, this.phys.size, 0, Math.PI * 2);
    // ctx.stroke();
    // ctx.strokeStyle = '#0F0';
    // ctx.lineWidth = 1;
    // ctx.beginPath();
    // ctx.arc(pos.x, pos.y, Math.min(sprite.width, sprite.height) * this.drawScale, 0, Math.PI * 2);
    // ctx.stroke();
  }

  tick(_deltaTime: number): void {
    // use Pythagoras to get minimum radius to encircle the rectangular sprite
    if (this.sprite.complete && !this.setSize) {
      const def = SPRITES[this.spritePath];
      this.phys.size = Math.sqrt(
        Math.pow(
          this.sprite.width *
            (0.5 + Math.abs(def.offset != null ? def.offset[0] : 0)) *
            this.drawScale,
          2,
        ) +
          Math.pow(
            this.sprite.height *
              (0.5 + Math.abs(def.offset != null ? def.offset[1] : 0)) *
              this.drawScale,
            2,
          ),
      );
      this.setSize = true;
    }
  }
}
