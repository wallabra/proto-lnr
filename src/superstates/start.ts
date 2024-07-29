import Superstate from "./base";
import {
  CanvasButton,
  CanvasLabel,
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

  private switchState(stateName: keyof MainMenuState["states"]) {
    this.ui.clearChildren();
    this.ui.addChild(this.states[stateName]);
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
    const buttonArgs = {
      fillX: 0.5,
      dockX: "center",
      childMargin: 10,
      childOrdering: "vertical",
      childFill: 0.05,
      bgColor: "#555",
      height: 80,
    };

    const buttonLabelArgs = {
      fillY: 0.5,
      fillX: 0.8,
      autoFont: true,
      font: "%Hpx bold sans-serif",
      color: "#fff",
    };

    this.buildState("top", (holder: CanvasUIGroup) => {
      new CanvasLabel({
        // title
        parent: holder,
        fillX: 0.6,
        dockX: "center",
        childMargin: 50,
        childOrdering: "vertical",
        childFill: 0.15,
        label: "Loot & Roam",
        color: "#AAF",
        autoFont: true,
        font: "$Hpx bold serif",
      });

      new CanvasLabel({
        // subtitle
        parent: holder,
        fillX: 0.5,
        dockX: "center",
        childMargin: 25,
        childOrdering: "vertical",
        childFill: 0.08,
        label: "Prototype v" + GAME_VERSION,
        color: "#77A",
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
      new CanvasLabel({
        // new game menu label
        parent: holder,
        fillX: 0.5,
        dockX: "center",
        childMargin: 50,
        childOrdering: "vertical",
        childFill: 0.1,
        label: "New Game",
        autoFont: true,
        font: "$Hpx bold serif",
      });

      new CanvasLabel({
        // new game menu label
        parent: holder,
        fillX: 0.7,
        dockX: "center",
        childMargin: 30,
        childOrdering: "vertical",
        childFill: 0.04,
        label: "Select a Game Mode",
        autoFont: true,
        font: "$Hpx serif",
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
        fillX: true,
        dockX: "center",
        childMargin: 20,
        childOrdering: "vertical",
        childFill: 0.02,
        label: "(Other gamemodes coming very soon!)",
        autoFont: true,
        font: "$Hpx serif",
        maxHeight: 16,
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

  private renderBackground(_ctx: UIDrawContext) {
    // WIP
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

  public tick() {
    // no-op
  }

  mouseEvent(event: MouseEvent & GameMouseInfo) {
    const uiEvent: UIEvent = Object.assign(event, { consumed: false });

    if (event.inside) event.inside.handleEvent(uiEvent);
    else this.ui.handleEvent(uiEvent);
  }
}
