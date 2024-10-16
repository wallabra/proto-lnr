import match from "rustmatchjs";
import type {
  CannonArgs,
  EngineArgs,
  ShipMake,
  ShipPart,
  ShipPartArgsSuper,
  VacuumArgs,
} from "../objects/shipmakeup";
import { Cannon, Engine, Vacuum, slots } from "../objects/shipmakeup";
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

  let makeSlots: Map<string, number> = new Map();

  if (forMake != null) {
    makeSlots = slots(forMake);
  } else {
    for (const partType in PARTDEFS) {
      makeSlots.set(partType, NaN);
    }
  }

  let availableSlots = Array.from(makeSlots.keys())
    // 'as number' because must exist
    .map((k) => makeSlots.get(k) as number)
    .reduce((a, b) => a + b, 0);

  const smallestRarity: Map<string, number> = new Map();

  makeSlots.forEach((_, parttype) => {
    const defs = PARTDEFS[parttype] as AnyPartDef[];
    const smallest = Math.min(
      ...defs.map((def) => def.rarity).filter((rarity) => rarity !== "always"),
    );
    smallestRarity.set(parttype, smallest);
  });

  // Start with the parts of rarity 'always'
  const res = Object.keys(PARTDEFS).reduce(
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

    if (available < smallestRarity[type]) continue;

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
