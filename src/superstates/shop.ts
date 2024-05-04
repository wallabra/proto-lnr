import { Game } from "../game";
import { IntermissionKeyHandler } from "../keyinput";
import { IntermissionMouseHandler } from "../mouse";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasSplitPanel,
  CanvasRoot,
  UIDrawContext,
} from "../ui";
import { moneyString } from "../util";
import Superstate from "./base";

export default class IntermissionState extends Superstate {
  ui: CanvasPanel;
  repairButton: CanvasButton;
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
    this.repairButton.label = `Repair Ship (${moneyString(this.repairCost())})`;
  }

  updateCashCounter() {
    if (this.game.player == null) {
      return;
    }
    this.cashCounter.label = `Money: ${moneyString(this.game.player.money)}`;
  }

  buildShopPane() {
    const shopPane = new CanvasSplitPanel(this.ui, "vertical", 2, 0, "#2222");
    const heading = new CanvasLabel(
      shopPane,
      0,
      0,
      -1,
      100,
      "Shop",
      "#e8e8ff",
      "50px sans-serif",
    );
    heading.dockX = "center";
    heading.textAlign = "center";

    this.cashCounter = new CanvasLabel(
      shopPane,
      0,
      0,
      -1,
      100,
      "-",
      "#e8e8ff",
      "30px sans-serif",
    );
    this.cashCounter.dockX = "end";
    this.cashCounter.dockMarginX = 50;
    this.cashCounter.dockY = "start";
    this.cashCounter.dockMarginY = 25;
    this.cashCounter.textAlign = "end";
    this.updateCashCounter();

    this.repairButton = new CanvasButton(
      shopPane,
      shopPane.width / 2,
      50,
      700,
      100,
      "",
      this.doRepair.bind(this),
    );
    this.repairButton.dockX = "center";
    this.repairButton.dockY = "end";
    this.repairButton.dockMarginY = 50;
    this.updateRepairLabel();
  }

  buildCartographyPane() {
    const cartographyPane = new CanvasSplitPanel(
      this.ui,
      "vertical",
      2,
      1,
      "#4452",
      4,
    );
    const heading = new CanvasLabel(
      cartographyPane,
      0,
      0,
      -1,
      100,
      "Cartography",
      "#e8e8ff",
      "30px sans-serif",
    );
    heading.dockX = "center";
    heading.textAlign = "center";
    const nextLevelButton = new CanvasButton(
      cartographyPane,
      cartographyPane.width / 2,
      50,
      700,
      100,
      "Invade Next Island",
      this.doNextLevel.bind(this),
    );
    nextLevelButton.dockX = "center";
    nextLevelButton.dockY = "end";
    nextLevelButton.dockMarginY = 50;
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

  mouseEvent(event: MouseEvent) {
    this.ui.handleEvent(event);
  }
}
