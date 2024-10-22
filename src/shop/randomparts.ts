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

  const smallestRarity = new Map<string, number>();

  makeSlots.forEach((_, parttype) => {
    const defs = PARTDEFS[parttype] as AnyPartDef[];
    const smallest = Math.min(
      ...defs.map((def) => def.rarity).filter((rarity) => rarity !== "always"),
    );
    smallestRarity.set(parttype, smallest);
  });

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

  while (
    availableSlots > 0 &&
    available >
      Math.min(
        ...Array.from(smallestRarity.keys()).map(
          (k) => smallestRarity.get(k) as number,
        ),
      )
  ) {
    const type = random.choice(Array.from(makeSlots.keys()));
    if (type === undefined) break;

    if (available < (smallestRarity.get(type) ?? 0)) continue;

    const def = pickByRarity<AnyPartDef>(
      PARTDEFS[type] as AnyPartDef[],
      available,
      temperature,
    );

    const part: ShipPart = instantiatePart(def, type);

    res.push(part);
    available -= def.rarity as number;
    availableSlots--;
    // 'as number' because must be non-zero
    makeSlots.set(type, (makeSlots.get(type) as number) - 1);
    if (makeSlots.get(type) === 0) makeSlots.delete(type);
  }

  return res;
}
