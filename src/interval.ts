export interface Callback {
  (): void;
}

export interface CallbackRegister {
  when: number;
  interval: number;
  callback: Callback;
  id: number;
}

export class IntervalLoop {
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
