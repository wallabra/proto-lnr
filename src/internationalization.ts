import type { TOptions } from "i18next";
import i18next from "i18next";
import { TR_EN } from "./translation/en";
import { TR_PT_BR } from "./translation/pt-BR";
import type { Crew, Engine, ShipMake, ShipPart } from "./objects/shipmakeup";
import type { FoodItem } from "./inventory";
import type { ValuableItem } from "./valuable";
import universalLanguageDetect from "@unly/universal-language-detector";

export type HelpCommand =
  | string
  | number
  | { text: string; color: string }
  | HelpCommand[];

export type TranslationTable = {
  translation:
    | {
        "submenu.help.rows": HelpCommand[];
        "ship.namegen": Record<string, string[]>;
      }
    | Record<string, string>;
};

export function translateItemType(
  itemType: string,
  options?: TOptions,
): string {
  return i18next.t("itemtype." + itemType, { count: 1, ...options });
}

export function translateFuelType(
  fuelType: string,
  options?: TOptions,
): string {
  return i18next.t("fueltype." + fuelType, { count: 1, ...options });
}

export function translatePartName(part: ShipPart, options?: TOptions): string {
  return i18next.t(`partdefs.${part.type}.${part.name}`, {
    count: 1,
    ...options,
  });
}

export function translateFoodName(food: FoodItem, options?: TOptions): string {
  return i18next.t("fooddefs." + food.name, { count: food.amount, ...options });
}

export function translateValuableName(
  loot: ValuableItem,
  options?: TOptions,
): string {
  return i18next.t("lootdefs." + loot.name, { count: loot.amount, ...options });
}

export function translateEngineFuelType(
  engine: Engine,
  options?: TOptions,
): string {
  return engine.fuelType === null
    ? "manual"
    : translateFuelType(engine.fuelType, options);
}

export function translateCrewName(crew: Crew, options?: TOptions): string {
  return i18next.t("crewdefs." + crew.name, options);
}

export function translateShipMakeName(
  make: ShipMake,
  options?: TOptions,
): string {
  return i18next.t("makedefs." + make.name, options);
}

export function init() {
  i18next
    .init({
      lng: universalLanguageDetect({
        supportedLanguages: ["en", "pt"],
        fallbackLanguage: "en",
      }),
      fallbackLng: "en",
      debug: true,
      resources: {
        en: TR_EN,
        pt: TR_PT_BR,
      },
    })
    .catch((err: unknown) => {
      throw err;
    });
}
