import { Game } from "../game";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import { ShipMakeup } from "../objects/shipmakeup";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasSplitPanel,
  CanvasRoot,
  UIDrawContext,
  CanvasSplitPanelArgs,
} from "../ui";
import { moneyString } from "../util";
import Superstate from "./base";

export interface PaneDrydockArgs extends CanvasSplitPanelArgs {
  makeup: ShipMakeup;
}

class PaneDrydock {
  private pane: CanvasSplitPanel;
  private makeup: ShipMakeup;

  constructor(args: PaneDrydockArgs) {
    this.pane = new CanvasSplitPanel(args);
    this.makeup = args.makeup;
    this.construct();
  }

  private construct() {}
}

export default class IntermissionState extends Superstate {
  ui: CanvasPanel;
  repairButton: CanvasButton;
  repairButtonLabel: CanvasLabel;
  cashCounter: CanvasLabel;
  repairCostScale: number;

  constructor(game: Game, repairCostScale: number = 10) {
    super(game);
    this.ui = new CanvasRoot(game);
    this.repairCostScale = repairCostScale;
  }

  public init() {
    this.game.setMouseHandler(IntermissionMouseHandler);
    this.game.setKeyboardHandler(IntermissionKeyHandler);
    this.buildUI();
  }

  repairCost() {
    if (this.game.player == null) {
      return 0;
    }

    return this.game.player.damage * this.repairCostScale;
  }

  doRepair() {
    if (this.game.player == null) {
      return;
    }

    const player = this.game.player;
    const cost = this.repairCost();

    if (player.money < cost) {
      player.damage -= player.money / this.repairCostScale;
      player.money = 0;
    } else {
      player.money -= cost;
      player.damage = 0;
    }

    this.updateRepairLabel();
    this.updateCashCounter();
  }

  doNextLevel() {
    this.game.nextLevel();
  }

  updateRepairLabel() {
    this.repairButtonLabel.label = `Repair Ship (${moneyString(this.repairCost())})`;
  }

  updateCashCounter() {
    if (this.game.player == null) {
      return;
    }
    this.cashCounter.label = `Money: ${moneyString(this.game.player.money)}`;
  }

  buildShopPane() {
    const shopPane = new CanvasSplitPanel({
      parent: this.ui,
      axis: "vertical",
      splits: 2,
      index: 0,
      bgColor: "#2222",
    });
    new CanvasLabel({
      parent: shopPane,
      label: "Shop",
      color: "#e8e8ff",
      dockX: "center",
      textAlign: "center",
      font: "50px sans-serif",
    });

    this.cashCounter = new CanvasLabel({
      parent: shopPane,
      label: "-",
      color: "#e8e8ff",
      font: "30px sans-serif",
      dockX: "end",
      dockMarginX: 50,
      dockY: "start",
      dockMarginY: 25,
      textAlign: "end",
    });
    this.updateCashCounter();

    this.repairButton = new CanvasButton({
      parent: shopPane,
      width: shopPane.width / 2,
      height: 50,
      callback: this.doRepair.bind(this),
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
    });
    this.repairButtonLabel = this.repairButton.label("-");
    this.updateRepairLabel();
  }

  buildCartographyPane() {
    const cartographyPane = new CanvasSplitPanel({
      parent: this.ui,
      axis: "vertical",
      splits: 2,
      index: 1,
      bgColor: "#4452",
      margin: 4,
    });
    new CanvasLabel({
      parent: cartographyPane,
      label: "Cartography",
      color: "#e8e8ff",
      font: "30px sans-serif",
      dockX: "center",
      textAlign: "center",
    });
    const nextLevelButton = new CanvasButton({
      parent: cartographyPane,
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
      width: 700,
      height: 100,
      callback: this.doNextLevel.bind(this),
    });
    nextLevelButton.label("Invade Next Island");
  }

  buildUI() {
    this.buildShopPane();
    this.buildCartographyPane();
  }

  maximizeUI() {
    this.ui.checkChangeDimensions(this.game.width, this.game.height);
  }

  public render() {
    this.maximizeUI();

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
    this.ui.handleEvent(event);
  }
}
