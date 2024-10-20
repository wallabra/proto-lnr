import { Superstate } from "./base";
import type {
  CanvasButtonArgs,
  CanvasLabelArgs,
  CanvasUIElement,
  UIDrawContext,
  UIEvent,
} from "../ui";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasRoot,
  CanvasScroller,
  CanvasUIGroup,
} from "../ui";
import { GUIMouseHandler } from "../mouse";
import type { GameMouseInfo } from "../mouse";
import { GUIKeyHandler } from "../keyinput";
import { GAME_VERSION } from "../info";

export class MainMenuState extends Superstate {
  ui: CanvasRoot;
  states = new Map<string, CanvasUIElement>();
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
      paddingX: 20,
      paddingY: 30,
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
        font: "bold $Hpx sans-serif",
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

      const helpButton = new CanvasButton({
        ...buttonArgs,
        parent: holder,
        callback: () => {
          this.switchState("help");
        },
      });
      helpButton.label("Help", { ...buttonLabelArgs });

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

    this.buildState("help", (holder) => {
      addBackButton(holder);

      new CanvasLabel({
        // help screen label
        parent: holder,
        dockX: "center",
        alignX: "center",
        childMargin: 50,
        childOrdering: "vertical",
        childFill: 0.1,
        maxHeight: 65,
        label: "Help Info",
        autoFont: true,
        font: "$Hpx bold serif",
        color: "#fff",
      });

      const scroller = new CanvasScroller({
        parent: holder,
        bgColor: "#08080899",
        axis: "vertical",
        dockX: "center",
        fillX: 0.8,
        childOrdering: "vertical",
        childFill: 1,
        scrollbarOpts: {
          thickness: 8,
          barColor: "#aafb",
          barPadding: 2,
          bgColor: "#0008",
        },
      });

      const addRow = (myString: string, indent = 0, extraOpts = {}) => {
        const row = new CanvasPanel({
          parent: scroller.contentPane,
          dockX: "start",
          childMargin: 25,
          childOrdering: "vertical",
          childFill: 1,
          fillX: true,
          height: 40,
          bgColor: "#0001",
        });

        // indentation
        if (indent > 0) {
          new CanvasPanel({
            parent: row,
            childOrdering: "horizontal",
            width: 40 * indent,
            bgColor: "#0000",
            height: 1,
          });
        }

        // bullet
        new CanvasLabel({
          parent: row,
          childOrdering: "horizontal",
          childMargin: 25,
          label: "•",
          height: 20,
          autoFont: true,
          font: "$Hpx bold",
          color: "#88F",
          dockY: "center",
          alignY: "center",
        });

        // help text
        new CanvasLabel({
          parent: row,
          childOrdering: "horizontal",
          childFill: 1,
          label: myString,
          height: 18,
          autoFont: true,
          font: "bold $Hpx sans-serif",
          color: "#ddd",
          dockY: "center",
          alignY: "center",
          ...extraOpts,
        });
      };

      const addSpacer = (space = 1) => {
        const spacer = new CanvasPanel({
          parent: scroller.contentPane,
          fillX: true,
          height: Math.exp(space - 1) * 15, // fancy e^n spacing :3
          childOrdering: "vertical",
          bgColor: "#0000",
        });

        // spacer horizontal ruler
        new CanvasPanel({
          parent: spacer,
          height: 2,
          fillX: 0.33 * Math.log(1 + space),
          dockX: "center",
          dockY: "center",
          alignX: "center",
          alignY: "center",
          bgColor: "#fff4",
        });
      };

      addRow("Move and steer with WASD or by holding the left mouse button.");
      addRow("Move near items to vacuum them up!");
      addRow("Use Spacebar or RMB to shoot!");
      addRow(
        "Spacebar shoots one at a time; RMB to burst fire all cannons.",
        1,
      );
      addRow("Use the mouse to control the aim distance!", 1);
      addRow("Press a number key to lock/unlock a cannon from firing.", 1);
      addRow(
        "By default, the game always fires the highest caliber cannon first!",
        2,
      );
      addSpacer();
      addRow("Press H to toggle the HUD.");
      addRow("Press R to reset the game, or M to come back to the main menu.");
      addSpacer(2);
      addRow(
        "Once far enough from the island, press L to leave to the intermission screen!",
        0,
        { color: "#FFA" },
      );
      addSpacer();
      addRow(
        "In the Drydock you can manage your inventory and installed parts.",
        1,
      );
      addRow(
        "If in doubt, just use Auto-Install, Auto-Resell, and Auto-Repair, in that order!",
        2,
      );
      addRow(
        "Always use the info blurbs on the right side of the Drydock to orient yourself.",
        2,
      );
      addRow(
        "Double-check if you have ammo for all cannons and fuel for all engines!",
        3,
      );
      addSpacer();
      addRow("You can buy stuff like parts, ammo and fuel at the Shop.", 1);
      addRow(
        "Things won't always be available at the shop! Try checking it on diffeerent days.",
        2,
      );
      addSpacer();
      addRow(
        "Once you're racked up cash aplenty, visit the Harbor to get a shiny new ship.",
        1,
      );
      addRow(
        "Just like the Shop, not all ships wil be available. Some have a small chance to appear!",
        2,
      );
      addRow(
        "When you buy a ship, you can either switch to it as yours, or assign a crewmate as its subcaptain.",
        2,
      );
      addRow(
        "Ships in your fleet follow you around and help you, and have their own inventory.",
        3,
      );
      addRow(
        "You can move items between different fleet ships in the Drydock.",
        3,
      );
      addSpacer();
      addRow(
        "When you're done managing stuff, use the Cartography tab to move on to the next island!",
        1,
        { color: "#FFA" },
      );

      return null;
    });
  }

  private a_newGame(gamemode: string) {
    this.game.restart(gamemode);
  }

  public override init() {
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
