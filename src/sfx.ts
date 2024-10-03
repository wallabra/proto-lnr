import Victor from "victor";
import { Howl, Howler } from "howler";

const audioCache: Record<string, Howl> = {};

import s_engine_coal from "data-url:./sound/engine_coal.opus";
import s_engine_diesel from "data-url:./sound/engine_diesel.opus";
import s_impactblast from "data-url:./sound/impactblast.opus";
import s_pickup from "data-url:./sound/pickup.opus";
import s_shotbase from "data-url:./sound/shotbase.opus";
import s_shotbigness from "data-url:./sound/shotbigness.opus";
import s_waterimpact from "data-url:./sound/waterimpact.opus";

export const ALL_EFFECTS: Record<string, string> = {
  engine_coal: s_engine_coal,
  engine_diesel: s_engine_diesel,
  impactblast: s_impactblast,
  pickup: s_pickup,
  shotbase: s_shotbase,
  shotbigness: s_shotbigness,
  waterimpact: s_waterimpact,
};

function loadAudio(name: string): Howl {
  if (name in audioCache) {
    return audioCache[name];
  }
  const audio = new Howl({ src: [decodeURIComponent(ALL_EFFECTS[name])] });
  audio.load();
  audioCache[name] = audio;
  return audio;
}

// preload SFX
function preloader() {
  for (const effect of Object.keys(ALL_EFFECTS)) {
    loadAudio(effect);
  }
  console.log("Audio preloaded");
  document.removeEventListener("click", preloader);
}
// (use click event to mitigate browser warning about user interaction)
document.addEventListener("click", preloader);

export interface SoundObject {
  pos: Victor;
  angle: number;
}

class SoundSource {
  private from: SoundObject;
  private soundSrc: Howl;
  private soundId: number;
  private finished = false;

  constructor(from: SoundObject, src: Howl, volume = 1.0) {
    this.from = from;
    this.soundSrc = src;
    const soundId = (this.soundId = src.play());
    src.volume(volume, soundId);
    this.update();
    src.pannerAttr(
      {
        panningModel: "HRTF",
        rolloffFactor: 0.012,
      },
      soundId,
    );
    src.once("play", () => {}, soundId);
    src.on("end", () => (this.finished = true), soundId);
  }

  public update() {
    const { from, soundSrc, soundId } = this;
    soundSrc.pos(from.pos.x, 0, from.pos.y, soundId);
  }

  public isDone() {
    return this.finished;
  }

  public stop() {
    this.soundSrc.stop(this.soundId);
  }

  public rate(vel: number) {
    this.soundSrc.rate(vel, this.soundId);
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

  play(from: SoundObject, name: string, volume = 1.0) {
    const asrc = loadAudio(name);
    const source = new SoundSource(from, asrc, volume);
    this.sources.push(source);
    return source;
  }

  private updatePerspective() {
    const persp = this.perspective;
    const dx = Math.cos(persp.angle);
    const dy = Math.sin(persp.angle);
    Howler.orientation(dx, 0, dy, 0, 1, 0);
    Howler.pos(persp.pos.x, 0, persp.pos.y);
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
