import type { TranslationTable } from "../internationalization";

export const TR_PT_BR: TranslationTable = {
  translation: {
    "main.title": "Loot & Roam",
    "main.version": "Protótipo v{{gameVersion}}",

    // Main menu & submenus
    "menu.newgame": "Novo Jogo",
    "menu.help": "Ajuda",

    "submenu.newgame.title": "Novo Jogo",
    "submenu.newgame.gamemode": "Selecione um Modo de Jogo",
    "submenu.newgame.freeplay": "Modo Livre",
    "submenu.newgame.comingsoon": "(Outros modos virão logo, logo!)",

    strike: "(greveando por {{reason}})",
    "strike.reason.food": "fome",
    "strike.reason.wage": "salário congelado",

    "submenu.help.title": "Dicas & Ajuda",
    "submenu.help.rows": [
      "Mova-se com WASD ou segurando o botão esquerdo do mouse.",
      "Chegue perto dos itens para sugá-los a bordo!",
      "Use a barra de espaço ou o botão direito do mouse para atirar!",
      [
        "A barra de espaço atira um canhão de cada vez. O botão direito do mouse atira todos de uma vez só!",
        "Use o mouse para controlar a distância de cada tiro.",
        "Aperte uma tecla numérica para trancar ou destrancar um canhão.",
        [
          "O jogo vai escolher o canhão de maior calibre disponível para atirar, que não esteja trancado.",
        ],
      ],
      1,
      "Aperte H para mostrar ou esconder o overlay de informações.",
      "Aperte R para resetar o jogo.",
      "Aperte M para voltar ao menu principal. (Irreversível!)",
      2,
      {
        text: "Quando você estiver longe o suficiente da ilha, aperte L para sair para a Intermissão!",
        color: "#FFA",
      },
      2,
      [
        "No Dique Seco você pode gerir seus navios, seus inventários, e suas partes instaladas.",
        [
          "Não sabe o que fazer? Aperte Auto-Instalar, Auto-Revender e Auto-Consertar, nesta ordem!",
          "Sempre use os cartões de informação no canto direito para orientar suas decisões.",
          [
            "Sempre verifique se há munição para seus canhões e combustível para seus motores!",
          ],
        ],
        1,
        "Você pode comprar coisas como munição, comida e partes na Loja.",
        [
          "As coisas nem sempre estarão disponíveis à venda. Tente visitar a Loja em dias diferentes!",
        ],
        1,
        "Quando você estiver empanturrado/a de dinheiro, visite o Porto para comprar um belíssimo dum navio zero-km!",
        [
          "Você pode trocar seu navio principal, ou comprar um navio novo e adicioná-lo à sua frota.",
          [
            "Além do seu navio, os demais navios da frota precisam ter capitães nomeados por você.",
            [
              "Qualquer marujo ocioso pode ser nomeado capitão de um navio, independente de seus atributos.",
              "Capitães não podem operar partes.",
              "Navios subordinados te seguem pelo mapa e ajudam a caçar seus inimigos!",
            ],
            "Você pode gerir seus navios separadamente no Dique Seco.",
            [
              "Cada um deles tem seus próprios cartões de informação. Fique de olho em cada um!",
            ],
            "Que nem a Loja, nem todos os navios do Porto estarão disponíveis todos os dias.",
          ],
        ],
        1,
        {
          text: "Quando você estiver satisfeito/a com a gerência, vá ao menu de Cartografia para Invadir a Próxima Ilha! Arrr!!",
          color: "#FFA",
        },
      ],
    ],

    "hud.cannons": "Canhões",
    "hud.cannon.locked": "(Trancado)",
    "hud.cannon.noCrew": "(Sem Operador!)",
    "hud.cannon.noAmmo": "(Desmunido!)",
    "hud.engines": "Motores",
    "hud.engine.noFuel": "(Sem Combustível!)",
    "hud.engine.noCrew": "(Sem Operador!)",
    "hud.fuel": "Combustível",
    "hud.ammo": "Munição",
    "hud.hull": "Casco: {{percent}}%",
    "hud.info.finance": "Financeiro",
    "hud.info.finance.cash": "Dinheiro",
    "hud.info.finance.inventoryValue": "Valor do Inventário",
    "hud.info.finance.dayProfit": "Lucro do Dia",
    "hud.info.finance.expenditures": "Gastos",
    "hud.info.finance.current": "Atual",
    "hud.info.finance.minusSalary": "- Salário",
    "hud.info.finance.minusHullRepair": "- Reparos do Casco",
    "hud.info.finance.minusOtherRepair": "- Demais Reparos",
    "hud.info.velocity": "Velocidade",
    "hud.info.thrust": "Impulso",
    "hud.info.kills": "Vítimas",
    "hud.status.leave": "Aperte L para sair da ilha",
    "hud.status.leaveChase": "Não dá pra sair - tem alguém na sua cola!",
    "hud.status.rip": "descanse na lasanha",
    "hud.status.tryAgain":
      "(Aperte R para resetar, ou M para voltar ao menu principal!)",
    "hud.toggleHud": "Aperte H para esconder esse overlay informacional.",

    "partdefs.engine": "Motor",
    "partdefs.cannon": "Canhão",
    "partdefs.vacuum": "Aspirador",

    "partdefs.engine.steamy": "Mini-Vapor",
    "partdefs.engine.hotBetty": "Maria Fumaça",
    "partdefs.engine.blastFurnace": "Alto Forno",
    "partdefs.engine.pistonBoy": "Pipi-Pistão",
    "partdefs.engine.oilytron": "Giromático",
    "partdefs.engine.oars": "Remos",
    "partdefs.engine.howitzer": "Grão-Tanque",
    "partdefs.engine.vstar": "V-Star",
    "partdefs.engine.relicRotator": "A Rotatriz",

    "partdefs.cannon.shooty": "Pá-Bum",
    "partdefs.cannon.speedy": "Manda Bala",
    "partdefs.cannon.chainCannon": "Chove Bala",
    "partdefs.cannon.deluge": "Tempestade",
    "partdefs.cannon.wxHefty": "WX-Grave",
    "partdefs.cannon.wxHefty2": "WX-Grave Mk-2",
    "partdefs.cannon.juggernaut": "Boladão",
    "partdefs.cannon.viper1": "Víbora I",
    "partdefs.cannon.viper2": "Víbora II",
    "partdefs.cannon.viper3": "Víbora III",
    "partdefs.cannon.titaniumTed": "Ted Titânio",
    "partdefs.cannon.longshot": "Longograve",
    "partdefs.cannon.seraphimShot": "Soro de Serafim",

    "partdefs.vacuum.slurpman": "Chupe-Chupe",
    "partdefs.vacuum.courier": "Carteiro",
    "partdefs.vacuum.whirlpool": "Redemoinho",
    "partdefs.vacuum.vortex": "Vórtex",

    "makedefs.dependableDave": "Daniel Decente",
    "makedefs.fisherman": "Pesqueirinho Baiano",
    "makedefs.patroller": "Patrulha",
    "makedefs.queenBee": "Abelha-Rainha",
    "makedefs.hubris": "Húbris",
    "makedefs.wispOfTheMorning": "Brisa do Pampa",
    "makedefs.highHarpooner": "Grão-Arpoador",
    "makedefs.highSeasRoberts": "Roberta Marinha",
    "makedefs.jasper": "Jaspe",
    "makedefs.marieAntoniette": "Maria Antônia",
    "makedefs.vickyVictorious": "Rainha Vitória",

    "crewdefs.hicks": "Enzo",
    "crewdefs.jason": "João",
    "crewdefs.robert": "Roberto",
    "crewdefs.philbert": "Paulo",
    "crewdefs.mortimer": "Maurício",
    "crewdefs.hudson": "Renato",
    "crewdefs.rodrick": "Rodrigo",
    "crewdefs.malcolm": "Máicon",
    "crewdefs.jacklin": "Jaqueline",
    "crewdefs.guterrez": "Gutierre",
    "crewdefs.chaplain": "Chapeleiro",
    "crewdefs.mrConk": "Seu Gonza",

    "fooddefs.pancake": "panqueca",
    "fooddefs.potato": "batata",
    "fooddefs.cake": "bolo",
    "fooddefs.bread": "pão",
    "fooddefs.crackers": "bolacha de água e sal",
    "fooddefs.tuna": "atum",
    "fooddefs.sardines": "sardinha",

    "shopinfo.manning.needsInterp":
      "exige {{manned}} de força total dos operadores",
    "shopinfo.manning.needsAny": "exige operação manual",
    "shopinfo.manning.needs": "exige operação manual",
    "shopinfo.manning.min": " (força oper. mín. {{manned}})",
    "shopinfo.crew.salary": "salário no próximo dia: {{salary}}",
    "shopinfo.crew.foodIntake": "consumo diário de alimentos: {{foodIntake}}",
    "shopinfo.crew.strength": "força de operação: {{strength}}",
    "shopinfo.crew.manning": "operando um: {{manningType}}",
    "shopinfo.crew.captain": "capitão desse nau",
    "shopinfo.crew.idle": "ocioso",
    "shopinfo.projectileModifier": "equipado com {{modifierName}}",
    "shopinfo.cannon.caliber": "calibre: {{caliber}}",
    "shopinfo.cannon.shootRate": "tiros por minuto: {{- spm}}/min",
    "shopinfo.cannon.spread": "imprecisão: {{spread}}",
    "shopinfo.cannon.range": "alcance máx.: {{rangeMeters}}",
    "shopinfo.vacuum.range": "alcance de aspiração: {{suckRadiusMeters}}",
    "shopinfo.vacuum.strength": "potência de aspiração: {{strength}} N/sqrt(m)",
    "shopinfo.engine.noFuel": "manual",
    "shopinfo.engine.fuelType": "tipo de combustível: {{fuelType}}",
    "shopinfo.engine.fuelCost": "uso de combustível: {{fuelCost}} kg/min",
    "shopinfo.engine.thrust": "impulso: {{thrust}} kN",

    "projectile.modifier.homing": "ailerons auto-guiados",
    "projectile.modifier.gum": "emperra-turbinas",
    "projectile.modifier.incendiary": "fósforo incendiário",
    "projectile.modifier.noxious": "uma bomba de gás nocivo",
    "projectile.modifier.explosive": "cargas explosivas",
    "projectile.modifier.spin": "carga de pirueta",
    "projectile.modifier.repulsion": "disco de repulsão",
    "projectile.modifier.plasmaField": "bomba de campo plasmático",
    "projectile.modifier.smokescreen": "bomba de fumaça",
    "projectile.modifier.acid": "ácido corroedor de armadura",

    "fueltype.coal": "carvão",
    "fueltype.diesel": "díesel",

    "itemtype.crewmate": "marujo",
    "itemtype.food": "comida",
    "itemtype.cannon": "canhão",
    "itemtype.engine": "motor",
    "itemtype.vacuum": "vácuo",
    "itemtype.cannonballAmmo": "bola de canhão",
    "itemtype.fuel": "combustível",
    "itemtype.valuable": "mercadoria",

    cannonball: "bola de canhão calibre {{caliber}}",
    "cannonball.plural": "bolas de canhão calibre {{caliber}}",

    "food.spoiled": "(spoiled)",
    "food.info.shelfLife": "days until spoiled: {{spoilDays}}",

    "lootdefs.vase": "Vaso da Monarquia",
    "lootdefs.gold": "Barra de Ouro",
    "lootdefs.jar": "Jarro de Especiarias",
    "lootdefs.ores": "Minérios",
    "lootdefs.lamp": "Lamparina Dourada",
    "lootdefs.flutes": "Flautas Tribais",
    "lootdefs.chalice": "Cálice Dourado",
    "lootdefs.statuette": "Estatueta de Ouro",
    "lootdefs.statue": "Estátua Tribal",

    "intermission.moneyCounter": "Dinheiro: {{money}}",
    "intermission.drydock": "Dique-Seco",
    "intermission.drydock.parts": "Partes",
    "intermission.drydock.part.action.repair": "Consertar ({{repairCost}})",
    "intermission.drydock.part.action.uninstall": "Desinstalar",
    "intermission.drydock.part.action.assignCrew": "Nomear Operador",
    "intermission.drydock.part.action.unassignCrew": "Remover Operador",
    "intermission.drydock.part.damaged": "{{percent}}% danificado/a",
    "intermission.drydock.part.notDamaged": "Intacto/a",
    "intermission.drydock.part.info.manned": "operado por: {{mannedBy}}",
    "intermission.drydock.part.info.unmanned": "(não operado!)",
    "intermission.drydock.slots": "Encaixes: {{- slots}}",
    "intermission.drydock.inventory": "Inventário",
    "intermission.drydock.item.weight": "peso: {{weight}}", // i18n TODO
    "intermission.drydock.item.damage":
      "{{damagePerc}}% avariado ({{repairCost}} para consertar)", // i18n TODO
    "intermission.drydock.item.action.fireCrew": "Demitir",
    "intermission.drydock.item.action.resell": "Revender ({{value}})",
    "intermission.drydock.item.action.resellHalf":
      "Revender Metade ({{value}})",
    "intermission.drydock.item.action.fleetMove": "Mover ao...",
    "intermission.drydock.item.action.fleetMoveHalf": "Mover Metade ao...",
    "intermission.drydock.item.action.fleetMove.dropdown.to":
      "para {{shipName}}", // i18n TODO
    "intermission.drydock.item.action.fleetMove.dropdown.cancel": "cancelar", // i18n TODO
    "intermission.drydock.item.action.appoint": "Nomear Capitão", // i18n TODO
    "intermission.drydock.item.action.install": "Instalar Parte",
    "intermission.drydock.autoInstall": "Auto-Instalar",
    "intermission.drydock.autoResell": "Auto-Revender",
    "intermission.drydock.autoRepair": "Auto-Consertar",
    "intermission.drydock.repair.healthy": "Casco em boa condição",
    "intermission.drydock.repair.damaged": "Casco danificado ({{repairCost}})",
    "intermission.drydock.stats": "Estatísticas",
    "intermission.drydock.stats.salary.name": "Salário:",
    "intermission.drydock.stats.food.name": "Comida:",
    "intermission.drydock.stats.repairs.name": "Reparos Pendentes:",
    "intermission.drydock.stats.weight.name": "Peso:",
    "intermission.drydock.stats.engines.name": "Motores:",
    "intermission.drydock.stats.fuel.name": "Combustível:",
    "intermission.drydock.stats.ammo.name": "Munição:",
    "intermission.drydock.stats.manned.name": "Operação das Partes:",
    "intermission.drydock.stats.salary.info.strikeSoon":
      "Senão, os marujos poderão grevear daqui a {{strikesIn}} dias.",
    "intermission.drydock.stats.salary.info.insufficient":
      "Você precisa de {{money}} para pagar os salários amanhã, sendo {{salary}}/dia.",
    "intermission.drydock.stats.salary.info.sufficient":
      "Você tem dinheiro o suficiente para cobrir as demandas salariais de {{salary}}/dia por {{days}} dia.",
    "intermission.drydock.stats.salary.info.sufficient.pluralDays":
      "Você tem dinheiro o suficiente para cobrir as demandas salariais de {{salary}}/dia por {{days}} dias.",
    "intermission.drydock.stats.food.info.head":
      "Você tem {{food}} ponto de comida; sua tripulação consome {{totalIntake}}/dia.",
    "intermission.drydock.stats.food.info.head.plural":
      "Você tem {{food}} pontos de comida; sua tripulação consome {{totalIntake}}/dia.",
    "intermission.drydock.stats.food.info.insufficient":
      "Se você não tratar essa crise de fome, sua tripulação inteira VAI grevear!",
    "intermission.drydock.stats.food.info.sufficient":
      "Você tem comida suficiente para {{days}} dias.",
    "intermission.drydock.stats.repairs.info.intact":
      "Seu navio está completamente em boa condição e não precisa de reparos.",
    "intermission.drydock.stats.repairs.info.damaged.insufficient":
      "Seu navio está danificado, e você vai precisar de mais {{missingMoney}} para consertar tudo, o que custará {{totalCost}}.",
    "intermission.drydock.stats.repairs.info.damaged.sufficient":
      "Seu navio está danificado, e você tem dinheiro o suficiente para todos os consertos - que juntos custarão {{totalCost}}, e te sobrará {{remaining}}.",
    "intermission.drydock.stats.weight.info":
      "Seu navio pesa, ao todo, {{totalWeight}}; {{hullWeight}} disso é o casco.",
    "intermission.drydock.stats.engines.info":
      "Seu navio, com seu arranjo e situação atual de motores, pode impulsionar-se a {{totalThrust}} kN/s.",
    "intermission.drydock.stats.engines.info.none":
      "Seu navio está sem motores funcionais. Verifique o combustível e a operação dos marujos.",
    "intermission.drydock.stats.fuel.info.head":
      "{{fueled}} de seus {{numEngines}} motores instalados têm combustível.",
    "intermission.drydock.stats.fuel.info.need":
      "Você vai precisar de mais: {{missingFuelTypes}}",
    "intermission.drydock.stats.fuel.info.quickest":
      "O combustível que você vai esgotar primeiro é {{quickest}}, após {{quickestDuration}}.",
    "intermission.drydock.stats.ammo.info.head":
      "{{loaded}} de seus {{numCannons}} canhões estão munidos.",
    "intermission.drydock.stats.ammo.info.need":
      "Você precisa de mais bolas de canhão dos calibres: {{missingCalibers}}",
    "intermission.drydock.stats.manned.info":
      "Das {{numParts}} partes instaladas em seu navio, {{numNeedManned}} são manualmente operadas. Destas, {{numManned}} têm marujos operando-as.",
    "intermission.shop": "Loja",
    "intermission.shop.buy": "Comprar",
    "intermission.shop.hire": "Contratar",
    "intermission.harbor": "Porto",
    "intermission.harbor.slots": "Encaixes:",
    "intermission.harbor.ship.hp": "HP Máx.: {{maxDamage}}",
    "intermission.harbor.ship.size": "Tamanho: {{size}} x {{lateralSize}}",
    "intermission.harbor.ship.slots": "Encaixes:",
    "intermission.harbor.ship.action.switch":
      "Comprar & Trocar Principal ({{cost}})",
    "intermission.harbor.ship.action.buy":
      "Comprar & Adicionar à Frota ({{cost}})",
    "intermission.harbor.ship.status.cannotAfford": "Dinheiro insuficiente!",
    "intermission.harbor.ship.status.mustUninstall":
      "Desinstale todas as partes do seu navio principal primeiro!",
    "intermission.cartography": "Cartografia",
    "intermission.cartography.invade": "Invadir a Próxima Ilha!",

    all: "Todos",
    none: "Nenhum",
  },
};