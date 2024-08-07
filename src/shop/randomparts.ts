import match from "rustmatchjs";
import {
  Cannon,
  CannonArgs,
  Engine,
  EngineArgs,
  ShipMake,
  ShipPart,
  Vacuum,
  VacuumArgs,
  slots,
} from "../objects/shipmakeup";
import { AnyPartDef, PARTDEFS, PartDef } from "./partdefs";
import random from "random";
import { pickByRarity } from "./rarity";

export function instantiatePart(def: AnyPartDef, type: string) {
  const part = match<string, ShipPart>(
    type,
    match.val("cannon", new Cannon(<PartDef<CannonArgs>>def)),
    match.val("engine", new Engine(<PartDef<EngineArgs>>def)),
    match.val("vacuum", new Vacuum(<PartDef<VacuumArgs>>def)),
    match._(() => {
      throw new Error("Can't handle unknown part type: " + type);
    }),
  );
  return part;
}

export default function randomParts(
  allocRarity: number,
  forMake?: ShipMake,
  temperature: number = 50,
): ShipPart[] {
  let available = allocRarity;

  const makeSlots =
    forMake != null
      ? slots(forMake)
      : Object.keys(PARTDEFS).reduce(
          (o, k) => Object.assign(o, { [k]: NaN }),
          {},
        );
  let availableSlots = Object.keys(makeSlots)
    .map((k) => makeSlots[k])
    .reduce((a, b) => a + b, 0);
  const smallestRarity = Object.keys(makeSlots).reduce(
    (a, b) =>
      Object.assign(a, {
        [b]: Math.min(
          ...(PARTDEFS[b] as AnyPartDef[])
            .filter((d) => d.rarity !== "always")
            .map((d) => d.rarity as number),
        ),
      }),
    {},
  );

  // Start with the parts of rarity 'always'
  const res = Object.keys(PARTDEFS).reduce(
    (a, b) =>
      a.concat(
        PARTDEFS[b]
          .filter((p: AnyPartDef) => p.rarity === "always")
          .map((d: AnyPartDef) => {
            makeSlots[b]--;
            if (makeSlots[b] === 0) delete makeSlots[b];
            availableSlots--;
            return instantiatePart(d, b);
          }),
      ),
    [],
  );

  while (
    availableSlots > 0 &&
    available >
      Math.min(...Object.keys(smallestRarity).map((k) => smallestRarity[k]))
  ) {
    const type = random.choice(Object.keys(makeSlots));
    if (available < smallestRarity[type]) continue;

    const def = pickByRarity<AnyPartDef>(
      PARTDEFS[type],
      available,
      temperature,
    );

    const part: ShipPart = instantiatePart(def, type);

    res.push(part);
    available -= <number>def.rarity;
    availableSlots--;
    makeSlots[type]--;
    if (makeSlots[type] === 0) delete makeSlots[type];
  }

  return res;
}
