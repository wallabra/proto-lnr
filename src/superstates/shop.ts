import type { Game } from "../game";
import type { FuelItemArgs, ShipItem } from "../inventory";
import { FoodItem, FuelItem, computeResellCost } from "../inventory";
import { GUIKeyHandler } from "../keyinput";
import type { GameMouseInfo } from "../mouse";
import { GUIMouseHandler } from "../mouse";
import {
  FUEL_PROPS,
  slots,
  CannonballAmmo,
  ShipPart,
  ShipMakeup,
  Crew,
} from "../objects/shipmakeup";
import type { Cannon, Engine, PartSlot, ShipMake } from "../objects/shipmakeup";
import type { FleetMember, Player } from "../player";
import type {
  UIDrawContext,
  CanvasPanelArgs,
  UIEvent,
  CanvasUIGroupArgs,
  CanvasButtonArgs,
  CanvasLabelArgs,
  CanvasUIElement,
  CanvasUIArgs,
  UICallback,
} from "../ui";
import {
  CanvasButton,
  CanvasLabel,
  CanvasPanel,
  CanvasRoot,
  CanvasScroller,
  CanvasUIGroup,
  CanvasProgressBar,
  CanvasTabPanel,
} from "../ui";
import { costString, moneyString, weightString } from "../util";
import { Superstate } from "./base";
import { PARTDEFS } from "../shop/partdefs";
import { instantiatePart } from "../shop/randomparts";
import { CREWDEFS } from "../shop/crewdefs";
import { FOODDEFS } from "../shop/fooddefs";
import type { Class, Optional } from "utility-types";
import { MAKEDEFS } from "../shop/makedefs";
import { arrayCounter } from "../util";
import { addModifiersToAmmo } from "../combat/projectile";
import i18next from "i18next";
import {
  translateFuelType,
  translateItemType,
  translateShipMakeName,
} from "../internationalization";

interface PaneArgs {
  state: IntermissionState;
  makeup?: ShipMakeup;
  game?: Game;
  player?: Player;
}

export const DEFAULT_RESELL_FACTOR = 0.6;

function allOrNone(amount: number, outOf: number) {
  return amount >= outOf
    ? i18next.t("all")
    : amount === 0
      ? i18next.t("none")
      : amount.toString();
}

function weightInfo(item: ShipItem) {
  const amount = item.amount ?? 1;
  const weight = amount * item.weight;

  return i18next.t("intermission.drydock.item.weight", {
    weight: weightString(weight),
  });
}

function itemLabel(
  item: ShipItem,
  makeup: ShipMakeup | null,
  priceFactor: number | null = 1,
) {
  return (
    (item.amount && item.amount > 1
      ? "x" + item.amount.toFixed(item.integerAmounts ? 0 : 2) + " "
      : "") +
    ((makeup && item.getInventoryLabel?.(makeup)) ?? item.getItemLabel()) +
    (priceFactor == null
      ? ""
      : ` (${moneyString(item.cost * priceFactor * (item.amount || 1))})`)
  );
}

function manningRequirements(part: ShipPart) {
  if (!part.manned) return [];

  if (typeof part.manned !== "number") {
    return [i18next.t("shopinfo.manning.needs")];
  } else {
    return [
      i18next.t("shopinfo.manning.needsInterp", {
        manned: part.manned.toFixed(0),
      }),
    ];
  }
}

abstract class Pane<
  A extends PaneArgs = PaneArgs,
  P extends CanvasUIElement = CanvasPanel,
  PA extends CanvasUIArgs = CanvasPanelArgs,
> {
  pane: P;
  protected state: IntermissionState;
  protected game: Game;
  private _makeup: ShipMakeup | null;
  destroyed = false;

  constructor(args: A & PA) {
    Object.assign(this, args);
    this.game = args.game ?? this.state.game;
    this._makeup = args.makeup ?? null;
    this.buildPane(args);
    this.state.panes.push(this);
    if (this.update) this.update();
  }

  public get player(): Player {
    if (this.game.player == null)
      throw new Error(
        "Intermission screen cannot function when there is no Player set in Game",
      );
    return this.game.player;
  }

  public get makeup(): ShipMakeup {
    return this._makeup ?? this.player.makeup;
  }

  public set makeup(makeup: ShipMakeup) {
    this._makeup = makeup;
  }

  protected abstract buildPane(args: PaneArgs & PA): void;
  public abstract update?(): void;

  public destroy() {
    if (!this.destroyed) {
      this.pane.remove();
    }
    this.destroyed = true;
  }
}

interface DrydockPartWidgetArgs extends PaneArgs, CanvasPanelArgs {
  part: ShipPart;
}

class DrydockPartWidget extends Pane<DrydockPartWidgetArgs> {
  part: ShipPart;
  private label: CanvasLabel;
  private details: CanvasUIGroup;
  private damageMeter: CanvasProgressBar;
  private damageLabel: CanvasLabel;
  private repairButton: CanvasButton | null;
  private assignCrewButton: CanvasButton | null;
  private assignCrewLabel: CanvasLabel | null;
  private buttonArgs: Partial<CanvasButtonArgs>;
  private labelArgs: Partial<CanvasLabelArgs>;
  private buttonList: CanvasUIElement;

  protected buildPane(args: DrydockPartWidgetArgs) {
    this.pane = new CanvasPanel(args);

    this.label = new CanvasLabel({
      parent: this.pane,
      label: "-",
      dockX: "start",
      color: "#fff",
      childOrdering: "vertical",
      childMargin: 7.5,
      height: 12,
      font: "bold 13px sans-serif",
    });

    this.details = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 3,
      fillX: true,
    });
    this.updateDetails();

    // TODO: image to represent part

    this.damageMeter = new CanvasProgressBar({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 0,
      fillX: 1.0,
      height: 12,
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
      height: 13,
    };

    if (this.part.damage > 0) {
      this.repairButton = new CanvasButton({
        ...this.buttonArgs,
        parent: this.buttonList,
        callback: this.tryRepair.bind(this) as UICallback,
        bgColor: "#2020f0c0",
      });
      this.repairButton.label("Repair", this.labelArgs);
    }

    this.updateCrewButton();

    new CanvasButton({
      ...this.buttonArgs,
      parent: this.buttonList,
      callback: this.tryUninstall.bind(this) as UICallback,
      bgColor: "#f02020c0",
    }).label(
      i18next.t("intermission.drydock.part.action.uninstall"),
      this.labelArgs,
    );
  }

  private updateCrewButton() {
    if (this.part.manned) {
      if (this.assignCrewButton == null) {
        this.assignCrewButton = new CanvasButton({
          ...this.buttonArgs,
          parent: this.buttonList,
          callback: this.crewButtonAction.bind(this) as UICallback,
          bgColor: "#2040f0c0",
        });
        this.assignCrewLabel = this.assignCrewButton.label("", this.labelArgs);
      }

      this.updateCrewButtonLabel();
    } else if (this.assignCrewButton != null) {
      this.assignCrewButton.remove();
      this.assignCrewButton = null;
      this.assignCrewLabel = null;
    }
  }

  private updateCrewButtonLabel() {
    if (this.assignCrewButton == null || this.assignCrewLabel == null) return;
    this.assignCrewLabel.label = i18next.t(
      "intermission.drydock.part.action." +
        (this.part.alreadyManned() ? "unassignCrew" : "assignCrew"),
    );
  }

  private tryAssignCrew() {
    if (this.part.alreadyManned()) {
      return;
    }

    const success = this.makeup.assignCrewTo(this.part);

    if (success) {
      this.updateCrewButtonLabel();
    }
  }

  private tryUnassignCrew() {
    if (!this.part.alreadyManned()) {
      return;
    }

    this.part.mannedBy.map((c) => c.unassign()).every((a) => a);

    this.updateCrewButtonLabel();
  }

  private crewButtonAction() {
    if (!this.part.manned) return;

    if (!this.part.alreadyManned()) {
      this.tryAssignCrew();
      return;
    } else {
      this.tryUnassignCrew();
      return;
    }
  }

  private tryRepair() {
    this.part.tryRepair(this.player);
    if (this.part.damage === 0 && this.repairButton != null) {
      this.repairButton.remove();
      this.repairButton = null;
    }
  }

  private tryUninstall() {
    if (this.makeup.removePart(this.part)) this.destroy();
  }

  private manningStatus() {
    if (!this.part.manned) return [];

    if (!this.part.alreadyManned()) {
      return [i18next.t("intermission.drydock.part.info.unmanned")];
    } else {
      return [
        i18next.t("intermission.drydock.part.info.manned", {
          mannedBy: this.part.mannedBy
            .map((c) => c.getInventoryLabel(this.makeup))
            .join(", "),
        }),
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
        childMargin: 0.8,
        height: 9.5,
        autoFont: true,
        font: "$Hpx sans-serif",
      });
    } else {
      (this.details.children[idx] as CanvasLabel).label = line;
    }
  }

  private updateDetails() {
    const lines = [
      weightInfo(this.part),
      ...this.part.shopInfo(this.makeup),
      ...manningRequirements(this.part),
      ...this.manningStatus(),
    ];

    lines.forEach((line, i) => {
      this.updateDetailLine(line, i);
    });

    for (const child of this.details.children.slice(lines.length).reverse()) {
      child.remove();
    }
  }

  private checkRemoveRepairButton() {
    if (this.repairButton != null && this.part.damage === 0) {
      this.repairButton.remove();
      this.repairButton = null;
    }
  }

  public update() {
    this.label.label = this.part.getInventoryLabel(this.makeup);
    this.damageMeter.setProgress(this.part.damage / this.part.maxDamage);
    this.damageLabel.label =
      this.part.damage <= 0
        ? i18next.t("intermission.drydock.part.notDamaged")
        : i18next.t("intermission.drydock.part.damaged", {
            percent:
              ((100 * this.part.damage) / this.part.maxDamage).toFixed(0) + "%",
            repairCost: costString(this.part.repairCost()),
          });
    if (this.details.isVisible()) {
      this.updateDetails();
    }
    this.updateCrewButton();
    this.updateCrewButtonLabel();
    this.checkRemoveRepairButton();
  }
}

interface Damageable {
  damage: number;
  maxDamage: number;
  repairCost(): number;
}

function isDamageable(item: unknown): item is Damageable {
  return (
    (item as Partial<Damageable>).damage != null &&
    (item as Partial<Damageable>).maxDamage != null &&
    (item as Partial<Damageable>).repairCost != null
  );
}

interface DrydockInventoryItemWidgetArgs extends PaneArgs {
  item: ShipItem;
  resellFactor: number;
}

class DrydockInventoryItemWidget extends Pane<DrydockInventoryItemWidgetArgs> {
  item: ShipItem;
  private resellFactor: number;
  private resellLabel: CanvasLabel;
  private itemLabel: CanvasLabel;
  private resellButton: CanvasButton;
  private details: CanvasUIElement;
  private buttonList: CanvasPanel;
  private resellHalfButton: CanvasButton;
  private resellHalfLabel: CanvasLabel;
  private moveButton: CanvasButton;
  private moveHalfButton: CanvasButton;
  private dropdown: CanvasScroller | null;
  private setCaptainButton: CanvasButton;

  private get drydockTabPanel() {
    return this.state.paneDrydock.tabPanel;
  }

  private canCaptain() {
    return (
      this.item instanceof Crew &&
      this.item.manningPart == null &&
      this.makeup.captain == null &&
      this.makeup !== this.player.makeup
    );
  }

  protected buildPane(args: DrydockInventoryItemWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.item = args.item;
    this.resellFactor = args.resellFactor;
    this.dropdown = null;

    this.itemLabel = new CanvasLabel({
      parent: this.pane,
      label: "-",
      color: "#fff",
      font: "bold $Hpx sans-serif",
      height: 12,
      autoFont: true,
      x: 15,
      childOrdering: "vertical",
      childMargin: 10,
    });

    this.details = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 3,
    });
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
          label: i18next.t("intermission.drydock.item.damage", {
            damagePerc: (100 * this.damageFactor()).toFixed(0) + "%",
            repairCost: moneyString(this.item.repairCost()),
          }),
        });
    }

    this.buttonList = new CanvasPanel({
      parent: this.pane,
      fillX: true,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 5,
      bgColor: "#00000008",
    });

    const labelArgs: Partial<CanvasLabelArgs> = {
      color: "#fff",
      height: 12,
      fillY: 0.15,
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
      height: 12,
      hidden: !this.letResellHalf(),
      callback: this.resellHalf.bind(this) as UICallback,
    });
    this.resellHalfLabel = this.resellHalfButton.label("-", labelArgs);

    this.resellButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#22882290",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 12,
      callback: () => {},
    });
    this.resellLabel = this.resellButton.label("-", labelArgs);
    this.updateResellAction();

    this.moveButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#11113380",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 12,
      hidden: !this.canMove(),
      callback: this.openMoveDropdown.bind(this, false) as () => void,
    });
    this.moveButton.label(
      i18next.t("intermission.drydock.item.action.fleetMove"),
      labelArgs,
    );

    this.moveHalfButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#11113380",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 12,
      hidden: !(this.canMove() && this.letResellHalf()),
      callback: this.openMoveDropdown.bind(this, true) as () => void,
    });
    this.moveHalfButton.label(
      i18next.t("intermission.drydock.item.action.fleetMoveHalf"),
      labelArgs,
    );

    this.setCaptainButton = new CanvasButton({
      parent: this.buttonList,
      bgColor: "#11113380",
      childOrdering: "vertical",
      childMargin: 1,
      childFill: 1,
      fillX: true,
      height: 12,
      hidden: !this.canCaptain(),
      callback: this.setCaptain.bind(this) as UICallback,
    });
    this.setCaptainButton.label(
      i18next.t("intermission.drydock.item.action.appoint"),
      labelArgs,
    );

    if (this.item instanceof ShipPart) {
      new CanvasButton({
        parent: this.buttonList,
        bgColor: "#22228890",
        childOrdering: "vertical",
        childMargin: 1,
        childFill: 1,
        fillX: true,
        height: 12,
        callback: this.installPart.bind(this) as UICallback,
      }).label(
        i18next.t("intermission.drydock.item.action.install"),
        labelArgs,
      );
    }
  }

  private killDropdown() {
    if (this.dropdown != null) {
      this.dropdown.remove();
      this.dropdown = null;
    }
  }

  private setCaptain() {
    const item = this.item as Crew;
    item.setAsCaptain(this.makeup);
  }

  private openMoveDropdown(half = false) {
    this.killDropdown();
    this.dropdown = new CanvasScroller({
      parent: this.pane,
      layer: 1,
      bgColor: "#008b",
      dockX: "end",
      dockY: "end",
      dockMarginX: 10,
      dockMarginY: 10,
      fillX: 0.5,
      fillY: true,
      axis: "vertical",
      paddingX: 3,
    });

    const nevermindButton = new CanvasButton({
      parent: this.dropdown.contentPane,
      height: 20,
      fillX: true,
      paddingY: 5,
      childOrdering: "vertical",
      childMargin: 5,
      bgColor: "#b8aacc33",
      callback: () => {
        this.killDropdown();
      },
    });
    nevermindButton.label(
      i18next.t("intermission.drydock.item.action.fleetMove.dropdown.cancel"),
      { color: "#ffa", height: 12 },
    );

    for (const member of this.player.fleet) {
      if (member.makeup === this.makeup) continue;

      const moveButton = new CanvasButton({
        parent: this.dropdown.contentPane,
        height: 20,
        fillX: true,
        paddingY: 5,
        childOrdering: "vertical",
        childMargin: 2,
        bgColor: "#aac3",
        callback: this.moveCallback.bind(this, member, half) as () => void,
      });
      moveButton.label(
        i18next.t("intermission.drydock.item.action.fleetMove.dropdown.to", {
          shipName: member.makeup.name,
        }),
        {
          color: "#fff",
          height: 12,
        },
      );
    }
  }

  private moveCallback(member: FleetMember, half = false) {
    const fromMakeup = this.makeup;
    const targMakeup = member.makeup;
    this.drydockTabPanel.tabs.children
      .find(
        (tab) =>
          (tab.content.pane as CanvasPanel & { makeup: ShipMakeup }).makeup ===
          targMakeup,
      )
      ?.activate();

    const amount = this.item.amount ?? 1;

    if (half) {
      let moveAmount = amount / 2;
      if (this.item.integerAmounts) moveAmount = Math.floor(moveAmount);
      this.item.amount = amount - moveAmount;
      const newItem = Object.assign(
        Object.create(
          Object.getPrototypeOf(this.item) as new () => ShipItem,
        ) as ShipItem,
        this.item,
      );
      newItem.amount = moveAmount;
      targMakeup.inventory.addItem(newItem);
    } else {
      fromMakeup.inventory.removeItem(this.item);
      targMakeup.inventory.addItem(this.item);
    }

    this.killDropdown();
    this.destroy();
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
      ...(this.item instanceof ShipPart ? manningRequirements(this.item) : []),
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
        childMargin: 1.5,
        height: 9.6,
        autoFont: true,
        font: "$Hpx sans-serif",
      });
    }

    let idx = 0;
    for (const line of lines) {
      (this.details.children[idx] as CanvasLabel).label = line;
      idx++;
    }
  }

  private resellCost(factor = 1) {
    return computeResellCost(this.item, this.resellFactor) * factor;
  }

  private canMove() {
    if (
      this.item instanceof Crew &&
      (this.item.manningPart != null || this.makeup.captain === this.item)
    ) {
      return false;
    }
    return this.player.fleet.length > 1;
  }

  private letResellHalf() {
    return this.item.amount != null && this.item.amount > 1;
  }

  private resellHalf() {
    const amount = this.item.amount ?? 1;
    if (this.item.integerAmounts) {
      const half = Math.floor(amount / 2);
      this.item.amount = amount - half;
      this.player.money += this.item.cost * half * this.resellFactor;
    } else {
      this.player.money += this.resellCost(0.5);
      this.item.amount = amount / 2;
    }

    this.update();
  }

  private resell() {
    // makeup is guaranteed to be non-null if player is non-null
    this.makeup.inventory.removeItem(this.item);
    this.player.money += this.resellCost();
    this.destroy();
  }

  private installPart() {
    if (!(this.item instanceof ShipPart)) {
      return;
    }

    const item = this.item;

    if (this.makeup.addPart(item) == null) return;

    this.destroy();
  }

  private fireCrew() {
    const crew = this.item as Crew;
    crew.unassign();
    this.makeup.inventory.removeItem(this.item);
    this.destroy();
  }

  private updateResellAction() {
    this.resellButton.callback = () => {
      if (this.item.type === "crew") {
        this.fireCrew();
      } else {
        this.resell();
      }
    };
    this.resellHalfButton.hidden = !this.letResellHalf();
  }

  public update() {
    if (this.makeup.inventory.items.indexOf(this.item) === -1) {
      this.destroy();
      return;
    }
    this.itemLabel.label = itemLabel(this.item, this.makeup);
    this.resellLabel.label =
      this.item.type === "crew"
        ? i18next.t("intermission.drydock.item.action.fireCrew")
        : i18next.t("intermission.drydock.item.action.resell", {
            value: costString(-this.resellCost()),
          }); //`Resell (${moneyString(this.resellCost())})`;
    this.resellHalfLabel.label = i18next.t(
      "intermission.drydock.item.action.resellHalf",
      { value: costString(-this.resellCost(0.5)) },
    );
    this.updateResellAction();
    this.updateDetails();
    this.moveHalfButton.hidden = !(this.canMove() && this.letResellHalf());
    this.moveButton.hidden = !this.canMove();
    this.setCaptainButton.hidden = !this.canCaptain();
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
      if (widget.update != null && widget.pane.isVisible()) widget.update();
      remaining.splice(idx, 1);
    }
  }

  for (const item of remaining) {
    if (!shouldSkip?.(item)) {
      add(item);
    }
  }

  return widgets.filter((w) => !w.destroyed);
}

interface DrydockInventoryWidgetArgs extends PaneArgs {
  resellFactor: number;
}

class DrydockInventoryWidget extends Pane<DrydockInventoryWidgetArgs> {
  private itemList: CanvasScroller;
  private resellFactor: number;
  private itemWidgets: DrydockInventoryItemWidget[];

  protected buildPane(args: DrydockInventoryWidgetArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.itemWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      label: i18next.t("intermission.drydock.inventory"),
      height: 20,
      autoFont: true,
      color: "#fddc",
      font: "$Hpx sans-serif",
      childOrdering: "vertical",
      childMargin: 10,
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

  private addItem(shipItem: ShipItem) {
    this.itemWidgets.push(
      new DrydockInventoryItemWidget({
        parent: this.itemList.contentPane,
        makeup: this.makeup,
        item: shipItem,
        resellFactor: this.resellFactor,
        state: this.state,
        bgColor: "#fff2",
        fillX: 0.1,
        width: 250,
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
          (i) => this.makeup.parts.indexOf(i as ShipPart) === -1,
        ).length &&
      this.makeup.inventory.items.every((item) =>
        this.itemList.contentPane.children.some((child) => {
          const widget = this.itemWidgets.find(
            (widget) => widget.pane === child,
          );
          return widget != null && widget.item === item;
        }),
      )
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
      (item) => this.makeup.parts.indexOf(item as ShipPart) !== -1,
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

    const header = new CanvasUIGroup({
      parent: this.pane,
      height: 14,
      fillX: true,
      childOrdering: "vertical",
      childMargin: 6,
      paddingX: 0,
      paddingY: 0,
    });

    new CanvasLabel({
      parent: header,
      height: 13.5,
      fillY: true,
      label: itemLabel(this.item, null),
      font: "bold $Hpx sans-serif",
      color: "#fff",
      autoFont: true,
      childOrdering: "horizontal",
      childMargin: 5,
    });

    new CanvasLabel({
      parent: header,
      height: 11.5,
      fillY: true,
      label: moneyString(this.item.cost),
      font: "$Hpx sans-serif",
      color: "#999",
      autoFont: true,
      childOrdering: "horizontal",
      childMargin: 2,
    });

    const detailLines: string[] = [
      ...(this.item.shopInfo?.() ?? []),
      ...(this.item instanceof ShipPart ? manningRequirements(this.item) : []),
    ];

    for (const line of detailLines) {
      const infoLabel = new CanvasLabel({
        parent: this.pane,
        height: 11.25,
        label: "* " + line,
        font: "$Hpx sans-serif",
        autoFont: true,
        color: "#d0d0d8",
        childOrdering: "vertical",
        childMargin: 2,
      });
      const addedHeight = infoLabel.height + infoLabel.childMargin * 2;
      this.pane.height += addedHeight;
      if (typeof this.pane.fillY === "number" && this.pane.parent != null)
        this.pane.fillY += addedHeight / this.pane.parent.innerHeight;
    }

    new CanvasButton({
      parent: this.pane,
      fillX: 1.0,
      callback: this.buyItem.bind(this) as () => void,
      paddingY: 4,
      childOrdering: "vertical",
      childMargin: 3,
      height: 24,
    }).label(
      i18next.t(
        "intermission.shop." + (this.item.type === "crew" ? "hire" : "buy"),
      ),
      {
        font: "bold $Hpx sans-serif",
        color: "#fff",
        fillY: 1.0,
        height: 12,
        dockY: "center",
        autoFont: true,
      },
    );
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
      label: i18next.t("intermission.shop"),
      color: "#e8e8ff",
      dockX: "center",
      height: 30,
      childOrdering: "vertical",
      childMargin: 12,
    });

    this.itemList = new CanvasScroller({
      parent: this.pane,
      bgColor: "#0006",
      childOrdering: "vertical",
      childMargin: 15,
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
        childMargin: 6,
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

    updateList(
      this.shopItems,
      this.itemWidgets,
      (remaining, widget) => remaining.indexOf(widget.item),
      (item) => {
        this.addShopItem(item);
      },
      (item) => this.makeup.inventory.items.indexOf(item) > -1,
    );
  }

  public update() {
    this.furnishItemList();
  }
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
  makeup: ShipMakeup;
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
    if (this.state.player == null)
      throw new Error("Non-null state.player required in StatRow");
    this.player = this.state.player;
    this.name = args.name;
    this.stat = args.stat.bind(this) as (this: StatRow) => string;

    this.pane = new CanvasPanel({
      parent: args.parent,
      bgColor: "#eeffff10",
      dockX: "center",
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 6,
      paddingY: 4,
      paddingX: 7,
      fillX: 0.9,
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
      label: i18next.t("intermission.drydock.stats"),
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
        makeup: this.makeup,
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
  private buyLabel: CanvasLabel;
  private statusLabel: CanvasLabel;

  protected buildPane(args: PaneArgs & ShipMakeWidgetArgs & CanvasUIGroupArgs) {
    this.pane = new CanvasUIGroup(args);
    this.make = args.make;

    const header = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 6,
      height: 20,
      paddingY: 0,
      paddingX: 0,
      fillX: true,
    });

    new CanvasLabel({
      parent: header,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      color: "#fff",
      label: translateShipMakeName(this.make),
      fillY: true,
      height: 13.5,
      childOrdering: "horizontal",
      childMargin: 4,
    });

    new CanvasLabel({
      parent: header,
      autoFont: true,
      font: "bold $Hpx sans-serif",
      color: "#999",
      label: moneyString(this.make.cost),
      fillY: 0.7,
      height: 11.25,
      dockY: "center",
      childOrdering: "horizontal",
      childMargin: 4,
    });

    const detailGroup = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 10,
      fillX: true,
    });

    this.detail = new CanvasUIGroup({
      parent: detailGroup,
      fillX: 0.5,
      bgColor: "#00003006",
      childOrdering: "horizontal",
      childFill: 1,
    });

    this.detail2 = new CanvasUIGroup({
      parent: detailGroup,
      bgColor: "#00000018",
      paddingX: 12,
      paddingY: 8,
      childOrdering: "horizontal",
      childFill: 1,
    });

    this.populateDetail();

    this.switchLabel = new CanvasButton({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 10,
      fillX: true,
      bgColor: "#0082",
      height: 22,
      callback: this.trySwitch.bind(this) as () => void,
    }).label(this.constructSwitchLabel(), {
      color: "#fee",
      height: 14,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });

    this.buyLabel = new CanvasButton({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 10,
      fillX: true,
      bgColor: "#0082",
      height: 22,
      callback: this.tryBuy.bind(this) as () => void,
    }).label(this.constructBuyLabel(), {
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
    return this.make.cost;
  }

  private getSwitchCost() {
    return this.make.cost - this.makeup.hullResellCost();
  }

  private constructSwitchLabel() {
    const cost = this.getSwitchCost();
    return i18next.t("intermission.harbor.ship.action.switch", {
      cost: costString(cost),
    });
  }

  private constructBuyLabel() {
    const cost = this.getCost();
    return i18next.t("intermission.harbor.ship.action.buy", {
      cost: costString(cost),
    });
  }

  private tryBuy() {
    this.statusLabel.label = "";

    const cost = this.getCost();

    if (this.player.money < cost) {
      this.statusLabel.label = i18next.t(
        "intermission.harbor.ship.status.cannotAfford",
      );
      return;
    }

    this.buy();
    this.destroy();
  }

  private trySwitch() {
    this.statusLabel.label = "";

    if (this.makeup.parts.length > 0) {
      this.statusLabel.label = i18next.t(
        "intermission.harbor.ship.status.mustUninstall",
      );
      return;
    }

    const cost = this.getSwitchCost();

    if (this.player.money < cost) {
      this.statusLabel.label = i18next.t(
        "intermission.harbor.ship.status.cannotAfford",
      );
      return;
    }

    this.switch();
    this.destroy();
  }

  private buy() {
    const cost = this.getCost();
    const makeup = new ShipMakeup({ make: this.make });
    this.player.money -= cost;
    this.player.fleet.push({ makeup: makeup });
    this.destroy();
  }

  private switch() {
    const cost = this.getSwitchCost();
    this.makeup.setMake(this.make);
    this.player.money -= cost;
    this.makeup.hullDamage = 0;
    this.destroy();
  }

  private slotInfo(slot: PartSlot) {
    return " *  " + translateItemType(slot.type);
  }

  private populateDetail(): void {
    const info = [
      i18next.t("intermission.harbor.ship.hp", {
        maxDamage: this.make.maxDamage.toFixed(1),
      }),
      i18next.t("intermission.harbor.ship.size", {
        size:
          ((this.make.size * this.make.lateralCrossSection) / 10).toFixed(2) +
          "m",
        lateralSize: (this.make.size / 10).toFixed(2) + "m",
      }),
    ];

    const info2 = [
      i18next.t("intermission.harbor.slots"),
      ...this.make.slots.map((s) => this.slotInfo(s)),
    ];

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
    this.switchLabel.label = this.constructSwitchLabel();
    this.buyLabel.label = this.constructBuyLabel();
  }
}

interface PaneHarborArgs extends PaneArgs {
  makes: ShipMake[];
}

class PaneHarbor extends Pane<PaneHarborArgs> {
  private shipMakeWidgets: ShipMakeWidget[];
  private shipMakeScroller: CanvasScroller;

  protected buildPane(args: PaneHarborArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.shipMakeWidgets = [];

    new CanvasLabel({
      parent: this.pane,
      childOrdering: "vertical",
      childMargin: 15,
      autoFont: true,
      height: 30,
      font: "bold $Hpx sans-serif",
      label: i18next.t("intermission.harbor"),
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

interface PaneDrydockShipArgs extends PaneArgs {
  hullRepairCostScale?: number;
  member: FleetMember;
  stats: StatRowOptions[];
  tabPanel: CanvasTabPanel;
}

class PaneDrydockShip extends Pane<
  PaneDrydockShipArgs,
  CanvasPanel & { member: FleetMember }
> {
  private repairHullButtonLabel: CanvasLabel;
  private partsScroller: CanvasScroller;
  private partsWidgets: DrydockPartWidget[];
  private inventoryWidget: DrydockInventoryWidget;
  private slotsLabel: CanvasLabel;
  private hullDamageMeter: CanvasProgressBar;
  member: FleetMember;
  private statsPane: PaneStats;
  private captainStatus: CanvasLabel;
  private unsetCaptainButton: CanvasButton;
  private disbandShipButton: CanvasButton;
  private disbandShipHullButton: CanvasButton;
  private disbandShipLabel: CanvasLabel;
  private disbandShipHullLabel: CanvasLabel;

  buildPane(args: PaneDrydockShipArgs & CanvasPanelArgs) {
    const member = args.member;
    this.pane = new CanvasPanel(args) as CanvasPanel & { member: FleetMember };
    this.pane.member = member;
    this.partsWidgets = [];
    this.makeup = this.member.makeup;

    const mainArea = new CanvasPanel({
      parent: this.pane,
      childOrdering: "vertical",
      fillX: true,
      childFill: 1,
      childMargin: 0,
      bgColor: "#0000",
    });

    const shipManager = new CanvasPanel({
      parent: mainArea,
      fillY: true,
      childOrdering: "horizontal",
      childFill: 2,
      bgColor: "#0000",
    });

    this.captainStatus = new CanvasLabel({
      parent: shipManager,
      label: "-",
      font: "$Hpx sans-serif",
      height: 17,
      autoFont: true,
      childOrdering: "vertical",
      childMargin: 5,
      x: 8,
    });

    const shipActions = new CanvasUIGroup({
      parent: shipManager,
      fillX: true,
      height: 40,
      paddingX: 3,
      paddingY: 3,
      childOrdering: "vertical",
      childMargin: 4,
    });
    this.unsetCaptainButton = new CanvasButton({
      parent: shipActions,
      height: 20,
      width: 120,
      x: 10,
      childOrdering: "horizontal",
      childMargin: 3,
      childFill: 1,
      hidden: !this.canUnsetCaptain(),
      callback: () => {
        this.makeup.captain = null;
      },
    });
    this.unsetCaptainButton.label("Unset Captain", { color: "#fff" });

    this.disbandShipHullButton = new CanvasButton({
      parent: shipActions,
      height: 20,
      width: 120,
      x: 10,
      childOrdering: "horizontal",
      childMargin: 3,
      childFill: 1,
      hidden: !this.canDisbandShip(),
      callback: this.disbandShip.bind(this, false) as () => void,
    });
    this.disbandShipHullLabel = this.disbandShipHullButton.label(
      "Disband Ship & Sell Hull",
      { color: "#fff", height: 12 },
    );

    this.disbandShipButton = new CanvasButton({
      parent: shipActions,
      height: 20,
      width: 120,
      x: 10,
      childOrdering: "horizontal",
      childMargin: 3,
      childFill: 1,
      hidden: !this.canDisbandShip(),
      callback: this.disbandShip.bind(this, true) as () => void,
    });
    this.disbandShipLabel = this.disbandShipButton.label(
      "Disband Ship & Sell All",
      { color: "#fff", height: 12 },
    );

    this.buildPartsPane(shipManager);
    this.buildInventoryPane(shipManager);
    this.buildAutoManagementPane(shipManager);

    this.hullDamageMeter = new CanvasProgressBar({
      parent: shipManager,
      fillX: 0.5,
      height: 5,
      progress: this.makeup.hullDamage / this.makeup.make.maxDamage,
      dockX: "center",
      childMargin: 0,
      childOrdering: "vertical",
    });

    this.repairHullButtonLabel = new CanvasButton({
      parent: shipManager,
      fillX: 0.5,
      height: 40,
      callback: this.doRepairHull.bind(this) as () => void,
      dockX: "center",
      childMargin: 0,
      childOrdering: "vertical",
    }).label("-", {
      color: "#ccd",
      height: 13,
      autoFont: true,
      font: "$Hpx sans-serif",
    });

    this.statsPane = new PaneStats({
      parent: mainArea,
      fillY: true,
      makeup: this.makeup,
      state: this.state,
      stats: args.stats,
      paddingX: 8,
      paddingY: 8,
      childOrdering: "horizontal",
      childFill: 1,
      bgColor: "#5572",
    });

    this.update();
  }

  buildPartsPane(parent: CanvasUIElement) {
    const partsPane = new CanvasPanel({
      parent: parent,
      fillX: true,
      dockX: "center",
      childOrdering: "vertical",
      childMargin: 5,
      childFill: 3,
      bgColor: "#0006",
    });

    new CanvasLabel({
      parent: partsPane,
      label: i18next.t("intermission.drydock.parts"),
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

  private canUnsetCaptain() {
    return this.makeup !== this.player.makeup && this.makeup.captain != null;
  }

  private buildInventoryPane(parent: CanvasUIElement) {
    this.inventoryWidget = new DrydockInventoryWidget({
      parent: parent,
      dockX: "center",
      fillX: true,
      resellFactor: DEFAULT_RESELL_FACTOR,
      state: this.state,
      makeup: this.makeup,
      childOrdering: "vertical",
      childMargin: 5,
      childFill: 2,
      bgColor: "#0006",
    });
  }

  private buildAutoManagementPane(parent: CanvasUIElement) {
    const group = new CanvasPanel({
      parent: parent,
      fillX: true,
      paddingX: 4,
      childOrdering: "vertical",
      childMargin: 5,
      height: 22,
      bgColor: "#0002",
    });

    new CanvasButton({
      parent: group,
      childOrdering: "horizontal",
      childFill: 1,
      childMargin: 5,
      fillY: true,
      bgColor: "#AAF5",
      callback: () => {
        this.autoInstall();
      },
    }).label(i18next.t("intermission.drydock.autoInstall"), {
      color: "#ccdd",
      height: 12,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });

    new CanvasButton({
      parent: group,
      childOrdering: "horizontal",
      childFill: 1,
      childMargin: 5,
      fillY: true,
      bgColor: "#AAF5",
      callback: () => {
        this.autoResell();
      },
    }).label(i18next.t("intermission.drydock.autoResell"), {
      color: "#ccdd",
      height: 12,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });

    new CanvasButton({
      parent: group,
      childOrdering: "horizontal",
      childFill: 1,
      childMargin: 5,
      fillY: true,
      bgColor: "#AAF5",
      callback: () => {
        this.autoRepair();
      },
    }).label(i18next.t("intermission.drydock.autoRepair"), {
      color: "#ccdd",
      height: 12,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });
  }

  private autoInstall() {
    // keep doing passes until no change occur
    let passes = 100;

    while (passes > 0) {
      let changed = false;
      passes--;

      for (const item of this.makeup.inventory.items
        .filter(
          (a): a is ShipPart =>
            a instanceof ShipPart &&
            this.makeup.parts.indexOf(a) === -1 &&
            a.canAutoInstall(this.makeup),
        )
        .sort((a, b) =>
          b.type !== a.type ? 0 : b.strictBetterThan(a) ? 1 : -1,
        )) {
        const surplusStrength = this.makeup.inventory.items
          .filter((i) => i instanceof Crew && i.manningPart == null)
          .map((c) => (c as Crew).strength)
          .reduce((a, b) => a + b, 0);

        if (
          this.makeup.make.slots.filter((s) => s.type === item.type).length >
            this.makeup.parts.filter((p) => p.type === item.type).length &&
          !(typeof item.manned === "number" && surplusStrength < item.manned)
        ) {
          this.makeup.addPart(item);
          this.makeup.assignCrewTo(item);
          changed = true;
          continue;
        }

        const replaceCandidates = this.makeup.parts
          .filter(
            (p) =>
              p.type === item.type &&
              p instanceof item.constructor &&
              item.strictBetterThan(p) &&
              surplusStrength + (typeof p.manned === "number" ? p.manned : 0) >=
                (typeof item.manned === "number" ? item.manned : 0),
          )
          .sort((a, b) => (b.strictBetterThan(a) ? 1 : -1));

        if (replaceCandidates.length === 0) continue;

        replaceCandidates[0].unassignCrew();
        this.makeup.removePart(replaceCandidates[0]);
        this.makeup.addPart(item);
        this.makeup.assignCrewTo(item);
        changed = true;
      }

      if (!changed) {
        break;
      }
    }

    this.inventoryWidget.update();
    this.updatePartsList();
    this.updateSlotsLabel();
  }

  private autoRepair() {
    if (this.makeup.hullDamage > 0) {
      if (this.player.money === 0) return;
      this.makeup.tryRepairHull(this.player);
    }

    for (const part of this.makeup.parts.sort(
      (a, b) => +(a.type === "engine") - +(b.type === "engine"),
    )) {
      if (part.damage > 0) {
        if (this.player.money === 0) return;
        part.tryRepair(this.player);
      }
    }

    this.updatePartsList();
    this.updateRepairLabel();
  }

  private autoResell() {
    for (const item of Array.from(this.makeup.inventory.items)) {
      if (!item.autoResell?.(this.makeup)) continue;

      this.makeup.inventory.removeItem(item);

      if (!(item instanceof Crew))
        this.player.money += computeResellCost(item, DEFAULT_RESELL_FACTOR);
    }

    this.inventoryWidget.update();
    this.updatePartsList();
  }

  private addPartItem(part: ShipPart) {
    this.partsWidgets.push(
      new DrydockPartWidget({
        state: this.state,
        makeup: this.makeup,
        parent: this.partsScroller.contentPane,
        bgColor: "#101014d8",
        fillY: 1.0,
        fillX: 0.1,
        width: 250,
        part: part,
        childOrdering: "horizontal",
        childMargin: 8,
      }),
    );
  }

  private updatePartsList() {
    if (
      this.partsScroller.contentPane.children.length ===
        this.makeup.parts.length &&
      this.makeup.parts.every((part) =>
        this.partsScroller.contentPane.children.some((child) => {
          const widget = this.partsWidgets.find(
            (widget) => widget.pane === child,
          );
          return widget != null && widget.part === part;
        }),
      )
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

  private canDisbandShip() {
    return this.player.fleet.length > 1;
  }

  private disbandResellValue() {
    return this.makeup.totalValue() + this.makeup.hullResellCost();
  }
  private disbandHullResellValue() {
    return this.makeup.hullResellCost();
  }

  private updateDisbandButton() {
    const canDisband = this.canDisbandShip();
    this.disbandShipButton.hidden = !canDisband;
    this.disbandShipHullButton.hidden = !canDisband;
    if (!canDisband) return;

    this.disbandShipLabel.label = `Disband & Resell Ship w/Contents (+${moneyString(this.disbandResellValue())})`;
    this.disbandShipHullLabel.label = `Disband & Resell Ship Only (+${moneyString(this.disbandHullResellValue())})`;
  }

  private get drydockTabPanel() {
    return this.state.paneDrydock.tabPanel;
  }

  private disbandShip(sellAll = false) {
    if (!this.canDisbandShip()) return;
    const idx = this.player.fleet.indexOf(this.member);
    if (idx === -1) return;

    this.player.fleet.splice(idx, 1);

    this.player.money += sellAll
      ? this.disbandResellValue()
      : this.disbandHullResellValue();

    if (this.player.makeup === this.makeup) {
      this.player.makeup = this.player.fleet[0].makeup;
      this.player.fleet[0].makeup.unassignCaptain();
    }

    if (!sellAll) {
      const from = this.makeup;
      const to = this.player.makeup;

      for (const item of from.inventory.items) {
        from.inventory.removeItem(item);
        to.inventory.addItem(item);
      }
    }

    const tab = this.drydockTabPanel.tabs.children.find(
      (tab) => tab.content.pane === this.pane,
    );
    const nextTab = this.drydockTabPanel.tabs.children.find(
      (otherTab) => otherTab !== tab,
    );
    if (tab == null || nextTab == null) {
      throw new Error(
        "Couldn't find necessary tabs for ship disband UI updates",
      );
    }
    nextTab.activate();
    if (nextTab.content.update != null) nextTab.content.update();
    tab.remove();
    this.destroy();
  }

  private updateSlotsLabel() {
    const makeSlots = slots(this.makeup.make);
    const partTypes = arrayCounter(this.makeup.parts.map((p) => p.type));

    const labelParts: string[] = [];

    for (const name of makeSlots.keys()) {
      labelParts.push(
        `${translateItemType(name)} (${(partTypes.get(name) ?? 0).toString() || "0"}/${(makeSlots.get(name) as number).toString()})`,
      );
    }

    this.slotsLabel.label = i18next.t("intermission.drydock.slots", {
      slots: labelParts.join(", "),
    });
  }

  public update() {
    this.updateRepairLabel();
    this.updatePartsList();
    this.updateSlotsLabel();
    this.statsPane.update();
    this.inventoryWidget.update();
    this.updateCaptainStatus();
    this.updateDisbandButton();
  }

  private updateCaptainStatus() {
    const isPlayer = this.makeup === this.player.makeup;

    this.captainStatus.label = isPlayer
      ? "Captain: you!"
      : this.member.makeup.captain == null
        ? "This ship needs a captain, or it will not embark on the next day's journey!"
        : "Captain: " + this.member.makeup.captain.nameInDeck(this.makeup);
    this.captainStatus.color =
      !isPlayer && this.member.makeup.captain == null ? "#f99" : "#fff";

    this.unsetCaptainButton.hidden = !this.canUnsetCaptain();
  }

  private updateRepairLabel() {
    if (this.makeup.hullDamage === 0) {
      this.repairHullButtonLabel.label = i18next.t(
        "intermission.drydock.repair.healthy",
      );
    } else {
      this.repairHullButtonLabel.label = i18next.t(
        "intermission.drydock.repair.damaged",
        { repairCost: moneyString(this.repairCost()) },
      );
    }
    this.hullDamageMeter.setProgress(
      this.makeup.hullDamage / this.makeup.make.maxDamage,
    );
  }

  doRepairHull() {
    this.makeup.tryRepairHull(this.player);
    this.updateRepairLabel();
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
      label: i18next.t("intermission.cartography"),
      color: "#e8e8ff",
      font: "25px sans-serif",
      dockX: "center",
    });

    const nextLevelButton = new CanvasButton({
      parent: this.pane,
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
      fillX: 0.5,
      height: 100,
      callback: this.doNextLevel.bind(this) as () => void,
    });
    nextLevelButton.label(i18next.t("intermission.cartography.invade"), {
      color: "#ccd",
      height: 18,
      autoFont: true,
      font: "bold $Hpx sans-serif",
    });
  }

  public update = undefined;
}

interface PaneDrydockArgs extends PaneArgs {
  stats: StatRowOptions[];
}

class PaneDrydock extends Pane<PaneDrydockArgs> {
  private members: PaneDrydockShip[];
  tabPanel: CanvasTabPanel;
  private stats: StatRowOptions[];

  protected buildPane(args: PaneArgs & CanvasPanelArgs) {
    this.pane = new CanvasPanel(args);
    this.members = [];

    new CanvasLabel({
      parent: this.pane,
      label: i18next.t("intermission.drydock"),
      color: "#e8e8ff",
      dockX: "center",
      height: 30,
      childOrdering: "vertical",
      childMargin: 10,
    });

    this.tabPanel = new CanvasTabPanel({
      parent: this.pane,
      paddingX: 8,
      paddingY: 8,
      fillX: true,
      childFill: 1,
      childOrdering: "vertical",
      childMargin: 3,
      bgColor: "#AAA2",
      tabs: [],
      tabOptions: {
        childMargin: 6,
        labelArgs: {
          color: "#fff",
          height: 16,
        },
      },
    });
    this.update();
  }

  private addMember(member: FleetMember) {
    const widget = new PaneDrydockShip({
      state: this.state,
      member,
      makeup: member.makeup,
      fillX: true,
      fillY: true,
      bgColor: "#0001",
      parent: this.tabPanel.contentPane,
      stats: this.stats,
      tabPanel: this.tabPanel,
    });
    this.members.push(widget);
    this.tabPanel.addTab({
      label: member.makeup.name,
      content: widget,
    });
    return widget;
  }

  private updateTabColors() {
    for (const tab of this.tabPanel.tabs.children) {
      const member = (tab.content.pane as PaneDrydockShip["pane"]).member;

      tab.colors = {
        inactive:
          member.makeup === this.player.makeup
            ? "#040a"
            : member.makeup.captain == null
              ? "#400a"
              : "#0014",
        active:
          member.makeup === this.player.makeup
            ? "#262a"
            : member.makeup.captain == null
              ? "#622a"
              : "#2256",
      };
      tab.updateColor();
    }
  }

  public update() {
    this.members = updateList(
      Array.from(this.player.fleet),
      this.members,
      (remaining, widget) => remaining.indexOf(widget.member),
      (item) => this.addMember(item),
    );
    this.updateTabColors();
  }
}

export class IntermissionState extends Superstate {
  ui: CanvasPanel;
  panes: Pane<PaneArgs, CanvasUIElement, CanvasUIArgs>[];
  paneDrydock: PaneDrydock;
  private paneTabs: CanvasTabPanel;
  private cashCounter: CanvasLabel;

  public override init() {
    this.game.setMouseHandler(GUIMouseHandler);
    this.game.setKeyboardHandler(GUIKeyHandler);
    this.panes = [];
    this.ui = new CanvasRoot(this.game, "#040404");
    this.cashCounter = new CanvasLabel({
      parent: this.ui,
      childOrdering: "vertical",
      childMargin: 5,
      label: "-",
      color: "#e8e8ff",
      font: "$Hpx sans-serif",
      height: 14.5,
      autoFont: true,
      dockX: "center",
      dockMarginX: 50,
    });
    this.updateCashCounter();
    this.paneTabs = new CanvasTabPanel({
      parent: this.ui,
      childOrdering: "vertical",
      childFill: 1,
      childMargin: 1,
      fillX: 1,
      paddingX: 2,
      tabs: [],
      bgColor: "#0000",
      tabOptions: {
        childMargin: 3,
        labelArgs: {
          color: "#fff",
          height: 16,
        },
      },
    });
    if (this.game.player != null)
      this.game.player.makeup.inventory.consolidateInventory();
    this.buildUI();
  }

  addPane<
    PO extends Pane<A, P, PA>,
    A extends PaneArgs = PaneArgs,
    P extends CanvasUIElement = CanvasPanel,
    PA extends CanvasUIArgs = CanvasPanelArgs,
  >(
    paneName: string,
    paneType: Class<PO>,
    args: Optional<A & PA, "state" | "parent">,
  ): PO {
    args = {
      state: this,
      parent: this.paneTabs.contentPane,
      fillX: true,
      fillY: true,
      ...args,
    };
    const res = new paneType(args);
    this.paneTabs.addTab({ label: paneName, content: res });
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

  private generateShopItems(): ShipItem[] {
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
      ...PARTDEFS.vacuum
        .map((d) =>
          Array(d.shopRepeat)
            .fill(0)
            .map(() => instantiatePart(d, "vacuum")),
        )
        .reduce((a, b) => a.concat(b), []),
      ...this.fuelItems()
        .map((p) => {
          const item = {
            name: p.type,
            ...FUEL_PROPS[p.type],
            amount: p.amount,
          } as FuelItemArgs;
          return Array(p.repeat)
            .fill(0)
            .map(() => Object.assign({}, item));
        })
        .reduce((a, b) => a.concat(b), [])
        .map((def) => new FuelItem(def)),
      new CannonballAmmo(4, 15),
      new CannonballAmmo(4, 15),
      new CannonballAmmo(4, 15),
      new CannonballAmmo(4, 30),
      new CannonballAmmo(4, 30),
      new CannonballAmmo(4, 40),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(5.5, 15),
      new CannonballAmmo(5.5, 30),
      new CannonballAmmo(5.5, 30),
      new CannonballAmmo(6.2, 5),
      new CannonballAmmo(6.2, 5),
      new CannonballAmmo(6.2, 15),
      new CannonballAmmo(6.2, 15),
      new CannonballAmmo(7.5, 10),
      new CannonballAmmo(7.5, 10),
      ...FOODDEFS.map((f) =>
        Array(f.shopRepeat)
          .fill(0)
          .map(() => new FoodItem(f)),
      ).reduce((a, b) => a.concat(b), []),
      ...CREWDEFS.map((c) => new Crew(c)),
    ]
      .map((item: ShipItem) => {
        if (item instanceof CannonballAmmo) addModifiersToAmmo(item);
        return item;
      })
      .filter((i) => i.shopChance == null || Math.random() < i.shopChance);
  }

  private statsRows(): StatRowOptions[] {
    return [
      {
        name: i18next.t("intermission.drydock.stats.salary.name"),
        stat: function (this: StatRow) {
          const totalSalary = this.makeup.totalSalary();
          if (this.player.money < totalSalary) {
            const hasUnhappy = this.makeup.crew.some((c) => !c.isHappy());
            const soonestRevolt = Math.min(
              ...this.makeup.crew.map(
                (c) => c.maxSalaryWithhold() - c.salaryWithhold,
              ),
            );
            return (
              i18next.t("intermission.drydock.stats.salary.info.insufficient", {
                money: costString(this.player.money - totalSalary),
                salary: moneyString(totalSalary),
              }) +
              (hasUnhappy
                ? ""
                : i18next.t(
                    "intermission.drydock.stats.salary.info.strikeSoon",
                    { strikesIn: soonestRevolt.toString() },
                  ))
            );
          } else {
            const salaryDays = Math.floor(this.player.money / totalSalary);
            return i18next.t(
              "intermission.drydock.stats.salary.info.sufficient" +
                (salaryDays === 1 ? "" : ".pluralDays"),
              {
                days: salaryDays,
                salary: moneyString(totalSalary),
              },
            );
          }
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.food.name"),
        stat: function (this: StatRow) {
          const totalConsumption = this.makeup.crew
            .map((c) => c.caloricIntake)
            .reduce((a, b) => a + b, 0);
          const totalAvailable = this.makeup.food
            .map((f) => f.amount)
            .reduce((a, b) => a + b, 0);

          const info = {
            food: totalAvailable.toFixed(1),
            totalIntake: totalConsumption.toFixed(1),
            days: Math.floor(totalAvailable / totalConsumption).toString(),
          };

          const message = [
            i18next.t(
              "intermission.drydock.stats.food.info.head" +
                (totalAvailable === 1 ? "" : ".plural"),
              info,
            ),
            i18next.t(
              "intermission.drydock.stats.food.info." +
                (totalAvailable < totalConsumption
                  ? "insufficient"
                  : "sufficient"),
              info,
            ),
          ];

          return message.join(" ");
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.repairs.name"),
        stat: function (this: StatRow) {
          const totalRepairCost = this.makeup.totalRepairCost();

          if (totalRepairCost === 0)
            return i18next.t("intermission.drydock.stats.repairs.info.intact");

          return i18next.t(
            "intermission.drydock.stats.repair.info." +
              (totalRepairCost > this.player.money
                ? "insufficient"
                : "sufficient"),
            {
              cost: costString(totalRepairCost),
              missingMoney: moneyString(totalRepairCost - this.player.money),
              remaining: moneyString(this.player.money - totalRepairCost),
            },
          );
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.weight.name"),
        stat: function (this: StatRow) {
          return i18next.t("intermission.drydock.stats.weight.info", {
            totalWeight: weightString(this.makeup.totalWeight()),
            hullWeight: weightString(this.makeup.hullWeight()),
          });
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.engines.name"),
        stat: function (this: StatRow) {
          const thrust = this.makeup.maxEngineThrust();
          return i18next.t(
            "intermission.drydock.stats.engines.info" +
              (thrust === 0 ? ".none" : ""),
            {
              totalThrust: (thrust / 1000).toFixed(2),
            },
          );
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.fuel.name"),
        stat: function (this: StatRow) {
          const engines = this.makeup.getPartsOf("engine") as Engine[];
          const fueled = engines.filter(
            (engine) =>
              engine.fuelType == null || this.makeup.hasFuel(engine.fuelType),
          );
          const consumption = fueled
            .filter((engine) => engine.fuelType != null)
            .reduce(
              (
                accum: Record<string, number>,
                engine: Engine & { fuelType: string },
              ) => ({
                ...accum,
                [engine.fuelType]:
                  (accum[engine.fuelType] || 0) + engine.fuelCost,
              }),
              {},
            );
          const needMore = engines
            .map((engine) => engine.fuelType)
            .filter((fuelType) => fuelType != null)
            .filter((fuelType) => !this.makeup.hasFuel(fuelType));
          const quickest = Object.keys(consumption)
            .map((fuelType) => ({
              type: fuelType,
              duration: this.makeup.totalFuel(fuelType) / consumption[fuelType],
            }))
            .reduce(
              (a: { type: string; duration: number } | null, b) =>
                a == null || a.duration > b.duration ? b : a,
              null,
            );

          const info = {
            fueled: allOrNone(fueled.length, engines.length),
            numEngines: engines.length.toString(),
            missingFuelTypes: needMore
              .map((fuelType) => translateFuelType(fuelType))
              .join(", "),
            quickest:
              quickest == null ? null : translateFuelType(quickest.type),
            quickestDuration:
              quickest == null ? null : quickest.duration.toFixed(1) + "s",
          };

          return [
            i18next.t("intermission.drydock.stats.fuel.info.head", info),
            i18next.t("intermission.drydock.stats.fuel.info.quickest", info),
            ...(fueled.length === engines.length
              ? []
              : [i18next.t("intermission.drydock.stats.fuel.info.need", info)]),
          ].join(" ");
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.ammo.name"),
        stat: function (this: StatRow) {
          const cannons = this.makeup.getPartsOf("cannon") as Cannon[];
          const loaded = cannons.filter((c) => this.makeup.hasAmmo(c.caliber));
          const missingCalibers = cannons
            .filter((c) => !this.makeup.hasAmmo(c.caliber))
            .reduce(
              (set, can) => (set.add(can.caliber), set),
              new Set<number>(),
            );

          const info = {
            loaded: allOrNone(loaded.length, cannons.length),
            numCannons: cannons.length.toString(),
            missingCalibers:
              missingCalibers.size === 0
                ? ""
                : Array.from(missingCalibers.keys())
                    .map((caliber) => (caliber * 10).toFixed(0) + "mm")
                    .join(", "),
          };

          return [
            i18next.t("intermission.drydock.stats.ammo.info.head", info),
            ...(missingCalibers.size === 0
              ? []
              : [i18next.t("intermission.drydock.stats.ammo.info.need", info)]),
          ].join(" ");
        },
      },
      {
        name: i18next.t("intermission.drydock.stats.manned.name"),
        stat: function (this: StatRow) {
          const parts = this.makeup.parts;
          const manned = parts.filter((p) => p.manned !== false);
          const satisfied = manned.filter((p) => p.alreadyManned());

          return i18next.t("intermission.drydock.stats.manned.info", {
            numParts: parts.length.toString(),
            numNeedManned: allOrNone(manned.length, parts.length).toLowerCase(),
            numManned: allOrNone(satisfied.length, manned.length).toLowerCase(),
          });
        },
      },
    ];
  }

  buildUI() {
    this.paneDrydock = this.addPane<PaneDrydock, PaneDrydockArgs>(
      i18next.t("intermission.drydock"),
      PaneDrydock,
      {
        paddingX: 20,
        bgColor: "#2222",
        stats: this.statsRows(),
      },
    );
    this.addPane<PaneShop, PaneShopArgs>(
      i18next.t("intermission.shop"),
      PaneShop,
      {
        paddingX: 20,
        bgColor: "#2222",
        shopItems: this.generateShopItems(),
      },
    );
    this.addPane<PaneHarbor, PaneHarborArgs>(
      i18next.t("intermission.harbor"),
      PaneHarbor,
      {
        paddingX: 20,
        bgColor: "#2222",
        makes: MAKEDEFS.filter(
          (make) => make.shopChance == null || Math.random() < make.shopChance,
        ),
      },
    );
    this.addPane(i18next.t("intermission.cartography"), PaneCartography, {
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

  public tick() {
    // no-op
  }

  private updateCashCounter() {
    if (this.player == null) {
      this.cashCounter.label = "";
      return;
    }
    this.cashCounter.label = i18next.t("intermission.moneyCounter", {
      money: moneyString(this.player.money),
    });
  }

  mouseEvent(event: MouseEvent & GameMouseInfo) {
    const uiEvent: UIEvent = Object.assign(event, { consumed: false });

    if (event.inside) event.inside.handleEvent(uiEvent);
    else this.ui.handleEvent(uiEvent);

    this.updateCashCounter();
    for (const pane of this.panes) {
      if (!pane.pane.hidden && pane.update != null) pane.update();
    }
  }
}
