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
    if (this.game.player == null || this.game.player.possessed == null) {
      return 0;
    }

    return this.game.player.possessed.damage * this.repairCostScale;
  }

  doRepair() {
    if (this.game.player == null || this.game.player.possessed == null) {
      return;
    }

    const ship = this.game.player.possessed;
    const cost = this.repairCost();

    if (ship.money < cost) {
      return;
    }

    ship.money -= cost;
    ship.damage = 0;
    this.updateRepairLabel();
  }

  doNextLevel() {
    this.game.nextLevel();
  }

  updateRepairLabel() {
    this.repairButton.label = `Repair Ship (${moneyString(this.repairCost())})`;
  }

  buildShopPane() {
    const shopPane = new CanvasSplitPanel(this.ui, "vertical", 2, 0, "#0000");
    const heading = new CanvasLabel(
      shopPane,
      0,
      0,
      -1,
      100,
      "Shop",
      "#e8e8ff",
      "30px sans-serif",
    );
    heading.textAlign = "center";
    this.repairButton = new CanvasButton(
      shopPane,
      shopPane.width / 2,
      50,
      100,
      100,
      "",
      this.doRepair,
    );
    this.repairButton.alignX = "center";
    this.repairButton.dockY = "end";
    this.repairButton.dockMarginY = 20;
    this.updateRepairLabel();
  }

  buildCartographyPane() {
    const cartographyPane = new CanvasSplitPanel(
      this.ui,
      "vertical",
      2,
      1,
      "#0000",
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
    heading.textAlign = "center";
    const nextLevelButton = new CanvasButton(
      cartographyPane,
      cartographyPane.width / 2,
      50,
      100,
      100,
      "Invade Next Island",
      this.doNextLevel,
    );
    nextLevelButton.alignX = "center";
    nextLevelButton.dockY = "end";
    nextLevelButton.dockMarginY = 20;
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
