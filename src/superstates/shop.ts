import { Game } from "../game";
import { FuelItem, ShipItem } from "../inventory";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import arrayCounter from "array-counter";
import {
  Cannon,
  CannonballAmmo,
  Engine,
  FUEL_COSTS,
  ShipMakeup,
  ShipPart,
  slots,
} from "../objects/shipmakeup";
import { Player } from "../player";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasSplitPanel,
  CanvasRoot,
  UIDrawContext,
  CanvasSplitPanelArgs,
  UIEvent,
  CanvasScroller,
  CanvasUIGroup,
  CanvasButtonArgs,
  CanvasProgressBar,
  CanvasLabelArgs,
  CanvasUIElement,
  CanvasUIArgs,
  CanvasPanelArgs,
} from "../ui";
import { moneyString } from "../util";
import Superstate from "./base";
import { PARTDEFS } from "../shop/partdefs";
import { instantiatePart } from "../shop/randomparts";

interface PaneArgs {
  state: IntermissionState;
}

function itemLabel(item, priceFactor = 1) {
  return (
    `${item.amount && item.amount > 1 ? "x" + Math.round(10 * item.amount) / 10 + " " : ""}${item.getItemLabel()}` +
    (priceFactor == null
      ? ""
      : ` (${moneyString(item.cost * priceFactor * (item.amount || 1))})`)
  );
}

abstract class Pane<
  A extends PaneArgs = PaneArgs,
  P extends CanvasUIElement = CanvasSplitPanel,
  PA extends CanvasUIArgs = CanvasSplitPanelArgs,
> {
  protected pane: P;
  protected state: IntermissionState;
  protected game: Game;
  protected player: Player;
  protected makeup: ShipMakeup;
  destroyed: boolean = false;

  constructor(args: A & PA) {
    Object.assign(this, args);
    this.state = args.state;
    this.game = this.state.game;
    this.player = this.game.player;
    this.makeup = this.player.makeup;
    this.buildPane(args);
    this.state.panes.push(this);
    if (this.update) this.update();
  }

  protected abstract buildPane(args: PaneArgs & PA);
  public abstract update?();

  public destroy() {
    this.pane.remove();
    this.destroyed = true;
  }
}

interface DrydockPartWidgetArgs extends PaneArgs, CanvasPanelArgs {
  part: ShipPart;
}

class DrydockPartWidget extends Pane<
  DrydockPartWidgetArgs,
  CanvasPanel,
  CanvasPanelArgs
> {
  part: ShipPart;
  private label: CanvasLabel;
  private damageMeter: CanvasProgressBar;
  private damageLabel: CanvasLabel;
  private repairButton: CanvasButton;

  protected buildPane(args: DrydockPartWidgetArgs) {
    this.pane = new CanvasPanel(args);

    this.label = new CanvasLabel({
      parent: this.pane,
      label: "-",
      dockX: "start",
      color: "#fff",
      childOrdering: "vertical",
      childMargin: 5,
      height: 13,
      font: "bold 13px sans-serif",
    });

    // TODO: image to represent part

    this.damageMeter = new CanvasProgressBar({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 0,
      fillX: 1.0,
      height: 30,
    });

    this.damageLabel = new CanvasLabel({
      parent: this.damageMeter,
      font: "11px sans-serif",
      label: "-",
      color: "#e2d8d8",
    });

    const actions = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 5,
    });

    const buttonArgs: Partial<CanvasButtonArgs> = {
      fillX: 1.0,
      height: 20,
      childOrdering: "vertical",
      childMargin: 1,
    };

    const labelArgs: Partial<CanvasLabelArgs> = {
      color: "#fffe",
      font: "11px monospaced",
    };

    if (this.part.damage > 0) {
      this.repairButton = new CanvasButton({
        ...buttonArgs,
        parent: actions,
        callback: this.tryRepair.bind(this),
        bgColor: "#2020f0c0",
      });
      this.repairButton.label("Repair", labelArgs);
    }

    new CanvasButton({
      ...buttonArgs,
      parent: actions,
      callback: this.tryUninstall.bind(this),
      bgColor: "#f02020c0",
    }).label("Uninstall", labelArgs);
  }

  private tryRepair() {
    if (this.part.damage === 0) {
      this.repairButton.remove();
      return;
    }
    this.part.tryRepair(this.player);
  }

  private tryUninstall() {
    if (this.makeup.removePart(this.part)) this.destroy();
  }

  public update() {
    this.label.label = this.part.getItemLabel();
    this.damageMeter.progress = this.part.damage / this.part.maxDamage;
    this.damageLabel.label =
      this.part.damage <= 0
        ? "Not damaged"
        : `${Math.round((100 * this.part.damage) / this.part.maxDamage)}% damaged (${moneyString(this.part.repairCost())})`;
  }
}

interface DrydockInventoryItemWidgetArgs extends PaneArgs {
  item: ShipItem;
  resellFactor: number;
}

class DrydockInventoryItemWidget extends Pane<
  DrydockInventoryItemWidgetArgs,
  CanvasPanel,
  CanvasPanelArgs
> {
  item: ShipItem;
  private resellFactor: number;
  private resellLabel: CanvasLabel;
  private itemLabel: CanvasLabel;
  private resellButton: CanvasButton;

  protected buildPane(args: DrydockInventoryItemWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.item = args.item;
    this.resellFactor = args.resellFactor;

    this.itemLabel = new CanvasLabel({
      parent: this.pane,
      label: "-",
      color: "#fff",
      font: "bold $Hpx sans-serif",
      height: 12.5,
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 10,
    });

    this.resellButton = new CanvasButton({
      parent: this.pane,
      bgColor: "#22882290",
      childOrdering: "vertical",
      childMargin: 1,
      fillX: true,
      height: 20,
      callback: () => {},
    });
    this.resellLabel = this.resellButton.label("-", { color: "#fff" });
    this.updateResellAction();

    if (this.item instanceof ShipPart) {
      new CanvasButton({
        parent: this.pane,
        bgColor: "#22228890",
        childOrdering: "vertical",
        childMargin: 1,
        fillX: true,
        height: 20,
        callback: this.installPart.bind(this),
      }).label("Install Part", { color: "#fff" });
    }
  }

  private resellCost(factor = 1) {
    return (
      factor * this.item.cost * (this.item.amount || 1) * this.resellFactor
    );
  }

  private onlyResellHalf() {
    return this.item.amount != null && this.item.amount > 1;
  }

  private resellHalf() {
    if (this.item.integerAmounts) {
      const half = Math.floor(this.item.amount / 2);
      this.item.amount -= half;
      this.player.money += this.item.cost * half * this.resellFactor;
    } else {
      this.player.money += this.resellCost(0.5);
      this.item.amount /= 2;
    }

    this.update();
  }

  private resell() {
    this.makeup.inventory.removeItem(this.item);
    this.player.money += this.resellCost();
    this.destroy();
  }

  private installPart() {
    if (!(this.item instanceof ShipPart)) {
      return;
    }

    const item = <ShipPart>this.item;

    if (this.makeup.addPart(item) == null) return;

    this.destroy();
  }

  private updateResellAction() {
    this.resellButton.callback = (
      this.onlyResellHalf() ? this.resellHalf : this.resell
    ).bind(this);
  }

  public update() {
    this.itemLabel.label = itemLabel(this.item, null);
    this.resellLabel.label = `Resell${this.onlyResellHalf() ? " Half" : ""} (${moneyString(this.resellCost(0.5))})`;
    this.updateResellAction();
  }
}

function updateList<
  T,
  P extends Pane<A, B, C>,
  A extends PaneArgs,
  B extends CanvasUIElement,
  C extends CanvasUIArgs,
>(
  items: T[],
  widgets: P[],
  index: (remaining: T[], widget: P) => number,
  add: (item: T) => void,
  shouldSkip?: (item: T) => boolean,
) {
  const remaining = items.slice();

  for (const widget of widgets) {
    const idx = index(remaining, widget);
    if (idx === -1 || (shouldSkip != null && shouldSkip(remaining[idx]))) {
      widget.destroy();
    } else {
      widget.update();
      remaining.splice(idx, 1);
    }
  }

  for (const item of remaining) {
    if (shouldSkip == null || !shouldSkip(item)) {
      add(item);
    }
  }

  return widgets.filter((w) => !w.destroyed);
}

interface DrydockInventoryWidgetArgs extends PaneArgs {
  resellFactor: number;
}

class DrydockInventoryWidget extends Pane<
  DrydockInventoryWidgetArgs,
  CanvasPanel,
  CanvasPanelArgs
> {
  private itemList: CanvasScroller;
  private resellFactor: number;
  private itemWidgets: DrydockInventoryItemWidget[];

  protected buildPane(args: DrydockInventoryWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.itemWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      dockX: "start",
      dockY: "start",
      dockMarginX: 10,
      dockMarginY: 10,
      label: "Inventory",
      height: 20,
      autoFont: true,
      color: "#fddc",
      font: "$Hpx sans-serif",
      childOrdering: "vertical",
      childMargin: 15,
    });

    this.itemList = new CanvasScroller({
      parent: this.pane,
      childOrdering: "vertical",
      axis: "horizontal",
      childMargin: 5,
      fillX: true,
      fillY: 0.8,
      bgColor: "#0000",
    });
  }

  private addItem(shipItem) {
    this.itemWidgets.push(
      new DrydockInventoryItemWidget({
        parent: this.itemList.contentPane,
        item: shipItem,
        resellFactor: this.resellFactor,
        state: this.state,
        bgColor: "#fff2",
        fillX: 0.4,
        fillY: true,
        childOrdering: "horizontal",
        childMargin: 6,
      }),
    );
  }

  private furnishItemList() {
    if (
      this.itemList.contentPane.children.length ===
      this.makeup.inventory.items.filter(
        (i) => this.makeup.parts.indexOf(<ShipPart>i) === -1,
      ).length
    )
      return;

    console.log("Update inventory list");

    this.itemWidgets = updateList(
      this.makeup.inventory.items,
      this.itemWidgets,
      (remaining, widget) => remaining.indexOf(widget.item),
      (item) => {
        this.addItem(item);
      },
      (item) => this.makeup.parts.indexOf(<ShipPart>item) !== -1,
    );
  }

  public update() {
    this.furnishItemList();
  }
}

interface ShopItemWidgetArgs extends PaneArgs {
  item: ShipItem;
}

class ShopItemWidget extends Pane<
  ShopItemWidgetArgs,
  CanvasPanel,
  CanvasPanelArgs
> {
  private item: ShipItem;

  protected buildPane(args: ShopItemWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.item = args.item;

    new CanvasLabel({
      parent: this.pane,
      height: 12,
      label: itemLabel(this.item),
      font: "$Hpx sans-serif",
      color: "#fff",
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 5,
    });

    if (this.item.shopInfo)
      for (const line of this.item.shopInfo()) {
        const infoLabel = new CanvasLabel({
          parent: this.pane,
          height: 11,
          label: "* " + line,
          font: "$Hpx sans-serif",
          autoFont: true,
          color: "#d0d0d8",
          childOrdering: "vertical",
          childMargin: 2,
        });
        const addedHeight = infoLabel.height + infoLabel.childMargin * 2;
        this.pane.height += addedHeight;
        if (typeof this.pane.fillY === "number")
          this.pane.fillY += addedHeight / this.pane.parent.innerHeight;
      }

    new CanvasButton({
      parent: this.pane,
      height: 20,
      fillX: 1.0,
      callback: this.buyItem.bind(this),
      paddingY: 4,
      childOrdering: "vertical",
      childMargin: 5,
    }).label("Buy", {
      font: "bold $Hpx sans-serif",
      color: "#fff",
      fillY: 1.0,
      height: 11,
      autoFont: true,
    });
  }

  public update() {}

  private buyItem() {
    const cost = this.item.cost * (this.item.amount || 1);
    if (this.player.money < cost) return;
    this.player.makeup.inventory.addItem(this.item);
    this.player.money -= cost;
    this.destroy();
  }
}

interface PaneShopArgs extends PaneArgs {
  shopItems: ShipItem[];
}

class PaneShop extends Pane<PaneShopArgs> {
  private shopItems: ShipItem[];
  private itemList: CanvasScroller;
  private itemWidgets: ShopItemWidget[];

  buildPane(args: PaneShopArgs & CanvasSplitPanelArgs) {
    this.shopItems = args.shopItems;
    this.pane = new CanvasSplitPanel(args);
    this.itemWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      label: "Shop",
      color: "#e8e8ff",
      dockX: "center",
      textAlign: "center",
      height: 30,
      childOrdering: "vertical",
      childMargin: 20,
    });

    this.itemList = new CanvasScroller({
      parent: this.pane,
      bgColor: "#0006",
      childOrdering: "vertical",
      childMargin: 30,
      fillX: 1.0,
      fillY: 0.6,
      axis: "vertical",
    });

    this.furnishItemList();
  }

  private addShopItem(item: ShipItem) {
    this.itemWidgets.push(
      new ShopItemWidget({
        parent: this.itemList.contentPane,
        item: item,
        state: this.state,
        bgColor: "#1a1a38d0",
        fillX: 0.9,
        dockX: "center",
        height: 100,
        childOrdering: "vertical",
        childMargin: 8,
      }),
    );
  }

  private furnishItemList() {
    this.shopItems = this.shopItems.filter(
      (item) => this.player.makeup.inventory.items.indexOf(item) === -1,
    );
    if (this.shopItems.length === this.itemList.contentPane.children.length)
      return;
    console.log("Update shop listings");

    this.itemList.contentPane.clearChildren();

    for (const item of this.shopItems) {
      this.addShopItem(item);
    }
  }

  public update() {
    this.furnishItemList();
  }
}

interface PaneDrydockArgs extends PaneArgs {
  hullRepairCostScale?: number;
}

class PaneDrydock extends Pane {
  private cashCounter: CanvasLabel;
  private repairHullButtonLabel: CanvasLabel;
  private partsScroller: CanvasScroller;
  private partsWidgets: DrydockPartWidget[];
  private inventoryWidget: DrydockInventoryWidget;
  private slotsLabel: CanvasLabel;
  private hullDamageMeter: CanvasProgressBar;

  buildPane(args: PaneDrydockArgs & CanvasSplitPanelArgs) {
    this.pane = new CanvasSplitPanel(args);
    this.partsWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      label: "Drydock",
      color: "#e8e8ff",
      dockX: "center",
      textAlign: "center",
      height: 30,
      childOrdering: "vertical",
      childMargin: 20,
    });

    this.cashCounter = new CanvasLabel({
      parent: this.pane,
      label: "-",
      color: "#e8e8ff",
      font: "18px sans-serif",
      height: 18,
      dockX: "end",
      dockMarginX: 50,
      dockY: "start",
      dockMarginY: 25,
      textAlign: "end",
    });

    this.buildPartsPane();
    this.buildInventoryPane();

    this.hullDamageMeter = new CanvasProgressBar({
      parent: this.pane,
      fillX: 0.5,
      height: 5,
      progress: this.makeup.hullDamage / this.makeup.make.maxDamage,
      dockX: "center",
      childMargin: 0,
      childOrdering: "vertical",
    });

    this.repairHullButtonLabel = new CanvasButton({
      parent: this.pane,
      fillX: 0.5,
      height: 40,
      callback: this.doRepairHull.bind(this),
      dockX: "center",
      childMargin: 0,
      childOrdering: "vertical",
    }).label("-", { color: "#ccd" });
  }

  buildPartsPane() {
    const partsPane = new CanvasPanel({
      parent: this.pane,
      fillX: true,
      fillY: 0.4,
      dockX: "center",
      childOrdering: "vertical",
      childMargin: 5,
      bgColor: "#0006",
    });

    new CanvasLabel({
      parent: partsPane,
      label: "Parts",
      color: "#fddc",
      font: "$Hpx sans-serif",
      height: 20,
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 8,
    });

    this.partsScroller = new CanvasScroller({
      parent: partsPane,
      axis: "horizontal",
      childOrdering: "vertical",
      childMargin: 20,
      fillX: 1.0,
      fillY: 0.7,
      bgColor: "#0000",
    });

    this.slotsLabel = new CanvasLabel({
      parent: partsPane,
      label: "-",
      color: "#fddc",
      font: "bold $Hpx sans-serif",
      height: 15,
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 5,
    });

    this.updateSlotsLabel();
    this.updatePartsList();
  }

  private buildInventoryPane() {
    this.inventoryWidget = new DrydockInventoryWidget({
      parent: this.pane,
      fillY: 0.4,
      dockX: "center",
      fillX: true,
      resellFactor: 0.6,
      state: this.state,
      childOrdering: "vertical",
      childMargin: 5,
      bgColor: "#0006",
    });
  }

  private addPartItem(part: ShipPart) {
    this.partsWidgets.push(
      new DrydockPartWidget({
        state: this.state,
        parent: this.partsScroller.contentPane,
        bgColor: "#101014d8",
        fillY: 0.8,
        fillX: 0.4,
        part: part,
        childOrdering: "horizontal",
        childMargin: 8,
      }),
    );
  }

  private updatePartsList() {
    if (
      this.partsScroller.contentPane.children.length ===
      this.makeup.parts.length
    )
      return;

    console.log("Update parts list");
    this.partsWidgets = updateList(
      this.makeup.parts,
      this.partsWidgets,
      (remaining, widget) => remaining.indexOf(widget.part),
      (item) => {
        this.addPartItem(item);
      },
    );
  }

  private updateSlotsLabel() {
    const makeSlots = slots(this.makeup.make);
    const partTypes = arrayCounter(this.makeup.parts.map((p) => p.type));

    const labelParts = [];

    for (const name in makeSlots) {
      labelParts.push(`${name} (${partTypes[name] || 0}/${makeSlots[name]})`);
    }

    this.slotsLabel.label = "Slots: " + labelParts.join(", ");
  }

  public update() {
    this.updateCashCounter();
    this.updateRepairLabel();
    this.updatePartsList();
    this.updateSlotsLabel();
    this.inventoryWidget.update();
  }

  private updateRepairLabel() {
    if (this.makeup.hullDamage === 0) {
      this.repairHullButtonLabel.label = "Ship is healthy";
    } else {
      this.repairHullButtonLabel.label = `Repair Ship (${moneyString(this.repairCost())})`;
    }
    this.hullDamageMeter.progress =
      this.makeup.hullDamage / this.makeup.make.maxDamage;
  }

  private updateCashCounter() {
    this.cashCounter.label = `Money: ${moneyString(this.player.money)}`;
  }

  doRepairHull() {
    if (this.makeup.hullDamage === 0) return;

    const player = this.player;
    const cost = this.repairCost();

    if (player.money < cost) {
      this.makeup.hullDamage -= player.money / this.makeup.make.repairCostScale;
      player.money = 0;
    } else {
      player.money -= cost;
      this.makeup.hullDamage = 0;
    }
  }

  repairCost() {
    return this.makeup.hullDamage * this.makeup.make.repairCostScale;
  }
}

class PaneCartography extends Pane {
  doNextLevel() {
    this.game.nextLevel();
  }

  buildPane(args: PaneArgs & CanvasSplitPanelArgs) {
    const state = args.state;
    this.game = state.game;

    this.pane = new CanvasSplitPanel(args);
    new CanvasLabel({
      parent: this.pane,
      label: "Cartography",
      color: "#e8e8ff",
      font: "25px sans-serif",
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
  panes: Pane<
    unknown & PaneArgs,
    unknown & CanvasUIElement,
    unknown & CanvasUIArgs
  >[];
  private paneDrydock: PaneDrydock;

  public init() {
    this.game.setMouseHandler(IntermissionMouseHandler);
    this.game.setKeyboardHandler(IntermissionKeyHandler);
    this.panes = [];
    this.ui = new CanvasRoot(this.game, "#040404");
    this.game.player.makeup.inventory.consolidateInventory();
    this.buildUI();
  }

  addPane(paneType, args) {
    args = { state: this, parent: this.ui, ...args };
    return new paneType(args);
  }

  buildUI() {
    this.paneDrydock = this.addPane(PaneDrydock, {
      paddingX: 20,
      axis: "horizontal",
      splits: 3,
      index: 0,
      bgColor: "#2222",
    });
    this.addPane(PaneShop, {
      paddingX: 20,
      axis: "horizontal",
      splits: 3,
      index: 1,
      bgColor: "#2222",
      fillY: 0.85,
      shopItems: [
        ...PARTDEFS.engine.map((d) => Array(d.shopRepeat).fill(0).map(() => instantiatePart(d, 'engine'))),
        ...PARTDEFS.cannon.map((d) => Array(d.shopRepeat).fill(0).map(() => instantiatePart(d, 'cannon'))),
        new FuelItem("coal", FUEL_COSTS.coal, 20),
        new FuelItem("coal", FUEL_COSTS.coal, 20),
        new FuelItem("diesel", FUEL_COSTS.diesel, 10),
        new FuelItem("diesel", FUEL_COSTS.diesel, 20),
        new FuelItem("diesel", FUEL_COSTS.diesel, 40),
        new CannonballAmmo(4, 15),
        new CannonballAmmo(4, 15),
        new CannonballAmmo(4, 40),
        new CannonballAmmo(5.5, 15),
        new CannonballAmmo(5.5, 15),
        new CannonballAmmo(7.5, 15),
        new CannonballAmmo(7.5, 15),
      ],
    });
    this.addPane(PaneCartography, {
      paddingX: 20,
      axis: "horizontal",
      splits: 3,
      index: 2,
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

  public doHullRepair() {
    this.paneDrydock.doRepairHull();
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
