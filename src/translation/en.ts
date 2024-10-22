import type { TranslationTable } from "../internationalization";n

export const TR_EN: TranslationTable = {
  translation: {
    "main.title": "Loot & Roam",
    "main.version": "Prototype v{{gameVersion}}",

    "ship.namegen": {
      adjectives: [
        "Venerable",
        "Ancient",
        "Perennial",
        "Indubitable",
        "Infallible",
        "Invincible",
        "Indestructible",
        "Beautiful",
        "Excellent",
        "Brilliant",
        "Shining",
        "Gleaming",
        "Powerful",
        "Forward",
        "Sweet",
        "Royal",
        "Perfect",
        "Immaculate",
        "Proud",
        "Long",
      ],
      titles: [
        "Monarch",
        "Senator",
        "Ruler",
        "Divine",
        "Leader",
        "Excellence",
        "Doctor",
        "Golden",
        "Pink",
        "Red",
        "Black",
        "White",
        "Gray",
        "Silver",
      ],
      cores: [
        "Mary",
        "James",
        "Marius",
        "Philius",
        "Edgar",
        "Ruth",
        "Vicky",
        "Lennard",
        "Sarutobian",
        "Julian",
        "Asparginensis",
        "Grum",
        "William",
        "Pyotr",
        "Nestor",
        "Phillipp",
        "Geraldius",
        "Johnson",
        "Becker",
        "Packard",
        "Zucarius",
        "Yiro",
      ],
      suffixes: [
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "Maximus",
        "the Pure",
        "the Vicious",
        "the Loving",
        "the Only",
        "the Unique",
        "the Last",
        "of the Court",
      ],
    },

    // Main menu & submenus
    "menu.newgame": "New Game",
    "menu.help": "Help",
    "menu.options": "Options",

    "submenu.newgame.title": "New Game",
    "submenu.newgame.gamemode": "Select a Game Mode",
    "submenu.newgame.freeplay": "Free Play",
    "submenu.newgame.comingsoon": "(Other gamemodes coming very soon!)",

    "submenu.options.title": "Options",
    "submenu.options.tickMode": "Tick Mode",
    "submenu.options.tickMode.dynamic": "Dynamic",
    "submenu.options.tickMode.fixed": "Fixed",

    strike: "(on strike for ({{reason}}))",
    "strike.reason.food": "hunger",
    "strike.reason.wage": "wage withholding",

    "submenu.help.title": "Tips & Help",
    "submenu.help.rows": [
      "Move and steer with WASD or by holding the left mouse button.",
      "Move near items to vacuum them up!",
      "Use Spacebar or RMB to shoot!",
      [
        "Spacebar shoots one at a time; RMB to burst-fire all cannons.",
        "Use the mouse to control the aim distance.",
        "Press a number key to lock/unlock a cannon from firing.",
        ["By default, the game always fires the highest caliber cannon first!"],
      ],
      1,
      "Press H to toggle the HUD.",
      "Press R to reset the game.",
      "Press M to come back to the main menu. (This ends your game!)",
      2,
      {
        text: "Once you're far enough from the island, press L to enter the Intermission Screen!",
        color: "#FFA",
      },
      2,
      [
        "In the Drydock you can manage your ships, and their inventories and installed parts.",
        [
          "If in doubt, just click Auto-Install, Auto-Resell, and Auto-Repair, in that order!",
          "Always use the info blurbs on the right side to orient yourself.",
          [
            "Double-check if you have ammo for all cannons and fuel for all engines!",
          ],
        ],
        1,
        "You can buy stuff like parts, ammo and fuel, and hire crew, at the Shop.",
        [
          "Things won't always be on sale; try checking the shop on different days.",
        ],
        1,
        "Once you've racked up cash aplenty, visit the Harbor to get a shiny new ship!",
        [
          "You can switch a ship to become yours, or buy a new one to add to your fleet.",
          [
            "Besides your ship, other ships in the fleet wil only spawn if you appoint a Subcaptain.",
            [
              "Any idle crew member can become a subcaptain, regardless of their stats.",
              "Subcaptains cannot operate parts.",
              "Subordinate ships follow you around the map and will help fight your enemies!",
            ],
            "You can manage your fleet ships separately in the Drydock.",
            ["Each of them has its own info blurb, so be aware!"],
            "Just like the Shop, not all ships will be available in all days.",
          ],
        ],
        1,
        "Once you're done managing stuff, use the Cartography tab to move on to the next island! Yarr harr!",
      ],
    ],

    "hud.cannons": "Cannons",
    "hud.cannon.locked": "(Locked)",
    "hud.cannon.noCrew": "(No Crew!)",
    "hud.cannon.noAmmo": "(No Ammo!)",
    "hud.engines": "Engines",
    "hud.engine.noCrew": "(No Crew!)",
    "hud.engine.noFuel": "(No Fuel!)",
    "hud.fuel": "Fuel",
    "hud.ammo": "Ammo",
    "hud.hull": "Hull: {{percent}}%",
    "hud.info.finance": "Financial",
    "hud.info.finance.cash": "Cash",
    "hud.info.finance.inventoryValue": "Inventory Value",
    "hud.info.finance.dayProfit": "Day Profit",
    "hud.info.finance.expenditures": "Expenditures",
    "hud.info.finance.current": "Current",
    "hud.info.finance.minusSalary": "- Salary",
    "hud.info.finance.minusHullRepair": "- Hull Repair",
    "hud.info.finance.minusOtherRepair": "- Other Repair",
    "hud.info.velocity": "Velocity",
    "hud.info.thrust": "Thrust",
    "hud.info.kills": "Kills",
    "hud.status.leave": "Press L to leave the island",
    "hud.status.leaveChase": "Cannot leave - someone is chasing you!",
    "hud.status.rip": "rip",
    "hud.status.tryAgain": "(Press R to reset, or M to go to menu!)",
    "hud.toggleHud": "Press H to toggle this HUD.",

    "partdefs.engine": "Engine",
    "partdefs.cannon": "Cannon",
    "partdefs.vacuum": "Vacuum",
    "partdefs.armor": "Armor",

    "partdefs.engine.steamy": "Steamy",
    "partdefs.engine.hotBetty": "Hot Betty",
    "partdefs.engine.blastFurnace": "Blast Furnace",
    "partdefs.engine.pistonBoy": "Piston Boy",
    "partdefs.engine.oilytron": "Oilytron",
    "partdefs.engine.oars": "Oars",
    "partdefs.engine.howitzer": "Howitzer",
    "partdefs.engine.vstar": "V-Star",
    "partdefs.engine.relicRotator": "Relic Rotator",

    "partdefs.cannon.shooty": "Shooty",
    "partdefs.cannon.speedy": "Speedy",
    "partdefs.cannon.chainCannon": "Chain Cannon",
    "partdefs.cannon.deluge": "Déluge",
    "partdefs.cannon.wxHefty": "WX-Hefty",
    "partdefs.cannon.wxHefty2": "WX-Hefty Mk-2",
    "partdefs.cannon.juggernaut": "Juggernaut",
    "partdefs.cannon.viper1": "Viper I",
    "partdefs.cannon.viper2": "Viper II",
    "partdefs.cannon.viper3": "Viper III",
    "partdefs.cannon.titaniumTed": "Titanium Ted",
    "partdefs.cannon.longshot": "Lonsghot",
    "partdefs.cannon.seraphimShot": "Seraphim's Shot",

    "partdefs.vacuum.slurpman": "Slurpman",
    "partdefs.vacuum.courier": "Courier",
    "partdefs.vacuum.whirlpool": "Whirlpool",
    "partdefs.vacuum.vortex": "Vortex",

    "partdefs.armor.basicIronCladding": "Basic Iron Cladding",
    "partdefs.armor.basicSteelCladding": "Basic Steel Cladding",
    "partdefs.armor.flangedCladding": "Flanged Cladding",
    "partdefs.armor.reinforcedCladding": "Reinforced Cladding",
    "partdefs.armor.paddedCladding": "Padded Cladding",

    "makedefs.dependableDave": "Dependable Dave",
    "makedefs.fisherman": "Fisherman",
    "makedefs.patroller": "Patroller",
    "makedefs.queenBee": "Queen Bee",
    "makedefs.hubris": "Hubris",
    "makedefs.wispOfTheMorning": "Wisp o' the Morning",
    "makedefs.highHarpooner": "High Harpooner",
    "makedefs.highSeasRoberts": "High Seas Roberts",
    "makedefs.jasper": "Jasper",
    "makedefs.marieAntoniette": "Marie Antoniette",
    "makedefs.vickyVictorious": "Vicky Victorious",

    "crewdefs.hicks": "Hicks",
    "crewdefs.jason": "Jason",
    "crewdefs.robert": "Robert",
    "crewdefs.philbert": "Philbert",
    "crewdefs.mortimer": "Mortimer",
    "crewdefs.hudson": "Hudson",
    "crewdefs.rodrick": "Rodrick",
    "crewdefs.malcolm": "Malcolm",
    "crewdefs.jacklin": "Jacklin",
    "crewdefs.guterrez": "Guterrez",
    "crewdefs.chaplain": "Chaplain",
    "crewdefs.mrConk": "Mr. Conk",

    "fooddefs.pancake": "pancake",
    "fooddefs.potato": "potato",
    "fooddefs.cake": "cake",
    "fooddefs.bread": "bread",
    "fooddefs.crackers": "crackers",
    "fooddefs.tuna": "tuna",
    "fooddefs.sardines": "sarines",

    "lootdefs.vase": "Royal Vase",
    "lootdefs.gold": "Gold Bar",
    "lootdefs.jar": "Spice Jar",
    "lootdefs.ores": "Mineral Ores",
    "lootdefs.lamp": "Golden Lamp",
    "lootdefs.flutes": "Tribal Flutes",
    "lootdefs.chalice": "Golden Chalice",
    "lootdefs.statuette": "Golden Statuette",
    "lootdefs.statue": "Tribal Statue",

    "shopinfo.manning.needsInterp": "needs {{manned}} total manning strength",
    "shopinfo.manning.needsAny": "needs to be manned",
    "shopinfo.manning.needs": "needs to be manned",
    "shopinfo.manning.min": " (min. crew strength {{manned}})",
    "shopinfo.crew.salary": "daily salary: {{salary}}",
    "shopinfo.crew.salaryTomorrow": "next day's salary: {{salary}}",
    "shopinfo.crew.foodIntake": "daily food intake: {{foodIntake}}",
    "shopinfo.crew.strength": "manning strength: {{strength}}",
    "shopinfo.crew.manning": "manning a: {{manningType}}",
    "shopinfo.crew.captain": "captaining this ship",
    "shopinfo.crew.idle": "idle",
    "shopinfo.projectileModifier": "fitted with {{modifierName}}",
    "shopinfo.cannon.caliber": "caliber: {{caliber}}",
    "shopinfo.cannon.shootRate": "shots per minute: {{spm}}/min",
    "shopinfo.cannon.spread": "spread: {{spread}}",
    "shopinfo.cannon.range": "max. range: {{rangeMeters}}",
    "shopinfo.vacuum.range": "attract range: {{suckRadiusMeters}}",
    "shopinfo.vacuum.strength": "attract power: {{strength}} N/sqrt(m)",
    "shopinfo.engine.noFuel": "manual",
    "shopinfo.engine.fuelType": "fuel type: {{fuelType}}",
    "shopinfo.engine.fuelCost": "fuel cost: {{fuelCost}} kg/min",
    "shopinfo.engine.thrust": "thrust: {{thrust}} kN",
    "shopinfo.armor.absorption":
      "absorption: {{defenseFactor, number(style: 'percent')}}",
    "shopinfo.armor.deflection":
      "deflection: {{deflectFactor, number(style: 'percent')}}",
    "shopinfo.armor.wear": "wear: {{wearFactor, number(style: 'percent')}}",
    "shopinfo.armor.overwhelm":
      "overwhelmed beyond {{overwhelmFactor, number(style: 'percent')}}",

    "projectile.modifier.homing": "homing fins",
    "projectile.modifier.gum": "propeller gum",
    "projectile.modifier.incendiary": "incendiary phosphorus",
    "projectile.modifier.noxious": "noxious gas",
    "projectile.modifier.explosive": "explosive charges",
    "projectile.modifier.spin": "spin charge",
    "projectile.modifier.repulsion": "repulsion disc",
    "projectile.modifier.plasmaField": "plasma field bomb",
    "projectile.modifier.smokescreen": "smokescreen bomb",
    "projectile.modifier.acid": "anti-armor corrosive acid",

    "fueltype.coal": "coal",
    "fueltype.diesel": "diesel",

    "itemtype.crewmate": "crewmate",
    "itemtype.food": "food",
    "itemtype.cannon": "cannon",
    "itemtype.engine": "engine",
    "itemtype.vacuum": "vacuum",
    "itemtype.cannonballAmmo": "cannonball",
    "itemtype.fuel": "fuel",
    "itemtype.valuable": "loot",
    "itemtype.armor": "armor",

    cannonball: "{{caliber}} cannonball",
    "cannonball.plural": "{{caliber}} cannonballs",

    "food.spoiled": "(spoiled)",
    "food.info.shelfLife": "days until spoiled: {{spoilDays}}",

    "intermission.moneyCounter": "Money: {{money}}",
    "intermission.drydock": "Drydock",
    "intermission.drydock.parts": "Parts",
    "intermission.drydock.part.action.repair": "Repair ({{repairCost}})",
    "intermission.drydock.part.action.uninstall": "Uninstall",
    "intermission.drydock.part.action.assignCrew": "Assign Crew",
    "intermission.drydock.part.action.unassignCrew": "Unassign Crew",
    "intermission.drydock.part.info.manned": "manned by: {{mannedBy}}",
    "intermission.drydock.part.info.unmanned": "(not manned!)",
    "intermission.drydock.part.damaged":
      "{{percent}}% damaged (cost to fix: {{repairCost}})",
    "intermission.drydock.part.notDamaged": "Intact",
    "intermission.drydock.slots": "Slots: {{- slots}}",
    "intermission.drydock.inventory": "Inventory",
    "intermission.drydock.item.weight": "weight: {{weight}}",
    "intermission.drydock.item.damage":
      "{{damagePerc}}% damaged ({{repairCost}} to repair)",
    "intermission.drydock.item.action.fireCrew": "Fire",
    "intermission.drydock.item.action.resell": "Resell ({{value}})",
    "intermission.drydock.item.action.resellHalf": "Resell Half ({{value}})",
    "intermission.drydock.item.action.fleetMove": "Move to...",
    "intermission.drydock.item.action.fleetMoveHalf": "Move Half to...",
    "intermission.drydock.item.action.fleetMove.dropdown.to": "to {{shipName}}",
    "intermission.drydock.item.action.fleetMove.dropdown.cancel": "cancel",
    "intermission.drydock.item.action.appoint": "Appoint to Captainship",
    "intermission.drydock.item.action.install": "Install Part",
    "intermission.drydock.autoInstall": "Auto-Install",
    "intermission.drydock.autoResell": "Auto-Resell",
    "intermission.drydock.autoRepair": "Auto-Repair",
    "intermission.drydock.repair.healthy": "Ship hull is fine",
    "intermission.drydock.repair.damaged":
      "Ship hull is damaged ({{repairCost}})",
    "intermission.drydock.stats": "Stats",
    "intermission.drydock.stats.salary.name": "Salary:",
    "intermission.drydock.stats.food.name": "Food:",
    "intermission.drydock.stats.repairs.name": "Repairs:",
    "intermission.drydock.stats.weight.name": "Weight:",
    "intermission.drydock.stats.engines.name": "Engines:",
    "intermission.drydock.stats.fuel.name": "Fuel:",
    "intermission.drydock.stats.ammo.name": "Ammunition:",
    "intermission.drydock.stats.manned.name": "Manned Parts:",
    "intermission.drydock.stats.salary.info.strikeSoon":
      "Or else, crew may refuse to work in {{strikesIn}} days.",
    "intermission.drydock.stats.salary.info.insufficient":
      "You need {{money}} to meet salaries tomorrow, at {{salary}}/day.",
    "intermission.drydock.stats.salary.info.sufficient":
      "You have enough money to meet all salary demands for {{days}} day, at {{salary}}/day.",
    "intermission.drydock.stats.salary.info.sufficient.pluralDays":
      "You have enough money to meet all salary demands for {{days}} days, at {{salary}}/day.",
    "intermission.drydock.stats.food.info.head":
      "You have {{food}} food point, and your crew consumes {{totalIntake}} a day.",
    "intermission.drydock.stats.food.info.head.plural":
      "You have {{food}} food points, and your crew consumes {{totalIntake}} a day.",
    "intermission.drydock.stats.food.info.insufficient":
      "You do not have enough, and your crew WILL refuse to work!",
    "intermission.drydock.stats.food.info.sufficient":
      "You have enough for {{days}} days.",
    "intermission.drydock.stats.repairs.info.intact":
      "Your ship is completely fine and needs no repairs.",
    "intermission.drydock.stats.repairs.info.damaged.insufficient":
      "Your ship has damages, and you will need {{missingMoney}} more to fix everything, at {{totalCost}}.",
    "intermission.drydock.stats.repairs.info.damaged.sufficient":
      "Your ship has damages, and you have enough money to fix everything - it will cost you {{totalCost}}, leaving you with {{remaining}}.",
    "intermission.drydock.stats.weight.info":
      "Your ship weights {{totalWeight}}; {{hullWeight}} of that is the hull.",
    "intermission.drydock.stats.engines.info":
      "Your ship, with its current engine situation, can output up to {{totalThrust}} kN/s.",
    "intermission.drydock.stats.engines.info.none":
      "Your ship has no functioning engines. Check fuel and manning.",
    "intermission.drydock.stats.fuel.info.head":
      "{{fueled}} of your {{numEngines}} installed engines have fuel.",
    "intermission.drydock.stats.fuel.info.need":
      "You need more: {{missingFuelTypes}}",
    "intermission.drydock.stats.fuel.info.quickest":
      "The fuel you'll first run out of is {{quickest}}, after {{quickestDuration}}.",
    "intermission.drydock.stats.ammo.info.head":
      "{{loaded}} of your {{numCannons}} cannons have ammo.",
    "intermission.drydock.stats.ammo.info.need":
      "You need more of the following calibers: {{missingCalibers}}",
    "intermission.drydock.stats.manned.info":
      "Of your ship's {{numParts}} installed parts, {{numNeedManned}} are manually operated. Of them, {{numManned}} have crew operating them.",
    "intermission.shop": "Shop",
    "intermission.shop.buy": "Buy",
    "intermission.shop.hire": "Hire",
    "intermission.harbor": "Harbor",
    "intermission.harbor.slots": "Slots:",
    "intermission.harbor.ship.hp": "Max HP: {{maxDamage}}",
    "intermission.harbor.ship.size": "Size: {{size}} x {{lateralSize}}",
    "intermission.harbor.ship.slots": "Slots:",
    "intermission.harbor.ship.action.switch": "Buy & Switch to Make ({{cost}})",
    "intermission.harbor.ship.action.buy": "Buy & Add to Fleet ({{cost}})",
    "intermission.harbor.ship.status.cannotAfford": "Not enough money!",
    "intermission.harbor.ship.status.mustUninstall":
      "Uninstall every part of your main ship first!",
    "intermission.cartography": "Cartography",
    "intermission.cartography.invade": "Invade Next Island!",

    all: "All",
    none: "None",
  },
};
