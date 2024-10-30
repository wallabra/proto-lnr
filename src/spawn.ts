//! Continuous spawning related definitions and methods.

import type { Optional } from "utility-types";
import type { ShipMake } from "./objects/shipmakeup";
import type { RandomRange, WeightedItem } from "./util";
import { maybeRange, maybeRangeInt, maybeWeighted, rwc } from "./util";
import random from "random";
import type { PlayState } from "./superstates/play";
import Victor from "victor";
import type { Ship, ShipParams } from "./objects/ship";
import { MAKEDEFS } from "./shop/makedefs";
import { makeBonusValuables } from "./valuable";

/// Extra parameters for how a ship should be spawned.
export interface SpawnParams {
  /// Whether the ship will be armed.
  armed: boolean | number;

  /// A linear factor for how much food will be added to the ship.
  ///
  /// 1 gives enough food for the whole crew for 2 days.
  ///
  /// Defaults to 1.
  foodFactor?: number | RandomRange;

  /// A linear scale for how much ammo to give the ship.
  ///
  /// Defaults to 1.
  ammoFactor?: number | RandomRange;

  /// A linear scale for how much fuel to give the ship.
  ///
  /// Defaults to 1.
  fuelFactor?: number | RandomRange;

  /// How much extra loots o add, e.g. for "merchant" type ships.
  ///
  /// This consists on uninstalled parts other 'valuable' items.
  ///
  /// Defaults to 0.
  extraLoot?: number | RandomRange;

  /// Linear scale for the 'bonus' to apply to the ship's random parts.
  ///
  /// Defaults to 1.
  bonusFactor?: number | RandomRange;

  /// Linear offset for the 'bonus' to apply to the ship's random parts.
  ///
  /// Defaults to 0.
  extraBonus?: number | RandomRange;
}

/// A definition for an individual spawn.
///
/// Produced by a [SpawnClass] when polled for the next spawn.
export interface IndividualSpawn extends SpawnParams {
  /// The make of the ship to be spawned.
  make: ShipMake;
}

/// A definition for a spawn with randomized make.
///
/// Used by [SpawnClass] when producing the next [IndividualSpawnDef]s.
export interface RandomizedSpawnParams extends SpawnParams {
  /// The makes of the involved ships to be spawned.
  make: ShipMake | WeightedItem<ShipMake>[];
}

export function pollRandomParam(def: RandomizedSpawnParams): IndividualSpawn {
  return {
    ...def,
    make: maybeWeighted(def.make),
  };
}

/// The options to pass to make a new [SpawnClass].
export interface SpawnClassArgs {
  head: RandomizedSpawnParams;
  squad: RandomizedSpawnParams | WeightedItem<RandomizedSpawnParams>[];
  squadSize?: number | RandomRange;
}

/**
 * Defines a class of squads that can be spawned, such as
 * fishers, travelers, and escorted merchants.
 */
export class SpawnClass {
  head: RandomizedSpawnParams;
  squad: RandomizedSpawnParams | WeightedItem<RandomizedSpawnParams>[];
  squadSize: number | RandomRange;

  constructor(args: Optional<SpawnClassArgs, "squadSize">) {
    this.head = args.head;
    this.squad = args.squad;
    this.squadSize = args.squadSize ?? 0;
  }

  /**
   * Give an instance of definitions of ships to spawn.
   *
   * Decides the makes and squad size at random within the defined parameters.
   *
   * The first element of the list is always the head of the squad.
   */
  produce_defs(): IndividualSpawn[] {
    const squadSize = maybeRangeInt(this.squadSize);
    return [
      pollRandomParam(this.head),
      ...(new Array(squadSize) as number[])
        .fill(0)
        .map(() => pollRandomParam(maybeWeighted(this.squad))),
    ];
  }

  spawnSquad(
    state: PlayState,
    pos: Victor,
    args?: Partial<ShipParams>,
    radiusBonus = 0,
  ): Ship[] {
    const defs = this.produce_defs();

    if (defs.length === 0)
      throw new Error("No individual defs produced to spawn a squad");

    const difficultyBonus = state.game.difficulty * 2;

    const [headDef, ...squadDefs] = defs;

    const head = spawnShipOnDef(
      headDef,
      state,
      pos,
      args,
      9 + state.game.difficulty * 3 + difficultyBonus,
    );

    const squad = [head];

    let attempts = 0;
    const squadSize = defs.length;

    let nextDef;
    while ((nextDef = squadDefs.shift()) !== undefined) {
      if (attempts > 3 * squadSize) {
        break;
      }

      const shipPos = new Victor(
        nextDef.make.size * nextDef.make.lateralCrossSection * 2 +
          400 +
          radiusBonus * Math.sqrt(Math.random()),
        0,
      )
        .rotateBy(Math.random() * Math.PI * 2)
        .add(pos);

      // loop until aceelration >= head acceleration (to follow)
      let ship;
      let catchupAttempts = 10;
      do {
        const newShip = spawnShipOnDef(
          nextDef,
          state,
          shipPos,
          args,
          difficultyBonus,
        );
        if (
          ship == null ||
          newShip.makeup.maxAcceleration() > ship.makeup.maxAcceleration()
        ) {
          if (ship != null) ship.dying = true;
          ship = newShip;
        } else {
          newShip.dying = true;
        }
        catchupAttempts--;
      } while (
        ship.makeup.maxAcceleration() < head.makeup.maxAcceleration() &&
        catchupAttempts > 0
      );

      // spawn away from player
      if (
        state.player?.possessed != null &&
        ship.pos.clone().subtract(state.player.possessed.pos).length() <
          ship.size * ship.lateralCrossSection +
            state.player.possessed.size *
              state.player.possessed.lateralCrossSection +
            1200 &&
        pos.clone().subtract(state.player.possessed.pos).length() >
          state.player.possessed.size *
            state.player.possessed.lateralCrossSection +
            1200
      ) {
        ship.dying = true;
        attempts++;
        continue;
      }

      // do not spawn on the ground
      if (ship.floor > state.waterLevel * 0.5) {
        ship.dying = true;
        attempts++;
        continue;
      }

      ship.follow(head);
      squad.push(ship);
    }

    for (const ship of squad) {
      state.makeAIFor(ship);

      //-- fun mode 1: instant shower of death
      // if (
      //   state.player != null &&
      //   state.player.possessed != null &&
      //   ship.makeup.nextReadyCannon != null
      // ) {
      //   ship.aggro(state.player.possessed);
      // }

      //-- fun mode 2: everyone loves you & protects you to death
      // if (
      //   Math.random() < 0.3 &&
      //   ship.makeup.nextReadyCannon != null &&
      //   state.player != null &&
      //   state.player.possessed != null
      // ) {
      //   ship.follow(state.player.possessed);
      // }
    }

    return squad;
  }
}

/**
 * Spawn a ship based on an individual spawn def.
 */
export function spawnShipOnDef(
  def: IndividualSpawn,
  state: PlayState,
  pos: Victor,
  args?: Partial<ShipParams>,
  bonus = 0,
): Ship {
  const ship = state.makeShip(pos, {
    ...(args ?? {}),
    make: def.make,
  });

  ship.makeup.giveRandomParts(
    typeof def.armed === "number"
      ? random.uniform(0, 1)() < def.armed
      : def.armed,
    bonus * maybeRange(def.bonusFactor ?? 1) + maybeRange(def.extraBonus ?? 0),
    maybeRange(def.ammoFactor ?? 1),
    maybeRange(def.fuelFactor ?? 1),
    maybeRange(def.foodFactor ?? 1),
  );

  // apply extra loot
  if (def.extraLoot != null) {
    const extraLoot = maybeRange(def.extraLoot);

    if (extraLoot > 0) {
      for (const valuable of makeBonusValuables(extraLoot)) {
        ship.makeup.inventory.addItem(valuable);
      }
    }
  }

  return ship;
}

function findMake(name: string): ShipMake {
  return MAKEDEFS.find((def) => def.name === name) ?? MAKEDEFS[0];
}

export const SPAWN_CLASSES: Record<string, WeightedItem<SpawnClass>> = {
  LONE_MERCHANT: {
    item: new SpawnClass({
      head: {
        make: [
          {
            item: findMake("patroller"),
            weight: 5,
          },
          {
            item: findMake("queenBee"),
            weight: 5,
          },
          {
            item: findMake("hubris"),
            weight: 4,
          },
          {
            item: findMake("dependableDave"),
            weight: 1.25,
          },
        ],
        armed: 0.4,
        foodFactor: 2.5,
        fuelFactor: 2.5,
        ammoFactor: 0.4,
        extraLoot: { min: 0.5, max: 2 },
      },
      squad: [],
      squadSize: 0,
    }),
    weight: 1,
  },

  ESCORTED_MERCHANT: {
    item: new SpawnClass({
      head: {
        make: [
          {
            item: findMake("hubris"),
            weight: 6,
          },
          {
            item: findMake("dependableDave"),
            weight: 4,
          },
          {
            item: findMake("wispOfTheMorning"),
            weight: 3,
          },
        ],
        armed: 0.2,
        foodFactor: 3,
        fuelFactor: 3,
        extraLoot: { min: 1.5, max: 5 },
      },
      squad: {
        make: [
          {
            item: findMake("patroller"),
            weight: 3,
          },
          {
            item: findMake("hubris"),
            weight: 1,
          },
        ],
        armed: true,
        ammoFactor: 1.2,
        bonusFactor: 1.5,
        extraBonus: 1,
      },
      squadSize: { min: 1, max: 5 },
    }),
    weight: 1 / 3,
  },

  TRAVELLER: {
    item: new SpawnClass({
      head: {
        make: [
          {
            item: findMake("hubris"),
            weight: 4,
          },
          {
            item: findMake("dependableDave"),
            weight: 3,
          },
          {
            item: findMake("wispOfTheMorning"),
            weight: 1.25,
          },
        ],
        armed: 0.66,
        foodFactor: 2,
        fuelFactor: 1.5,
        extraLoot: 3,
        extraBonus: 1.5,
      },
      squad: {
        make: [
          {
            item: findMake("patroller"),
            weight: 2,
          },
          {
            item: findMake("hubris"),
            weight: 1,
          },
        ],
        armed: 0.5,
        extraLoot: { min: 0.4, max: 1 },
        ammoFactor: 0.6,
        foodFactor: 1.1,
        bonusFactor: 0.9,
      },
      squadSize: { min: 0, max: 2 },
    }),
    weight: 1 / 6,
  },

  FISHER: {
    item: new SpawnClass({
      head: {
        make: findMake("fisherman"),
        armed: false,
        foodFactor: 1.5,
        extraLoot: 0.2,
      },
      squad: [],
      squadSize: 0,
    }),
    weight: 4,
  },

  BATTLESHIP: {
    weight: 1 / 30,
    item: new SpawnClass({
      head: {
        make: [
          {
            item: findMake("jasper"),
            weight: 10,
          },
          {
            item: findMake("marieAntoniette"),
            weight: 9,
          },
          {
            item: findMake("vickyVictorious"),
            weight: 6,
          },
        ],
        armed: true,
        ammoFactor: 5,
        fuelFactor: 3,
        extraBonus: 2,
        extraLoot: { min: 0, max: 2 },
        foodFactor: 2.5,
      },
      squad: {
        make: [
          {
            item: findMake("patroller"),
            weight: 4,
          },
          {
            item: findMake("hubris"),
            weight: 3,
          },
          {
            item: findMake("highHarpooner"),
            weight: 3,
          },
          {
            item: findMake("highSeasRoberts"),
            weight: 2,
          },
        ],
        armed: true,
        extraBonus: 0.5,
        ammoFactor: 2,
        fuelFactor: 1.2,
        extraLoot: { min: 0, max: 0.5 },
      },
      squadSize: { min: 0, max: 3 },
    }),
  },

  PIRATE: {
    weight: 1 / 30,
    item: new SpawnClass({
      head: {
        make: [
          {
            item: findMake("highHarpooner"),
            weight: 8,
          },
          {
            item: findMake("highSeasRoberts"),
            weight: 6,
          },
          {
            item: findMake("wispOfTheMorning"),
            weight: 8,
          },
          {
            item: findMake("jasper"),
            weight: 3,
          },
        ],
        armed: true,
        ammoFactor: 2,
        extraLoot: { min: 1, max: 4 },
        extraBonus: 1,
        bonusFactor: 1.2,
        foodFactor: 0.8,
      },
      squad: {
        make: [
          {
            item: findMake("hubris"),
            weight: 4,
          },
          {
            item: findMake("queenBee"),
            weight: 7,
          },
        ],
        armed: true,
        bonusFactor: 1.1,
        extraBonus: 0.5,
        ammoFactor: 1.2,
        foodFactor: 0.6,
        fuelFactor: 1.5,
        extraLoot: 0.2,
      },
      squadSize: { min: 0, max: 5 },
    }),
  },
};

export function getRandomSpawnClass(temperature = 0): SpawnClass {
  return rwc(
    Object.keys(SPAWN_CLASSES).map((key) => SPAWN_CLASSES[key]),
    temperature,
  );
}
