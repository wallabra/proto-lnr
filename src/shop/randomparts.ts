import match from "rustmatchjs";
import type {
  ArmorArgs,
  CannonArgs,
  EngineArgs,
  ShipMake,
  ShipPart,
  ShipPartArgsSuper,
  VacuumArgs,
} from "../objects/shipmakeup";
import { Armor, Cannon, Engine, Vacuum, slots } from "../objects/shipmakeup";
import type { AnyPartDef, PartDef } from "./partdefs";
import { PARTDEFS } from "./partdefs";
import random from "random";
import { pickByRarity } from "./rarity";

const smallestRarity = new Map<string, number>();
const meanRarity = new Map<keyof typeof PARTDEFS, number>();
const maxRarity = new Map<keyof typeof PARTDEFS, number>();

for (const type of Object.keys(PARTDEFS) as (keyof typeof PARTDEFS)[]) {
  meanRarity.set(
    type,
    PARTDEFS[type]
      .filter(
        (def): def is AnyPartDef & { rarity: number } =>
          def.rarity !== "always",
      )
      .map((def) => def.rarity)
      .reduce((a, b) => a + b, 0) / PARTDEFS[type].length,
  );
  maxRarity.set(
    type,
    PARTDEFS[type]
      .filter(
        (def): def is AnyPartDef & { rarity: number } =>
          def.rarity !== "always",
      )
      .map((def) => def.rarity)
      .reduce((a, b) => (a > b ? a : b), -Infinity),
  );
  smallestRarity.set(
    type,
    PARTDEFS[type]
      .filter(
        (def): def is AnyPartDef & { rarity: number } =>
          def.rarity !== "always",
      )
      .map((def) => def.rarity)
      .reduce((a, b) => (a < b ? a : b), Infinity),
  );
}

export function instantiatePart(def: AnyPartDef, type: string): ShipPart {
  const part = match<string, ShipPart>(
    type,
    match.val(
      "cannon",
      new Cannon(def as PartDef<CannonArgs & ShipPartArgsSuper>),
    ),
    match.val(
      "engine",
      new Engine(def as PartDef<EngineArgs & ShipPartArgsSuper>),
    ),
    match.val("vacuum", new Vacuum(def as PartDef<VacuumArgs>)),
    match.val("armor", new Armor(def as PartDef<ArmorArgs>)),
    match._(() => {
      throw new Error("Can't handle unknown part type: " + type);
    }),
  );
  return part;
}

export default function randomParts(
  allocRarity: number,
  forMake?: ShipMake,
  temperature = 0,
): ShipPart[] {
  let available = allocRarity;

  let makeSlots = new Map<keyof typeof PARTDEFS, number>();

  if (forMake != null) {
    makeSlots = slots(forMake) as Map<keyof typeof PARTDEFS, number>;
  } else {
    for (const partType in PARTDEFS) {
      makeSlots.set(partType as keyof typeof PARTDEFS, NaN);
    }
  }

  let availableSlots = Array.from(makeSlots.keys())
    // 'as number' because must exist
    .map((k) => makeSlots.get(k) as number)
    .reduce((a, b) => a + b, 0);

  // Start with the parts of rarity 'always'
  const res = (Object.keys(PARTDEFS) as (keyof typeof PARTDEFS)[]).reduce<
    ShipPart[]
  >(
    (a: ShipPart[], b) =>
      a.concat(
        (PARTDEFS[b] as AnyPartDef[])
          .filter((p) => p.rarity === "always")
          .map((d) => {
            // 'as number' because must be non-zero
            makeSlots.set(b, (makeSlots.get(b) as number) - 1);
            availableSlots--;
            return instantiatePart(d, b);
          }),
      ),
    [],
  );

  // console.log(
  //   `Allocated ${allocRarity.toString()} rarity for spawning a ${forMake != null ? forMake.name + " " : ""}ship, w/ temperature ${temperature.toString()}`,
  // );

  while (
    availableSlots > 0 &&
    available >
      Math.min(
        ...Array.from(makeSlots.keys()).map(
          (k) => smallestRarity.get(k) as number,
        ),
      )
  ) {
    const type = random.choice(Array.from(makeSlots.keys()));
    if (type === undefined) break;

    if (available < (smallestRarity.get(type) ?? 0)) continue;

    // Calculate extra temperature (based on points exceeding mean rarity)
    const myMeanRarity = meanRarity.get(type) as number;
    const myMaxRarity = maxRarity.get(type) as number;
    const extraTemperature = Math.max(
      0,
      Math.min(
        1,
        0.5 * ((available - myMeanRarity) / (myMaxRarity / myMeanRarity)),
      ),
    );

    const def = pickByRarity<AnyPartDef>(
      PARTDEFS[type] as AnyPartDef[],
      available,
      temperature + extraTemperature,
    );

    if (def == null)
      throw new Error(
        "Could not pick a definition, when should be guaranteed by smallestRarity",
      );

    const part: ShipPart = instantiatePart(def, type);
    // console.log(
    //   "* " + part.getItemLabel(),
    //   extraTemperature === 0
    //     ? ""
    //     : `(extra temperature: ${extraTemperature.toFixed(3)})`,
    // );

    res.push(part);
    available -= def.rarity as number;
    availableSlots--;
    // 'as number' because must be non-zero
    makeSlots.set(type, (makeSlots.get(type) as number) - 1);
    if (makeSlots.get(type) === 0) makeSlots.delete(type);
  }

  // console.log();

  return res;
}
