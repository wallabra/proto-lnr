import type { ObjectRenderInfo, Renderable } from "../../render";
import type { PlayState, Tickable } from "../../superstates/play";
import type { PhysicsObject, PhysicsParams } from "../physics";
import { rwc } from "../../util";
import type Victor from "victor";

export interface DecorArgs extends Partial<PhysicsParams> {
  sprite?: string;
  drawScale?: number;
}

import SPRITE_GRASS from "data-url:../../sprites/grass.png";
import SPRITE_ROCK from "data-url:../../sprites/rock.png";
import SPRITE_FLAG from "data-url:../../sprites/flag.png";

const SPRITES: Record<string, { src: string; angleRandom: boolean }> = {
  "grass.png": { src: SPRITE_GRASS, angleRandom: true },
  "rock.png": { src: SPRITE_ROCK, angleRandom: true },
  "flag.png": { src: SPRITE_FLAG, angleRandom: false },
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
  phys: PhysicsObject;
  play: PlayState;
  dying: boolean;
  drawScale: number;
  spritePath: string;
  sprite: HTMLImageElement;
  args: DecorArgs | undefined;
  type = "decor";

  constructor(play: PlayState, pos: Victor, args: DecorArgs) {
    this.play = play;
    this.drawScale = args.drawScale ??= 0.5;
    this.spritePath = args.sprite ??= randomDecor();
    this.args = args;
    if (args.angle == null && SPRITES[this.spritePath].angleRandom) args.angle = Math.random() * Math.PI * 2;
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

    // use Pythagoras to get minimum radius to encircle the rectangular sprite
    this.phys.size = Math.sqrt(Math.pow(this.sprite.width / 2, 2) + Math.pow(this.sprite.height / 2, 2));
    
    if (!this.phys.isVisible(info)) return;

    const { ctx, scale } = info;
    const { sprite } = this;

    const pos = info.toScreen(this.phys.pos);

    ctx.save();
    ctx.translate(pos.x + sprite.width / 2, pos.y + sprite.height / 2);
    ctx.rotate(this.phys.angle);
    ctx.translate(-sprite.width / 2, -sprite.height / 2);
    ctx.scale(scale * this.drawScale, scale * this.drawScale);

    try {
      ctx.drawImage(this.sprite, 0, 0);
    } catch (e) {
      const error: Error = e as Error;
      console.warn(`Can't draw sprite ${this.spritePath}: ${error.toString()}`);
      this.dying = true;
      ctx.restore();
      return;
    }

    ctx.stroke();
    ctx.restore();
  }

  tick(_deltaTime: number): void {}
}
