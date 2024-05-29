import { Game } from "../game";
import { FoodItem, FuelItem, ShipItem } from "../inventory";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import arrayCounter from "array-counter";
import {
  CannonballAmmo,
  Crew,
  Engine,
  FUEL_PROPS,
  PartSlot,
  ShipMake,
  ShipMakeup,
  ShipPart,
  slots,
} from "../objects/shipmakeup";
import { Player } from "../player";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasRoot,
  UIDrawContext,
  CanvasPanelArgs,
  UIEvent,
  CanvasScroller,
  CanvasUIGroup,
  CanvasUIGroupArgs,
  CanvasButtonArgs,
  CanvasProgressBar,
  CanvasLabelArgs,
  CanvasUIElement,
  CanvasUIArgs,
} from "../ui";
import { moneyString } from "../util";
import Superstate from "./base";
import { PARTDEFS } from "../shop/partdefs";
import { instantiatePart } from "../shop/randomparts";
import { CREWDEFS } from "../shop/crewdefs";
import { FOODDEFS } from "../shop/fooddefs";
import { Class, Optional } from "utility-types";
import { MAKEDEFS } from "../shop/makedefs";

interface PaneArgs {
  state: IntermissionState;
}

function weightInfo(item: ShipItem) {
  const amount = item.amount != null ? item.amount : 1;
  const weight = amount * item.weight;

  if (weight < 10) return `weight: ${Math.ceil(weight * 1000)}g`;

  return `weight: ${Math.ceil(weight)}kg`;
}

function itemLabel(item: ShipItem, makeup: ShipMakeup | null, priceFactor = 1) {
  return (
    `${item.amount && item.amount > 1 ? "x" + Math.round(10 * item.amount) / 10 + " " : ""}${item.getInventoryLabel && makeup != null ? item.getInventoryLabel(makeup) : item.getItemLabel()}` +
    (priceFactor == null
      ? ""
      : ` (${moneyString(item.cost * priceFactor * (item.amount || 1))})`)
  );
}

abstract class Pane<
  A extends PaneArgs = PaneArgs,
  P extends CanvasUIElement = CanvasPanel,
  PA extends CanvasUIArgs = CanvasPanelArgs,
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
    if (this.pane != null) {
      this.pane.remove();
      this.pane = null;
    }
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
  private details: CanvasUIGroup;
  private damageMeter: CanvasProgressBar;
  private damageLabel: CanvasLabel;
  private repairButton: CanvasButton;
  private assignCrewButton: CanvasButton;
  private buttonArgs: Partial<CanvasButtonArgs>;
  private labelArgs: Partial<CanvasLabelArgs>;
  private buttonList: CanvasUIElement;
  private shouldUpdateDetails: boolean;

  protected buildPane(args: DrydockPartWidgetArgs) {
    this.pane = new CanvasPanel(args);

    this.label = new CanvasLabel({
      parent: this.pane,
      label: "-",
      dockX: "start",
      color: "#fff",
      childOrdering: "vertical",
      childMargin: 7.5,
      height: 13,
      font: "bold 13px sans-serif",
    });

    this.details = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 3,
      fillX: true,
    });
    this.shouldUpdateDetails = true;
    this.updateDetails();

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

    this.buttonList = new CanvasUIGroup({
      parent: this.pane,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 7,
    });

    this.buttonArgs = {
      fillX: 1.0,
      childOrdering: "vertical",
      childMargin: 2.5,
      childFill: 1,
    };

    this.labelArgs = {
      color: "#fffe",
      height: 11,
      autoFont: true,
      font: "$Hpx monospaced",
    };

    if (this.part.damage > 0) {
      this.repairButton = new CanvasButton({
        ...this.buttonArgs,
        parent: this.buttonList,
        callback: this.tryRepair.bind(this),
        bgColor: "#2020f0c0",
      });
      this.repairButton.label("Repair", this.labelArgs);
    }

    this.updateCrewButton();

    new CanvasButton({
      ...this.buttonArgs,
      parent: this.buttonList,
      callback: this.tryUninstall.bind(this),
      bgColor: "#f02020c0",
    }).label("Uninstall", this.labelArgs);
  }

  private updateCrewButton() {
    if (this.part.manned) {
      if (this.assignCrewButton == null) {
        this.assignCrewButton = new CanvasButton({
          ...this.buttonArgs,
          parent: this.buttonList,
          callback: this.crewButtonAction.bind(this),
          bgColor: "#2040f0c0",
        });
      }

      this.updateCrewButtonLabel();
    } else if (this.assignCrewButton != null) {
      this.assignCrewButton.remove();
      this.assignCrewButton = null;
    }
  }

  private updateCrewButtonLabel() {
    if (this.assignCrewButton == null) return;
    if (!this.part.alreadyManned()) {
      this.assignCrewButton.label("Assign Crew", this.labelArgs);
    } else {
      this.assignCrewButton.label("Unassign Crew", this.labelArgs);
    }
  }

  private tryAssignCrew() {
    if (this.part.alreadyManned()) {
      return;
    }

    const success = this.makeup.assignCrewTo(this.part);

    if (success) {
      this.shouldUpdateDetails = true;
      this.updateCrewButtonLabel();
    }
  }

  private tryUnassignCrew() {
    if (!this.part.alreadyManned()) {
      return;
    }

    this.part.mannedBy.map((c) => c.unassign()).every((a) => a);

    this.shouldUpdateDetails = true;
    this.updateCrewButtonLabel();
  }

  private crewButtonAction() {
    if (!this.part.manned) return;

    if (!this.part.alreadyManned()) {
      return this.tryAssignCrew();
    } else {
      return this.tryUnassignCrew();
    }
  }

  private tryRepair() {
    this.part.tryRepair(this.player);
    if (this.part.damage === 0) {
      this.repairButton.remove();
      this.repairButton = null;
    }
  }

  private tryUninstall() {
    if (this.makeup.removePart(this.part)) this.destroy();
  }

  private manningRequirements() {
    if (!this.part.manned) return [];

    if (typeof this.part.manned !== "number") {
      return ["Needs to be manned"];
    } else {
      return [`Needs min. ${this.part.manned} total manning strength`];
    }
  }

  private manningStatus() {
    if (!this.part.manned) return [];

    if (!this.part.alreadyManned()) {
      return ["(Not Manned)"];
    } else {
      return [
        "Manned by: " +
          this.part.mannedBy
            .map((c) => c.getInventoryLabel(this.makeup))
            .join(", "),
      ];
    }
  }

  private updateDetailLine(line: string, idx: number) {
    if (this.details.children.length <= idx) {
      new CanvasLabel({
        parent: this.details,
        label: line,
        dockX: "start",
        dockMarginX: 4,
        color: "#bbb",
        childOrdering: "vertical",
        childMargin: 1.5,
        height: 9.5,
        autoFont: true,
        font: "$Hpx sans-serif",
      });
    } else {
      (<CanvasLabel>this.details.children[idx]).label = line;
    }
  }

  private updateDetails() {
    //if (!this.shouldUpdateDetails) return;
    //this.shouldUpdateDetails = false;

    const lines = [
      weightInfo(this.part),
      ...this.part.shopInfo(this.makeup),
      ...this.manningRequirements(),
      ...this.manningStatus(),
    ];

    lines.forEach((line, i) => this.updateDetailLine(line, i));

    for (const child of this.details.children.slice(lines.length).reverse()) {
      child.remove();
    }
  }

  public update() {
    this.label.label = this.part.getInventoryLabel
      ? this.part.getInventoryLabel(this.makeup)
      : this.part.getItemLabel();
    this.damageMeter.setProgress(this.part.damage / this.part.maxDamage);
    this.damageLabel.label =
      this.part.damage <= 0
        ? "Not damaged"
        : `${Math.round((100 * this.part.damage) / this.part.maxDamage)}% damaged (${moneyString(this.part.repairCost())})`;
    if (this.details.isVisible()) {
      this.updateDetails();
    }
    this.updateCrewButton();
    this.updateCrewButtonLabel();
  }
}

interface Damageable {
  damage: number;
  maxDamage: number;
  repairCost(): number;
}

function isDamageable(item: unknown): item is Damageable {
  return (
    (item as Damageable).damage != null &&
    (item as Damageable).maxDamage != null &&
    (item as Damageable).repairCost != null
  );
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
  private details: CanvasUIElement;
  private buttonList: CanvasPanel;
  private shouldUpdateDetails: boolean;
  private resellHalfButton: CanvasButton;
  private resellHalfLabel: CanvasLabel;

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

    this.details = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 3,
    });
    this.shouldUpdateDetails = true;
    this.updateDetails();

    if (isDamageable(this.item)) {
      new CanvasProgressBar({
        parent: this.pane,
        fillX: true,
        childOrdering: "vertical",
        childMargin: 3,
        height: 5,
        progress: this.damageFactor(),
      });
      const damage = this.item.damage;

      if (damage > 0)
        new CanvasLabel({
          parent: this.pane,
          dockX: "center",
          height: 11,
          autoFont: true,
          font: "bold $Hpx sans-serif",
          color: "#fff",
          childOrdering: "vertical",
          childMargin: 2,
          label: `${Math.round(100 * this.damageFactor())}% damaged (${moneyString(this.item.repairCost())} to repair)`,
        });
    }

    this.buttonList = new CanvasPanel({
      parent: this.pane,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 7,
      bgColor: "#00000008",
    });

    const labelArgs = {
      color: "#fff",
      height: 12,
      fillY: 0.3,
      autoFont: true,
      font: "$Hpx sans-serif",
    };
    this.resellHalfButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#22882290",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 13,
      hidden: !this.letResellHalf(),
      callback: this.resellHalf.bind(this),
    });
    this.resellHalfLabel = this.resellHalfButton.label("-", labelArgs);

    this.resellButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#22882290",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 13,
      callback: () => {},
    });
    this.resellLabel = this.resellButton.label("-", labelArgs);
    this.updateResellAction();

    if (this.item instanceof ShipPart) {
      new CanvasButton({
        parent: this.buttonList,
        bgColor: "#22228890",
        childOrdering: "vertical",
        childMargin: 1,
        childFill: 1,
        fillX: true,
        height: 13,
        callback: this.installPart.bind(this),
      }).label("Install Part", labelArgs);
    }
  }

  private damageFactor(): number {
    if (!isDamageable(this.item)) {
      return -1;
    } else {
      return this.item.damage / this.item.maxDamage;
    }
  }

  private updateDetails() {
    const lines = [
      weightInfo(this.item),
      ...(this.item.shopInfo == null ? [] : this.item.shopInfo(this.makeup)),
    ];

    if (lines.length < this.details.children.length) {
      this.details.children
        .slice(lines.length)
        .reverse()
        .forEach((c) => {
          c.remove();
        });
    }

    while (this.details.children.length < lines.length) {
      new CanvasLabel({
        parent: this.details,
        label: "",
        dockX: "start",
        dockMarginX: 4,
        color: "#bbb",
        childOrdering: "vertical",
        childMargin: 1.2,
        height: 9.5,
        autoFont: true,
        font: "$Hpx sans-serif",
      });
    }

    let idx = 0;
    for (const line of lines) {
      (<CanvasLabel>this.details.children[idx]).label = line;
      idx++;
    }
  }

  private resellCost(factor = 1) {
    let repairFactor = 0;
    const damageableItem = <
      ShipItem & { damage?: number; maxDamage: number; repairCostScale: number }
    >this.item;
    if (damageableItem.damage != null) {
      repairFactor = Math.min(
        this.item.cost * 0.9 /* leaving only the scraps! */,
        (damageableItem.damage / damageableItem.maxDamage) *
          damageableItem.repairCostScale,
      );
    }
    return (
      factor *
      (this.item.cost - repairFactor) *
      (this.item.amount || 1) *
      this.resellFactor
    );
  }

  private letResellHalf() {
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

  private fireCrew() {
    const crew = <Crew>this.item;
    crew.unassign();
    this.makeup.inventory.removeItem(this.item);
    this.destroy();
  }

  private updateResellAction() {
    this.resellButton.callback = (
      this.item.type === "crew" ? this.fireCrew : this.resell
    ).bind(this);
    this.resellHalfButton.hidden = !this.letResellHalf();
  }

  public update() {
    this.itemLabel.label = itemLabel(this.item, this.makeup, null);
    this.resellLabel.label =
      this.item.type === "crew"
        ? "Fire"
        : `Resell (${moneyString(this.resellCost())})`;
    this.resellHalfLabel.label = `Resell Half (${moneyString(this.resellCost(0.5))})`;
    this.updateResellAction();
    this.updateDetails();
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
      axis: "horizontal",
      childOrdering: "vertical",
      childMargin: 5,
      childFill: 1,
      fillX: true,
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
    for (const widget of this.itemWidgets) {
      widget.update();
    }
  }
}

interface ShopItemWidgetArgs extends PaneArgs {
  item: ShipItem;
}

class ShopItemWidget extends Pane<
  ShopItemWidgetArgs,
  CanvasUIGroup,
  CanvasUIGroupArgs
> {
  item: ShipItem;

  protected buildPane(args: ShopItemWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasUIGroup(args);
    this.item = args.item;

    new CanvasLabel({
      parent: this.pane,
      height: 12,
      label: itemLabel(this.item, null),
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
      fillX: 1.0,
      callback: this.buyItem.bind(this),
      paddingY: 4,
      childOrdering: "vertical",
      childMargin: 3,
      height: 24,
    }).label(this.item.type === "crew" ? "Hire" : "Buy", {
      font: "bold $Hpx sans-serif",
      color: "#fff",
      fillY: 1.0,
      height: 12,
      dockY: "center",
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

  buildPane(args: PaneShopArgs & CanvasPanelArgs) {
    this.shopItems = args.shopItems;
    this.pane = new CanvasPanel(args);
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
      childFill: 1,
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
        childOrdering: "vertical",
        childMargin: 10,
        paddingX: 12,
        paddingY: 6,
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

    updateList(
      this.shopItems,
      this.itemWidgets,
      (remaining, widget) => remaining.indexOf(widget.item),
      (item) => this.addShopItem(item),
      (item) => this.makeup.inventory.items.indexOf(item) > -1,
    );
  }

  public update() {
    this.furnishItemList();
  }
}

interface PaneDrydockArgs extends PaneArgs {
  hullRepairCostScale?: number;
}

interface ShipMakeWidgetArgs {
  make: ShipMake;
}

interface StatRowOptions {
  name: string;
  stat: (this: StatRow) => string;
}

interface StatRowArgs extends StatRowOptions {
  state: IntermissionState;
  parent: CanvasUIElement;
}

class StatRow {
  makeup: ShipMakeup;
  state: IntermissionState;
  player: Player;
  private pane: CanvasPanel;
  private label: CanvasLabel;
  name: string;
  stat: (this: StatRow) => string;

  constructor(args: StatRowArgs) {
    Object.assign(this, args);
    this.player = this.state.player;
    this.makeup = this.player.makeup;
    this.name = args.name;
    this.stat = args.stat.bind(this);

    this.pane = new CanvasPanel({
      parent: args.parent,
      bgColor: "#eeffff10",
      fillX: 0.9,
      dockX: "center",
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 4,
      paddingY: 5,
    });

    new CanvasLabel({
      parent: this.pane,
      childMargin: 6.5,
      childOrdering: "vertical",
      height: 18,
      label: "> " + args.name,
      color: "#fff",
      autoFont: true,
      font: "bold $Hpx sans-serif",
      dockX: "start",
    });

    this.label = new CanvasLabel({
      childMargin: 4,
      childOrdering: "vertical",
      parent: this.pane,
      label: "-",
      color: "#eee",
      height: 12,
      autoFont: true,
      font: "$Hpx sans-serif",

      dockX: "center",
    });
    this.update();
  }

  update() {
    this.label.label = this.stat();
  }
}

interface PaneStatsArgs extends PaneArgs {
  stats: StatRowOptions[];
}

class PaneStats extends Pane<PaneStatsArgs> {
  statRows: StatRow[];

  private _buildPane(args: PaneStatsArgs) {
    new CanvasLabel({
      parent: this.pane,
      label: "Stats",
      autoFont: true,
      height: 30,
      font: "bold $Hpx sans-serif",
      color: "#fff",
      childMargin: 15,
      childOrdering: "vertical",
    });
    this.statRows = [];

    for (const row of args.stats) {
      this.addRow(row);
    }
  }

  private addRow(options: StatRowOptions) {
    this.statRows.push(
      new StatRow({
        parent: this.pane,
        state: this.state,
        ...options,
      }),
    );
  }

  private updateStats() {
    for (const stat of this.statRows) {
      stat.update();
    }
  }

  protected buildPane(args: PaneStatsArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);

    this._buildPane(args);
    this.updateStats();
  }

  public update() {
    this.updateStats();
  }
}

class ShipMakeWidget extends Pane<
  PaneArgs & ShipMakeWidgetArgs,
  CanvasUIGroup,
  CanvasUIGroupArgs
> {
  private make: ShipMake;
  private detail: CanvasUIGroup;
  private detail2: CanvasUIGroup;
  private switchLabel: CanvasLabel;
  private statusLabel: CanvasLabel;

  protected buildPane(args: PaneArgs & ShipMakeWidgetArgs & CanvasUIGroupArgs) {
    this.pane = new CanvasUIGroup(args);
    this.make = args.make;

    new CanvasLabel({
      parent: this.pane,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      color: "#fff",
      label: this.make.name,
      x: 5,
      childOrdering: "vertical",
      childMargin: 6,
      height: 15,
    });

    const detailGroup = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 10,
      fillX: true,
    });

    this.detail = new CanvasUIGroup({
      parent: detailGroup,
      dockX: "start",
      dockY: "start",
      fillX: 0.5,
      bgColor: "#00003006",
    });

    this.detail2 = new CanvasUIGroup({
      parent: detailGroup,
      dockX: "end",
      dockY: "start",
      bgColor: "#00000018",
      paddingX: 12,
      paddingY: 8,
    });

    this.populateDetail();

    this.switchLabel = new CanvasButton({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 10,
      fillX: true,
      bgColor: "#0082",
      height: 22,
      callback: this.trySwitch.bind(this),
    }).label(this.constructLabel(), {
      color: "#fee",
      height: 14,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });

    this.statusLabel = new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 1,
      color: "#ffa",
      label: "",
      fillX: true,
      height: 12,
      autoFont: true,
      font: "%H sans-serif",
    });
  }

  private getCost() {
    return (
      this.make.cost -
      this.makeup.make.cost *
        (1 -
          (this.makeup.hullDamage * this.makeup.make.repairCostScale) /
            this.makeup.make.maxDamage)
    );
  }

  private constructLabel() {
    const cost = this.getCost();
    return `Buy & Switch to Make (${cost < 0 ? "+" : "-"}${moneyString(Math.abs(cost))}))`;
  }

  private trySwitch() {
    this.statusLabel.label = "";

    if (this.makeup.parts.length > 0) {
      this.statusLabel.label = "Uninstall every ship part first!";
      return;
    }

    const cost = this.getCost();

    if (this.player.money < cost) {
      this.statusLabel.label = "Not enough money!";
      return;
    }

    this.makeup.setMake(this.make);
    this.player.money -= cost;
    this.makeup.hullDamage = 0;
  }

  private slotInfo(slot: PartSlot) {
    return " *  " + slot.type;
  }

  private populateDetail(): void {
    const info = [
      "HP: " + this.make.maxDamage,
      `Size: ${this.make.size * this.make.lateralCrossSection}x${this.make.size}`,
      "Drag: " + this.make.drag,
    ];

    const info2 = ["Slots:", ...this.make.slots.map((s) => this.slotInfo(s))];

    for (const line of info) {
      new CanvasLabel({
        parent: this.detail,
        label: line,
        childMargin: 2,
        childOrdering: "vertical",
        color: "#dde",
        autoFont: true,
        font: "$Hpx sans-serif",
        height: 11,
      });
    }

    for (const line of info2) {
      new CanvasLabel({
        parent: this.detail2,
        label: line,
        childMargin: 2,
        childOrdering: "vertical",
        color: "#eda",
        autoFont: true,
        font: "$Hpx sans-serif",
        height: 11,
      });
    }
  }

  public update() {
    this.pane.hidden = this.make === this.player.makeup.make;
  }
}

interface PaneHarbourArgs extends PaneArgs {
  makes: ShipMake[];
}

class PaneHarbour extends Pane<PaneHarbourArgs> {
  private shipMakeWidgets: ShipMakeWidget[];
  private shipMakeScroller: CanvasScroller;

  protected buildPane(args: PaneHarbourArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.shipMakeWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 15,
      autoFont: true,
      height: 30,
      font: "bold $Hpx sans-serif",
      label: "Harbour",
      color: "#fff",
    });

    this.shipMakeScroller = new CanvasScroller({
      parent: this.pane,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 3,
      bgColor: "#0003",
      axis: "vertical",
    });

    let counter = 0;
    for (const make of args.makes) {
      const bgColor = `#04${counter % 2 ? "00" : "10"}${counter % 2 ? "30" : "20"}80`;
      this.shipMakeWidgets.push(
        new ShipMakeWidget({
          parent: this.shipMakeScroller.contentPane,
          fillX: 0.9,
          fillY: 0.2,
          dockX: "center",
          paddingX: 8,
          paddingY: 12,
          bgColor: bgColor,
          state: this.state,
          childOrdering: "vertical",
          childMargin: 9,
          childFill: 1,
          make: make,
        }),
      );
      counter++;
    }
  }

  public update() {}
}

class PaneDrydock extends Pane {
  private cashCounter: CanvasLabel;
  private repairHullButtonLabel: CanvasLabel;
  private partsScroller: CanvasScroller;
  private partsWidgets: DrydockPartWidget[];
  private inventoryWidget: DrydockInventoryWidget;
  private slotsLabel: CanvasLabel;
  private hullDamageMeter: CanvasProgressBar;

  buildPane(args: PaneDrydockArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.partsWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      label: "Drydock",
      color: "#e8e8ff",
      dockX: "center",
      textAlign: "center",
      height: 30,
      childOrdering: "vertical",
      childMargin: 10,
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
    }).label("-", {
      color: "#ccd",
      height: 13,
      autoFont: true,
      font: "$Hpx sans-serif",
    });
  }

  buildPartsPane() {
    const partsPane = new CanvasPanel({
      parent: this.pane,
      fillX: true,
      dockX: "center",
      childOrdering: "vertical",
      childMargin: 5,
      childFill: 3,
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
      dockX: "center",
      fillX: true,
      resellFactor: 0.6,
      state: this.state,
      childOrdering: "vertical",
      childMargin: 5,
      childFill: 2,
      bgColor: "#0006",
    });
  }

  private addPartItem(part: ShipPart) {
    this.partsWidgets.push(
      new DrydockPartWidget({
        state: this.state,
        parent: this.partsScroller.contentPane,
        bgColor: "#101014d8",
        fillY: 1.0,
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
    this.hullDamageMeter.setProgress(
      this.makeup.hullDamage / this.makeup.make.maxDamage,
    );
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
    return this.makeup.hullRepairCost();
  }
}

class PaneCartography extends Pane {
  doNextLevel() {
    this.game.nextLevel();
  }

  buildPane(args: PaneArgs & CanvasPanelArgs) {
    const state = args.state;
    this.game = state.game;

    this.pane = new CanvasPanel(args);
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
    nextLevelButton.label("Invade Next Island", {
      color: "#ccd",
      height: 18,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });
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
  private changed: boolean;
  private paneScroller: CanvasScroller;

  public init() {
    this.game.setMouseHandler(IntermissionMouseHandler);
    this.game.setKeyboardHandler(IntermissionKeyHandler);
    this.panes = [];
    this.ui = new CanvasRoot(this.game, "#040404");
    this.paneScroller = new CanvasScroller({
      parent: this.ui,
      fillX: 1,
      fillY: 1,
      paddingX: 2,
      paddingY: 2,
      axis: "horizontal",
      scrollbarOpts: {
        thickness: 10,
      },
    });
    this.game.player.makeup.inventory.consolidateInventory();
    this.buildUI();
  }

  addPane<
    PO extends Pane<A, P, PA>,
    A extends PaneArgs = PaneArgs,
    P extends CanvasUIElement = CanvasPanel,
    PA extends CanvasUIArgs = CanvasPanelArgs,
    PT extends Class<PO> = Class<PO>,
  >(paneType: PT, args: Optional<A & PA, "state" | "parent">): PO {
    args = {
      state: this,
      parent: this.paneScroller.contentPane,
      fillX: 0.4,
      fillY: true,
      childOrdering: "horizontal",
      childMargin: 20,
      ...args,
    };
    const res = new paneType(args);
    this.panes.push(res);
    return res;
  }

  private fuelItems() {
    return [
      {
        type: "coal",
        amount: 5,
        repeat: 4,
      },
      {
        type: "coal",
        amount: 20,
        repeat: 2,
      },
      {
        type: "diesel",
        amount: 40,
        repeat: 5,
      },
    ];
  }

  private generateShopItems() {
    return [
      ...PARTDEFS.engine
        .map((d) =>
          Array(d.shopRepeat)
            .fill(0)
            .map(() => instantiatePart(d, "engine")),
        )
        .reduce((a, b) => a.concat(b), []),
      ...PARTDEFS.cannon
        .map((d) =>
          Array(d.shopRepeat)
            .fill(0)
            .map(() => instantiatePart(d, "cannon")),
        )
        .reduce((a, b) => a.concat(b), []),
      ...this.fuelItems()
        .map((p) => {
          const item = {
            name: p.type,
            ...FUEL_PROPS[p.type],
            amount: p.amount,
          };
          return Array(p.repeat)
            .fill(0)
            .map(() => Object.assign({}, item));
        })
        .reduce((a, b) => a.concat(b), [])
        .map((def) => new FuelItem(def)),
      new CannonballAmmo(4, 15),
      new CannonballAmmo(4, 15),
      new CannonballAmmo(4, 40),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(7.5, 15),
      new CannonballAmmo(7.5, 15),
      ...FOODDEFS.map((f) =>
        Array(f.shopRepeat)
          .fill(0)
          .map(() => new FoodItem(f)),
      ).reduce((a, b) => a.concat(b), []),
      ...CREWDEFS.map((c) => new Crew(c)),
    ].filter((i) => i.shopChance == null || Math.random() < i.shopChance);
  }

  private statsRows(): StatRowOptions[] {
    return [
      {
        name: "Salary",
        stat: function (this: StatRow) {
          const totalSalary = this.makeup.crew
            .map((c) => c.nextSalary())
            .reduce((a, b) => a + b, 0);
          if (this.player.money < totalSalary) {
            const hasUnhappy = this.makeup.crew.some((c) => !c.isHappy());
            const soonestRevolt = Math.min(
              ...this.makeup.crew.map(
                (c) => c.maxSalaryWithhold() - c.salaryWithhold,
              ),
            );
            return (
              `You need ${moneyString(totalSalary - this.player.money)} to break even with salaries for next night, at ${moneyString(totalSalary)}/day. ` +
              (hasUnhappy
                ? ""
                : `Otherwise, crew revolts may start in ${soonestRevolt} days.`)
            );
          } else {
            const salaryDays = Math.floor(this.player.money / totalSalary);
            return `You have enough money to pay ${salaryDays} day${salaryDays === 1 ? "" : "s"} worth of salary for your crew, at ${moneyString(totalSalary)}/day.`;
          }
        },
      },
      {
        name: "Food",
        stat: function (this: StatRow) {
          const totalConsumption = this.makeup.crew
            .map((c) => c.caloricIntake)
            .reduce((a, b) => a + b, 0);
          const totalAvailable = this.makeup.food
            .map((f) => f.amount)
            .reduce((a, b) => a + b, 0);

          const message = [
            `You have ${totalAvailable} food points, and your crew consumes ${totalConsumption} a day.`,
          ];

          if (totalAvailable < totalConsumption) {
            message.push(
              `You won't have enough for the end of the next day, unless you loot some.`,
            );
          } else {
            message.push(
              `You have enough for ${Math.floor(totalAvailable / totalConsumption)} days, not counting food spoilage.`,
            );
          }

          return message.join(" ");
        },
      },
      {
        name: "Repairs",
        stat: function (this: StatRow) {
          const totalRepairCost =
            this.makeup.hullRepairCost() +
            this.makeup.parts
              .map((p) => p.repairCost())
              .reduce((a, b) => a + b, 0);

          if (totalRepairCost === 0)
            return "Your ship is completely fixed and needs no repairs.";

          if (totalRepairCost > this.player.money) {
            return `You need ${moneyString(totalRepairCost - this.player.money)} more to fix the ship completely.`;
          } else {
            return `After all fixes, you'll have ${moneyString(this.player.money - totalRepairCost)} left.`;
          }
        },
      },
      {
        name: "Weight",
        stat: function (this: StatRow) {
          return `Your ship weights ${Math.ceil(this.makeup.totalWeight())}kgs; ${Math.ceil(this.makeup.make.weight)}kgs of that is the hull.`;
        },
      },
      {
        name: "Engine Capability",
        stat: function (this: StatRow) {
          return `Your ship, with its current engine arrangement, crew and fuel situation, can output ${Math.round(this.makeup.maxEngineThrust())} kN/s.`;
        },
      },
      {
        name: "Fuel",
        stat: function (this: StatRow) {
          const engines = <Engine[]>this.makeup.getPartsOf("engine");
          const fueled = engines.filter((e) => this.makeup.hasFuel(e.fuelType));
          const consumption = fueled.reduce(
            (accum, engine) => ({
              ...accum,
              [engine.fuelType]:
                (accum[engine.fuelType] || 0) + engine.fuelCost,
            }),
            {},
          );
          const quickest = Object.keys(consumption)
            .map((fuelType) => ({
              type: fuelType,
              duration: this.makeup.totalFuel(fuelType) / consumption[fuelType],
            }))
            .reduce(
              (a, b) => (a == null || a.duration > b.duration ? b : a),
              null,
            );
          return (
            `${fueled.length === engines.length ? "All" : fueled.length === 0 ? "None" : fueled.length} out of your ${engines.length} currently installed engines have fuel.` +
            (quickest == null
              ? ""
              : ` The fuel you'll first run out of is ${quickest.type}, at ${quickest.duration}s.`)
          );
        },
      },
      {
        name: "Manned Parts",
        stat: function (this: StatRow) {
          const parts = this.makeup.parts;
          const manned = parts.filter((p) => p.manned !== false);
          const satisfied = manned.filter((p) => p.alreadyManned());
          return (
            `Of your ship's ${parts.length} currently installed part, ${manned.length === parts.length ? "all" : manned.length === 0 ? "none" : manned.length} are manned.` +
            (manned.length === 0
              ? ""
              : ` Of these, ${satisfied.length === manned.length ? "all" : satisfied.length === 0 ? "none" : satisfied.length} have crew manning them.`)
          );
        },
      },
    ];
  }

  buildUI() {
    this.paneDrydock = this.addPane(PaneDrydock, {
      paddingX: 20,
      bgColor: "#2222",
    });
    this.addPane<PaneShop, PaneShopArgs>(PaneShop, {
      paddingX: 20,
      bgColor: "#2222",
      shopItems: this.generateShopItems(),
    });
    this.addPane<PaneHarbour, PaneHarbourArgs>(PaneHarbour, {
      paddingX: 20,
      bgColor: "#2222",
      makes: MAKEDEFS,
    });
    this.addPane<PaneStats, PaneStatsArgs>(PaneStats, {
      paddingX: 20,
      bgColor: "#2222",
      stats: this.statsRows(),
    });
    this.addPane(PaneCartography, {
      paddingX: 20,
      bgColor: "#2222",
    });

    for (const pane of this.panes) {
      if (pane.update) pane.update();
    }
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

    this.ui.checkUpdateCache();
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

    for (const pane of this.panes) {
      if (pane.update) pane.update();
    }
  }
}
