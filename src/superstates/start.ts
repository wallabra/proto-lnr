import { Superstate } from "./base";
import {
  CanvasButton,
  CanvasButtonArgs,
  CanvasLabel,
  CanvasLabelArgs,
  CanvasRoot,
  CanvasUIElement,
  CanvasUIGroup,
  UIDrawContext,
  UIEvent,
} from "../ui";
import { GUIMouseHandler } from "../mouse";
import type { GameMouseInfo } from "../mouse";
import { GUIKeyHandler } from "../keyinput";
import { GAME_VERSION } from "../info";

export class MainMenuState extends Superstate {
  ui: CanvasRoot;
  states: Map<string, CanvasUIElement> = new Map();
  stateStack: string[] = [];

  private setState(stateName: string) {
    // Does NOT update the stack, do not use this in user code
    const state = this.states.get(stateName);
    if (state == null) return;

    this.ui.clearChildren();
    this.ui.addChild(state);
  }

  private switchState(stateName: string) {
    // DOES update the stack :)
    this.setState(stateName);
    this.stateStack.unshift(stateName);
  }

  private goBackState() {
    if (this.stateStack.length < 2) return;
    this.stateStack.shift();

    const target = this.stateStack[0];
    this.setState(target);
  }

  private addState(stateName: string, state: CanvasUIElement) {
    this.states.set(stateName, state);
  }

  private buildState(
    stateName: string,
    stateBuilder: (holder: CanvasUIGroup) => CanvasUIElement | null,
  ) {
    const holder = new CanvasUIGroup({
      parent: null,
      fillX: true,
      fillY: true,
    });
    this.addState(stateName, stateBuilder(holder) ?? holder);
  }

  private buildStates() {
    const buttonArgs: Partial<CanvasButtonArgs> = {
      fillX: 0.5,
      dockX: "center",
      childMargin: 10,
      childOrdering: "vertical",
      childFill: 0.05,
      bgColor: "#555",
      height: 80,
    };

    const buttonLabelArgs: Partial<CanvasLabelArgs> = {
      fillY: 0.5,
      autoFont: true,
      font: "%Hpx bold sans-serif",
      color: "#fff",
    };

    const addBackButton = (holder: CanvasUIGroup) => {
      new CanvasButton({
        parent: holder,
        dockX: "start",
        dockY: "start",
        dockMarginX: 16,
        dockMarginY: 10,
        height: 40,
        width: 40,
        bgColor: "#0000",
        callback: () => {
          this.goBackState();
        },
      }).label("\u2190", {
        color: "#FFF",
        font: "$Hpx bold sans-serif",
        fillY: 0.9,
      });
    };

    this.buildState("top", (holder: CanvasUIGroup) => {
      new CanvasLabel({
        // title
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 50,
        childOrdering: "vertical",
        childFill: 0.15,
        maxHeight: 80,
        label: "Loot & Roam",
        autoFont: true,
        font: "$Hpx bold serif",
        color: "#fed", // ong fed! :v
      });

      new CanvasLabel({
        // subtitle
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 25,
        childOrdering: "vertical",
        childFill: 0.08,
        maxHeight: 50,
        label: "Prototype v" + GAME_VERSION,
        color: "#AAD",
        autoFont: true,
        font: "$Hpx bold serif",
      });

      const newGameButton = new CanvasButton({
        ...buttonArgs,
        parent: holder,
        callback: () => {
          this.switchState("new game");
        },
      });
      newGameButton.label("New Game", { ...buttonLabelArgs });

      return null;
    });

    this.buildState("new game", (holder: CanvasUIGroup) => {
      addBackButton(holder);

      new CanvasLabel({
        // new game menu label
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 50,
        childOrdering: "vertical",
        childFill: 0.1,
        maxHeight: 65,
        label: "New Game",
        autoFont: true,
        font: "$Hpx bold serif",
        color: "#fff",
      });

      new CanvasLabel({
        // 'Select a Game Mode'
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 30,
        childOrdering: "vertical",
        childFill: 0.04,
        maxHeight: 35,
        label: "Select a Game Mode",
        autoFont: true,
        font: "$Hpx sans-serif",
        color: "#ddd",
      });

      new CanvasButton({
        // free play mode button
        ...buttonArgs,
        parent: holder,
        callback: () => {
          this.a_newGame("freeplay");
        },
      }).label("Free Play", { ...buttonLabelArgs });

      new CanvasLabel({
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 20,
        childOrdering: "vertical",
        childFill: 0.02,
        label: "(Other gamemodes coming very soon!)",
        autoFont: true,
        font: "$Hpx serif",
        maxHeight: 16,
        color: "#aaa",
      });

      return null;
    });
  }

  private a_newGame(gamemode: string) {
    this.game.restart(gamemode);
  }

  public init() {
    this.game.setMouseHandler(GUIMouseHandler);
    this.game.setKeyboardHandler(GUIKeyHandler);

    this.ui = new CanvasRoot(this.game, "#00000000");
    this.buildStates();
    this.switchState("top");
  }

  private maximizeUI() {
    this.ui.checkChangeDimensions(this.game.width, this.game.height);
  }

  private backgroundCounter = 0;

  private renderBackground(ctx: UIDrawContext) {
    const dctx = ctx.ctx;
    dctx.fillStyle = "#441878";
    dctx.fillRect(0, 0, this.game.width, this.game.height);

    // Draw balls pattern (hehe balls)
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 200;
    patternCanvas.height = 100;
    const pctx = patternCanvas.getContext("2d");
    if (pctx == null) return;
    pctx.fillStyle = "#AA11C860";
    pctx.beginPath();
    pctx.arc(
      50,
      50 + ((this.backgroundCounter * 50) % 100),
      30,
      0,
      Math.PI * 2,
    );
    pctx.fill();
    pctx.beginPath();
    pctx.arc(
      50,
      -50 + ((this.backgroundCounter * 50) % 100),
      30,
      0,
      Math.PI * 2,
    );
    pctx.fill();
    pctx.beginPath();
    pctx.arc(
      150,
      -100 + ((this.backgroundCounter * 50) % 100),
      30,
      0,
      Math.PI * 2,
    );
    pctx.fill();
    pctx.beginPath();
    pctx.arc(
      150,
      0 + ((this.backgroundCounter * 50) % 100),
      30,
      0,
      Math.PI * 2,
    );
    pctx.fill();
    pctx.beginPath();
    pctx.arc(
      150,
      100 + ((this.backgroundCounter * 50) % 100),
      30,
      0,
      Math.PI * 2,
    );
    pctx.fill();

    const patternFill = dctx.createPattern(patternCanvas, "repeat");
    if (patternFill == null) return;
    dctx.save();
    dctx.fillStyle = patternFill;
    dctx.fillRect(0, 0, this.game.width, this.game.height);
    dctx.restore();
  }

  private tickBackground(deltaTime: number) {
    this.backgroundCounter += deltaTime;
  }

  public render() {
    this.maximizeUI();

    const ctx: UIDrawContext = {
      ctx: this.game.drawCtx,
      game: this.game,
    };

    this.renderBackground(ctx);
    this.ui.checkUpdateCache();
    this.ui.render(ctx);
  }

  public tick(deltaTime: number) {
    this.tickBackground(deltaTime);
  }

  mouseEvent(event: MouseEvent & GameMouseInfo) {
    const uiEvent: UIEvent = Object.assign(event, { consumed: false });

    if (event.inside) event.inside.handleEvent(uiEvent);
    else this.ui.handleEvent(uiEvent);
  }
}
