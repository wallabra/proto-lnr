import Superstate from "./base";
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
import { GUIMouseHandler, GameMouseInfo } from "../mouse";
import { GUIKeyHandler } from "../keyinput";
import { GAME_VERSION } from "../info";
import { Nullish } from "../../node_modules/utility-types/dist/aliases-and-guards";

export default class MainMenuState extends Superstate {
  ui: CanvasRoot;
  states: { [stateName: string]: CanvasUIElement } = {};
  stateStack: string[] = [];

  private switchState(stateName: string) {
    this.ui.clearChildren();
    this.ui.addChild(this.states[stateName]);
    this.stateStack.unshift(stateName);
  }

  private goBackState() {
    this.stateStack.shift();
    const target = this.stateStack[0];
    this.ui.clearChildren();
    this.ui.addChild(this.states[target]);
  }

  private addState(stateName: string, state: CanvasUIElement) {
    this.states[stateName] = state;
  }

  private buildState(
    stateName: string,
    stateBuilder: (holder: CanvasUIGroup) => CanvasUIElement | Nullish | void,
  ) {
    const holder = new CanvasUIGroup({
      parent: null,
      fillX: true,
      fillY: true,
    });
    this.addState(stateName, stateBuilder(holder) || holder);
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
    });
  }

  private a_newGame(_gamemode: string) {
    // WIP: add other gamemodes beside Free Play
    this.game.restart();
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

  private backgroundCounter: number = 0;

  private renderBackground(ctx: UIDrawContext) {
    const dctx = ctx.ctx;
    dctx.fillStyle = "#441878";
    dctx.fillRect(0, 0, this.game.width, this.game.height);

    // Draw balls pattern (hehe balls)
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 200;
    patternCanvas.height = 100;
    const pctx = patternCanvas.getContext("2d");
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
