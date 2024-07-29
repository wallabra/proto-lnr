import Vec2 from "victor";
import { Howl, Howler } from "howler";

const audioCache: { [name: string]: Howl } = {};

import s_engine_coal from "data-url:./sound/engine_coal.opus";
import s_engine_diesel from "data-url:./sound/engine_diesel.opus";
import s_impactblast from "data-url:./sound/impactblast.opus";
import s_pickup from "data-url:./sound/pickup.opus";
import s_shotbase from "data-url:./sound/shotbase.opus";
import s_shotbigness from "data-url:./sound/shotbigness.opus";
import s_waterimpact from "data-url:./sound/waterimpact.opus";

export const ALL_EFFECTS: { [name: string]: string } = {
  engine_coal: s_engine_coal,
  engine_diesel: s_engine_diesel,
  impactblast: s_impactblast,
  pickup: s_pickup,
  shotbase: s_shotbase,
  shotbigness: s_shotbigness,
  waterimpact: s_waterimpact,
};

function loadAudio(name: string, data: string = null): Howl {
  if (audioCache[name] != null) {
    return audioCache[name];
  }
  const audio = new Howl({ src: [data] });
  audioCache[name] = audio;
  return audio;
}

// preload SFX
for (const effect in Object.keys(ALL_EFFECTS)) {
  loadAudio(effect, ALL_EFFECTS[effect]);
}

export interface SoundObject {
  pos: Vec2;
  angle: number;
}

class SoundSource {
  private engine: SoundEngine;
  private from: SoundObject;
  private soundSrc: Howl;
  private soundId: number;
  private finished: boolean = false;

  constructor(from: SoundObject, src: Howl, volume: number = 1.0) {
    this.from = from;
    this.soundSrc = src;
    const soundId = (this.soundId = src.play());
    src.once(
      "play",
      () => {
        src.volume(volume, soundId);
        this.update();
        src.pannerAttr(
          {
            panningModel: "HRTF",
          },
          soundId,
        );
      },
      soundId,
    );
    src.on("end", () => (this.finished = true), soundId);
  }

  public update() {
    const { from, soundSrc, soundId } = this;
    soundSrc.pos(from.pos.x, 0, from.pos.y, soundId);
  }

  public isDone() {
    // WIP: return true when sound is finished playing
    return false;
  }
}

export class SoundEngine {
  public perspective: SoundObject;
  private sources: SoundSource[];

  constructor(perspective: SoundObject) {
    this.perspective = perspective;
    this.sources = [];
    this.update();
  }

  play(from: SoundObject, name: string, volume: number = 1.0) {
    const src = loadAudio(name);
    this.sources.push(new SoundSource(from, src, volume));
  }

  private updatePerspective() {
    const persp = this.perspective;
    const dx = Math.cos(persp.angle);
    const dy = Math.sin(persp.angle);
    Howler.orientation(dx, 0, dy);
    Howler.pos(persp.pos.x, persp.pos.y, 0);
  }

  private cullSources() {
    this.sources = this.sources.filter((s) => !s.isDone());
  }

  private updateSources() {
    for (const source of this.sources) {
      source.update();
    }
  }

  public update() {
    this.updatePerspective();
    this.cullSources();
    this.updateSources();
  }
}
