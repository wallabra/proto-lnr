import { ObjectRenderInfo, Renderable } from "../../render";
import { PlayState, Tickable } from "../../superstates/play";
import { PhysicsObject, PhysicsParams } from "../physics";
import rwc from "random-weighted-choice";
import Vec2 from "victor";

export interface DecorArgs extends Partial<PhysicsParams> {
  sprite?: string;
  drawScale?: number;
}

import SPRITE_GRASS from "data-url:../../sprites/grass.png";
import SPRITE_ROCK from "data-url:../../sprites/rock.png";
import SPRITE_FLAG from "data-url:../../sprites/flag.png";

const SPRITES = {
  "grass.png": { src: SPRITE_GRASS, angleRandom: true },
  "rock.png": { src: SPRITE_ROCK, angleRandom: true },
  "flag.png": { src: SPRITE_FLAG, angleRandom: true },
};

const SPRITE_CACHE: Map<string, HTMLImageElement> = new Map();

function randomDecor(): string {
  return rwc(
    [
      ["grass.png", 1],
      ["rock.png", 1 / 8],
      ["flag.png", 1 / 30],
    ].map(([id, weight]) => ({ id, weight })),
  );
}

export class Decor implements Renderable, Tickable {
  phys: PhysicsObject;
  play: PlayState;
  dying: boolean;
  drawScale: number;
  spritePath: string;
  sprite: HTMLImageElement;
  args: DecorArgs | undefined;

  constructor(play: PlayState, pos: Vec2, args: DecorArgs) {
    this.play = play;
    this.drawScale = args.drawScale ??= 0.5;
    this.spritePath = args.sprite ??= randomDecor();
    this.args = args;
    if (args.angle == null) args.angle = Math.random() * Math.PI * 2;
    this.preloadSprite();
    delete this.args;
    this.phys = play.makePhysObj(pos, args);
    this.phys.frozen = true;
  }

  private preloadSprite() {
    const { spritePath } = this;

    if (SPRITE_CACHE.has(spritePath)) {
      this.sprite = SPRITE_CACHE.get(spritePath);
      return;
    }

    const sprite = document.createElement("img") as HTMLImageElement;
    const def = SPRITES[spritePath];
    sprite.src = def.src;
    if (def.angleRandom) this.args.angle ??= Math.random() * Math.PI * 2;
    //console.log(sprite.src);
    SPRITE_CACHE.set(spritePath, sprite);
    this.sprite = sprite;
  }

  render(info: ObjectRenderInfo): void {
    if (
      this.sprite == null ||
      !this.sprite.complete ||
      !this.phys.isVisible(info)
    )
      return;

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
      console.warn(`Can't draw sprite ${this.spritePath}: ${e}`);
      this.dying = true;
      ctx.restore();
      return;
    }
    //ctx.strokeStyle = 'red';
    //ctx.lineWidth = 2;
    //ctx.arc(0, 0, 10, 0, Math.PI * 2);

    ctx.stroke();
    ctx.restore();
  }

  tick(_deltaTime: number): void {}
}
