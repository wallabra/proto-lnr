import { Game } from "../game";
import { IntermissionKeyHandler } from "../keyinput";
import { GameMouseInfo, IntermissionMouseHandler } from "../mouse";
import { ShipMakeup, ShipPart } from "../objects/shipmakeup";
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

type DefaultPaneArgs = PaneArgs & CanvasSplitPanelArgs;

abstract class Pane<A extends PaneArgs = PaneArgs, P extends CanvasUIElement = CanvasSplitPanel, PA extends CanvasUIArgs = CanvasSplitPanelArgs> {
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

class DrydockPartWidget extends Pane<DrydockPartWidgetArgs, CanvasPanel, CanvasPanelArgs> {
  private part: ShipPart;
  private label: CanvasLabel;
  private damageMeter: CanvasProgressBar;
  private damageLabel: CanvasLabel;

  protected buildPane(args: DrydockPartWidgetArgs) {
    this.pane = new CanvasPanel(args);
    
    this.label = new CanvasLabel({
      parent: this.pane,
      label: '-',
      dockX: 'start',
      color: '#fff',
      childOrdering: 'vertical',
      childMargin: 5,
      height: 13,
      font: 'bold 13px sans-serif'
    })
    
    // TODO: image to represent part
    
    this.damageMeter = new CanvasProgressBar({
      parent: this.pane,
      childOrdering: 'vertical',
      childMargin: 0,
      fillX: 1.0,
      height: 30
    });
    
    this.damageLabel = new CanvasLabel({
      parent: this.damageMeter,
      font: '11px sans-serif',
      label: '-',
      color: '#e2d8d8'
    });
    
    const actions = new CanvasUIGroup({
      parent: this.pane,
      childOrdering: 'vertical',
      childMargin: 5,
    });
    
    const buttonArgs: Partial<CanvasButtonArgs> = {
      fillX: 1.0,
      height: 20,
      childOrdering: 'vertical',
      childMargin: 1
    }
    
    const labelArgs: Partial<CanvasLabelArgs> = {
      color: '#fffe',
      font: '11px monospaced',  
    }
    
    new CanvasButton({
      ...buttonArgs,
      parent: actions,
      callback: this.tryRepair.bind(this),
      bgColor: '#2020f0c0'
    }).label("Repair", labelArgs);
    
    new CanvasButton({
      ...buttonArgs,
      parent: actions,
      callback: this.tryUninstall.bind(this),
      bgColor: '#f02020c0'
    }).label("Uninstall", labelArgs);
  }
  
  private tryRepair() {
    this.part.tryRepair(this.player);
  }
  
  private tryUninstall() {
    this.makeup.parts.splice(this.makeup.parts.indexOf(this.part), 1);
  }
  
  public update() {
    this.label.label = this.part.getItemLabel();
    this.damageMeter.progress = this.part.damage / this.part.maxDamage;
    this.damageLabel.label = `${Math.round(100 * this.part.damage / this.part.maxDamage)}% damaged ${moneyString(this.part.repairCost())})`;
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
      childOrdering: 'vertical',
      childMargin: 20,
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
    
    this.buildPartsPane();;

    this.repairHullButtonLabel = new CanvasButton({
      parent: this.pane,
      fillX: 0.5,
      height: 40,
      callback: this.doRepairHull.bind(this),
      dockX: "center",
      dockY: "end",
      dockMarginY: 50,
    }).label("-", { color: "#ccd" });
  }
  
  buildPartsPane() {
    const partsPane = new CanvasPanel({
      parent: this.pane,
      fillX: 1.0,
      fillY: 0.5,
      dockX: 'center',
      childOrdering: 'vertical',
      childMargin: 5,
      bgColor: '#0006'
    });
    
    new CanvasLabel({
      parent: partsPane,
      label: "Parts",
      dockX: 'start',
      dockY: 'start',
      dockMarginX: 10,
      dockMarginY: 10,
      color: '#fddc',
      font: '20px sans-serif',
      childOrdering: 'vertical',
      childMargin: 10,
    });
    
    this.partsScroller = new CanvasScroller({
      parent: partsPane,
      axis: "horizontal",
      childOrdering: 'vertical',
      childMargin: 20,
      fillX: 1.0,
      fillY: 1.0,
      bgColor: '#0000'
    });
  }
  
  private addPartItem(part: ShipPart) {
    this.partsWidgets.push(new DrydockPartWidget({
      state: this.state,
      parent: this.partsScroller,
      bgColor: '#101014d8',
      fillY: 0.8,
      fillX: 0.15,
      part: part,
      childOrdering: 'horizontal',
      childMargin: 8
    }));
  }
  
  private updatePartsList() {
    this.partsScroller.clearChildren();
    this.partsWidgets = [];
    
    for (const part of this.makeup.parts) {
      this.addPartItem(part);
    }
  }

  public update() {
    this.updateCashCounter();
    this.updateRepairLabel();
    this.updatePartsList();
    
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
  panes: Pane<any, any, any>[];

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
      axis: "vertical",
      splits: 2,
      index: 0,
      bgColor: "#2222",
    });
    this.addPane(PaneCartography, {
      paddingX: 20,
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
