import { Game } from "../game";
import { FoodItem, FuelItem, ShipItem } from "../inventory";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import arrayCounter from 'array-counter';
import {
  Cannon,
  CannonballAmmo,
  Engine,
  ShipMakeup,
  ShipPart,
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
}

interface DrydockPartWidgetArgs extends PaneArgs, CanvasPanelArgs {
  part: ShipPart;
}

class DrydockPartWidget extends Pane<
  DrydockPartWidgetArgs,
  CanvasPanel,
  CanvasPanelArgs
> {
  private part: ShipPart;
  private label: CanvasLabel;
  private damageMeter: CanvasProgressBar;
  private damageLabel: CanvasLabel;

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
      new CanvasButton({
        ...buttonArgs,
        parent: actions,
        callback: this.tryRepair.bind(this),
        bgColor: "#2020f0c0",
      }).label("Repair", labelArgs);
    }

    new CanvasButton({
      ...buttonArgs,
      parent: actions,
      callback: this.tryUninstall.bind(this),
      bgColor: "#f02020c0",
    }).label("Uninstall", labelArgs);
  }

  private tryRepair() {
    this.part.tryRepair(this.player);
  }

  private tryUninstall() {
    this.makeup.removePart(this.part);
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
  private item: ShipItem;
  private resellFactor: number;

  protected buildPane(args: DrydockInventoryItemWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.item = args.item;
    this.resellFactor = args.resellFactor;

    new CanvasLabel({
      parent: this.pane,
      label: itemLabel(this.item, null),
      color: "#fff",
      font: "bold $Hpx sans-serif",
      height: 12.5,
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 10,
    });

    new CanvasButton({
      parent: this.pane,
      bgColor: "#22882290",
      childOrdering: "vertical",
      childMargin: 1,
      fillX: true,
      height: 20,
      callback: this.resell.bind(this),
    }).label(`Resell (${moneyString(this.resellCost())})`);

    if (this.item instanceof ShipPart) {
      new CanvasButton({
        parent: this.pane,
        bgColor: "#22228890",
        childOrdering: "vertical",
        childMargin: 1,
        fillX: true,
        height: 20,
        callback: this.installPart.bind(this),
      }).label("Install Part");
    }
  }

  private resellCost() {
    return this.item.cost * (this.item.amount || 1) * this.resellFactor;
  }

  private resell() {
    this.makeup.inventory.removeItem(this.item);
    this.player.money += this.resellCost();
  }

  private installPart() {
    if (!(this.item instanceof ShipPart)) {
      return;
    }

    const item = <ShipPart>this.item;

    if (this.makeup.addPart(item) == null) return;
  }

  public update() {}
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

  protected buildPane(args: DrydockInventoryWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);

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
    });
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

    this.itemList.contentPane.clearChildren();

    for (const item of this.makeup.inventory.items) {
      if (this.makeup.parts.indexOf(<ShipPart>item) !== -1) {
        continue;
      }

      this.addItem(item);
    }
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

    this.repairHullButtonLabel = new CanvasButton({
      parent: this.pane,
      fillX: 0.5,
      height: 40,
      callback: this.doRepairHull.bind(this),
      dockX: "center",
      childMargin: 20,
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

    this.partsScroller.contentPane.clearChildren();
    this.partsWidgets = [];

    for (const part of this.makeup.parts) {
      this.addPartItem(part);
    }
  }
  
  private updateSlotsLabel() {
    const slots = arrayCounter(this.makeup.make.slots.map((s) => s.type));
    const partTypes = arrayCounter(this.makeup.parts.map((p) => p.type));
    
    const labelParts = [];
    
    for (let name in slots) {
      labelParts.push(`${name} (${partTypes[name]}/${slots[name]})`);
    }
    
    this.slotsLabel.label = 'Slots: ' + labelParts.join(', ');
  }

  public update() {
    this.updateCashCounter();
    this.updateRepairLabel();
    this.updatePartsList();
    this.updateSlotsLabel();

    this.inventoryWidget.update();
    for (const widget of this.partsWidgets) {
      widget.update();
    }
  }

  updateRepairLabel() {
    this.repairHullButtonLabel.label = `Repair Ship (${moneyString(this.repairCost())})`;
  }

  updateCashCounter() {
    this.cashCounter.label = `Money: ${moneyString(this.player.money)}`;
  }

  doRepairHull() {
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
    this.addPane(PaneDrydock, {
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
        Engine.default(),
        Engine.oars(),
        Cannon.default(),
        Cannon.default(),
        new Engine({
          name: "Hot Betty",
          thrust: 1.7,
          cost: 700,
          maxDamage: 8,
          fuel: {
            type: "coal",
            cost: 0.025,
          },
        }),
        new Engine({
          name: "Piston Boy",
          maxDamage: 6,
          thrust: 2.3,
          cost: 1200,
          fuel: {
            type: "diesel",
            cost: 0.05,
          },
        }),
        new Engine({
          name: "Howitzer",
          maxDamage: 15,
          thrust: 3.0,
          cost: 2500,
          fuel: {
            type: "diesel",
            cost: 0.15,
          },
        }),
        new Engine({
          name: "Oilytron",
          thrust: 2.7,
          cost: 1440,
          fuel: {
            type: "diesel",
            cost: 0.12,
          },
        }),
        new Cannon({
          name: "WX Hefty",
          caliber: 5.5,
          range: 600,
          cost: 622,
          shootRate: 3.5,
        }),
        new Cannon({
          name: "WX Hefty Mk-II",
          caliber: 5.5,
          range: 700,
          cost: 700,
          shootRate: 2.4,
        }),
        new Cannon({
          name: "Juggernaut",
          caliber: 9,
          range: 550,
          cost: 1200,
          shootRate: 3.5,
        }),
        new Cannon({
          name: "Speedy",
          caliber: 4,
          range: 800,
          cost: 1000,
          shootRate: 1.0,
        }),
        new Cannon({
          name: "Chain Cannon",
          caliber: 4,
          range: 600,
          cost: 2300,
          shootRate: 0.3,
        }),
        new FuelItem("coal", 3, 20),
        new FuelItem("coal", 3, 20),
        new FuelItem("diesel", 2, 10),
        new FuelItem("diesel", 2, 20),
        new FuelItem("diesel", 2, 40),
        new CannonballAmmo(4, 15),
        new CannonballAmmo(4, 15),
        new CannonballAmmo(4, 40),
        new CannonballAmmo(5.5, 15),
        new CannonballAmmo(5.5, 15),
        new CannonballAmmo(9, 15),
        new CannonballAmmo(9, 15)
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

  public tick() {
    // no-op
  }

  mouseEvent(event: MouseEvent & GameMouseInfo) {
    const uiEvent: UIEvent = Object.assign(event, { consumed: false });

    if (event.inside) event.inside.handleEvent(uiEvent);
    else this.ui.handleEvent(uiEvent);
  }
}
