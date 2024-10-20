import i18next from "i18next";
import { TR_EN } from "./translation/en";
import { TR_PT_BR } from "./translation/pt-BR";

export function init() {
  i18next.init({
    debug: true,
    resources: {
      en: TR_EN,
      pt_BR: TR_PT_BR
    }
  })
}
