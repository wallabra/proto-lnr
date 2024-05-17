import { Game } from "../game";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import { ShipMakeup } from "../objects/shipmakeup";
import { Player } from "../player";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasSplitPanel,
  CanvasRoot,
  UIDrawContext,
  CanvasSplitPanelArgs,
  CanvasScroller,
  UIEvent,
  CanvasUIElement,
} from "../ui";
import { moneyString } from "../util";
import Superstate from "./base";

interface PaneArgs extends CanvasSplitPanelArgs {
  state: IntermissionState;
}

abstract class Pane<A extends PaneArgs = PaneArgs> {
  protected pane: CanvasSplitPanel;
  protected state: IntermissionState;
  protected game: Game;
  protected player: Player;
  protected makeup: ShipMakeup;
  
  constructor(args: A) {
    this.state = args.state;
    this.game = this.state.game;
    this.player = this.game.player;
    this.makeup = this.player.makeup;
    this.buildPane(args);
    this.state.panes.push(this);
    if (this.update) this.update();
  }
  
  protected abstract buildPane(args: A);
  public abstract update?();
}

interface PaneShopArgs extends PaneArgs {
  repairCostScale?: number;
}

class PaneShop extends Pane<PaneShopArgs> {
  private cashCounter: CanvasLabel;
  private repairButtonLabel: CanvasLabel;
  private repairCostScale: number;

  buildPane(args) {
    this.repairCostScale = args.repairCostScale != null ? args.repairCostScale : 5;
    
    this.pane = new CanvasSplitPanel(args);
    new CanvasLabel({
      parent: this.pane,
      label: "Shop",
      color: "#e8e8ff",
      dockX: "center",
      textAlign: "center",
      font: "50px sans-serif",
    });

    this.cashCounter = new CanvasLabel({
      parent: this.pane,
      label: "-",
      color: "#e8e8ff",
      font: "30px sans-serif",
      dockX: "end",
      dockMarginX: 50,
      dockY: "start",
      dockMarginY: 25,
      textAlign: "end",
    });

    const repairButton = new CanvasButton({
      parent: this.pane,
      fillX: 0.5,
      height: 75,
      callback: this.doRepair.bind(this),
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
    });
    this.repairButtonLabel = repairButton.label("-", { color: "#ccd" });
  }
  
  public update() {
    this.updateCashCounter();
    this.updateRepairLabel();
  }

  updateRepairLabel() {
    this.repairButtonLabel.label = `Repair Ship (${moneyString(this.repairCost())})`;
  }

  updateCashCounter() {
    this.cashCounter.label = `Money: ${moneyString(this.player.money)}`;
  }

  doRepair() {
    const player = this.player;
    const cost = this.repairCost();

    if (player.money < cost) {
      this.makeup.hullDamage -= player.money / this.repairCostScale;
      player.money = 0;
    } else {
      player.money -= cost;
      this.makeup.hullDamage = 0;
    }

    this.updateRepairLabel();
    this.updateCashCounter();
  }

  repairCost() {
    return this.makeup.hullDamage * this.repairCostScale;
  }
}

class PaneCartography extends Pane {
  doNextLevel() {
    this.game.nextLevel();
  }

  buildPane(args: PaneArgs) {
    const state = args.state;
    this.game = state.game;

    this.pane = new CanvasSplitPanel(args);
    new CanvasLabel({
      parent: this.pane,
      label: "Cartography",
      color: "#e8e8ff",
      font: "30px sans-serif",
      dockX: "center",
      textAlign: "center",
    });

    const nextLevelButton = new CanvasButton({
      parent: this.pane,
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
      fillX: 0.5,
      height: 100,
      callback: this.doNextLevel.bind(this),
    });
    nextLevelButton.label("Invade Next Island", { color: "#ccd" });
  }
  
  public update = undefined;
}

export default class IntermissionState extends Superstate {
  ui: CanvasPanel;
  panes: Pane[];

  public init() {
    this.game.setMouseHandler(IntermissionMouseHandler);
    this.game.setKeyboardHandler(IntermissionKeyHandler);
    this.panes = [];
    this.ui = new CanvasRoot(this.game, "#040404");
    this.buildUI();
  }
  
  addPane(paneType, args) {
    args = { state: this, parent: this.ui, ...args };
    return new paneType(args);
  }

  buildUI() {
    this.addPane(PaneShop, {
      axis: "vertical",
      splits: 2,
      index: 0,
      bgColor: "#2222",
    });
    this.addPane(PaneCartography, {
      axis: "vertical",
      splits: 2,
      index: 1,
      bgColor: "#2222",
    });
  }

  maximizeUI() {
    this.ui.checkChangeDimensions(this.game.width, this.game.height);
  }

  public render() {
    this.maximizeUI();
    
    for (const pane of this.panes) {
      if (pane.update) pane.update();
    }

    const ctx: UIDrawContext = {
      ctx: this.game.drawCtx,
      game: this.game,
    };

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
