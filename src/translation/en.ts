import type { TranslationTable } from "../internationalization";

export const TR_EN: TranslationTable = {
  translation: {
    "main.title": "Loot & Roam",
    "main.version": "Prototype v{{gameVersion}}",

    // Main menu & submenus
    "menu.newgame": "New Game",
    "menu.help": "Help",

    "submenu.newgame.title": "New Game",
    "submenu.newgame.gamemode": "Select a Game Mode",
    "submenu.newgame.freeplay": "Free Play",
    "submenu.newgame.comingsoon": "(Other gamemodes coming very soon!)",

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
    "hud.hull": "Hull: {{percent}}%", // i18n TODO
    "hud.info.finance": "Financial", // i18n TODO
    "hud.info.finance.cash": "Cash", // i18n TODO
    "hud.info.finance.inventoryValue": "Inventory Value", // i18n TODO
    "hud.info.finance.dayProfit": "Day Profit", // i18n TODO
    "hud.info.finance.expenditures": "Expenditures", // i18n TODO
    "hud.info.finance.current": "Current", // i18n TODO
    "hud.info.finance.minusSalary": "- Salary", // i18n TODO
    "hud.info.finance.minusHullRepair": "- Hull Repair", // i18n TODO
    "hud.info.finance.minusOtherRepair": "- Other Repair", // i18n TODO
    "hud.info.velocity": "Velocity", // i18n TODO
    "hud.info.thrust": "Thrust", // i18n TODO
    "hud.info.kills": "Kills", // i18n TODO
    "hud.status.leave": "Press L to leave the island", // i18n TODO
    "hud.status.leaveChase": "Cannot leave - someone is chasing you!", // i18n TODO
    "hud.status.rip": "rip", // i18n TODO
    "hud.status.tryAgain": "(Press R to reset, or M to go to menu!)", // i18n TODO
    "hud.toggleHud": "Press H to toggle this HUD.", // i18n TODO

    "partdefs.engine": "Engine", // i18n TODO
    "partdefs.cannon": "Cannon", // i18n TODO
    "partdefs.vacuum": "Vacuum", // i18n TODO

    "partdefs.engine.steamy": "Steamy", // i18n TODO
    "partdefs.engine.hotBetty": "Hot Betty", // i18n TODO
    "partdefs.engine.blastFurnace": "Blast Furnace", // i18n TODO
    "partdefs.engine.pistonBoy": "Piston Boy", // i18n TODO
    "partdefs.engine.oilytron": "Oilytron", // i18n TODO
    "partdefs.engine.oars": "Oars", // i18n TODO
    "partdefs.engine.howitzer": "Howitzer", // i18n TODO
    "partdefs.engine.vstar": "V-Star", // i18n TODO
    "partdefs.engine.relicRotator": "Relic Rotator", // i18n TODO

    "partdefs.cannon.shooty": "Shooty", // i18n TODO
    "partdefs.cannon.speedy": "Speedy", // i18n TODO
    "partdefs.cannon.chainCannon": "Chain Cannon", // i18n TODO
    "partdefs.cannon.deluge": "Déluge", // i18n TODO
    "partdefs.cannon.wxHefty": "WX-Hefty", // i18n TODO
    "partdefs.cannon.wxHefty2": "WX-Hefty Mk-2", // i18n TODO
    "partdefs.cannon.juggernaut": "Juggernaut", // i18n TODO
    "partdefs.cannon.viper1": "Viper I", // i18n TODO
    "partdefs.cannon.viper2": "Viper II", // i18n TODO
    "partdefs.cannon.viper3": "Viper III", // i18n TODO
    "partdefs.cannon.titaniumTed": "Titanium Ted", // i18n TODO
    "partdefs.cannon.longshot": "Lonsghot", // i18n TODO
    "partdefs.cannon.seraphimShot": "Seraphim's Shot", // i18n TODO

    "partdefs.vacuum.slurpman": "Slurpman", // i18n TODO
    "partdefs.vacuum.courier": "Courier", // i18n TODO
    "partdefs.vacuum.whirlpool": "Whirlpool", // i18n TODO
    "partdefs.vacuum.vortex": "Vortex",

    "makedefs.dependableDave": "Dependable Dave", // i18n TODO
    "makedefs.fisherman": "Fisherman", // i18n TODO
    "makedefs.patroller": "Patroller", // i18n TODO
    "makedefs.queenBee": "Queen Bee", // i18n TODO
    "makedefs.hubris": "Hubris", // i18n TODO
    "makedefs.wispOfTheMorning": "Wisp o' the Morning", // i18n TODO
    "makedefs.highHarpooner": "High Harpooner", // i18n TODO
    "makedefs.highSeasRoberts": "High Seas Roberts", // i18n TODO
    "makedefs.jasper": "Jasper", // i18n TODO
    "makedefs.marieAntoniette": "Marie Antoniette", // i18n TODO
    "makedefs.vickyVictorious": "Vicky Victorious", // i18n TODO

    "crewdefs.hicks": "Hicks", // i18n TODO
    "crewdefs.jason": "Jason", // i18n TODO
    "crewdefs.robert": "Robert", // i18n TODO
    "crewdefs.philbert": "Philbert", // i18n TODO
    "crewdefs.mortimer": "Mortimer", // i18n TODO
    "crewdefs.hudson": "Hudson", // i18n TODO
    "crewdefs.rodrick": "Rodrick", // i18n TODO
    "crewdefs.malcolm": "Malcolm", // i18n TODO
    "crewdefs.jacklin": "Jacklin", // i18n TODO
    "crewdefs.guterrez": "Guterrez", // i18n TODO
    "crewdefs.chaplain": "Chaplain", // i18n TODO
    "crewdefs.mrConk": "Mr. Conk", // i18n TODO

    "fooddefs.pancake": "pancake", // i18n TODO
    "fooddefs.potato": "potato", // i18n TODO
    "fooddefs.cake": "cake", // i18n TODO
    "fooddefs.bread": "bread", // i18n TODO
    "fooddefs.crackers": "crackers", // i18n TODO
    "fooddefs.tuna": "tuna", // i18n TODO
    "fooddefs.sardines": "sarines", // i18n TODO

    "lootdefs.vase": "Royal Vase",
    "lootdefs.gold": "Gold Bar",
    "lootdefs.jar": "Spice Jar",
    "lootdefs.ores": "Mineral Ores",
    "lootdefs.lamp": "Golden Lamp",
    "lootdefs.flutes": "Tribal Flutes",
    "lootdefs.chalice": "Golden Chalice",
    "lootdefs.statuette": "Golden Statuette",
    "lootdefs.statue": "Tribal Statue",

    "shopinfo.manning.needsInterp": "needs {{manned}} total manning strength", // i18n TODO
    "shopinfo.manning.needsAny": "needs to be manned", // i18n TODO
    "shopinfo.manning.needs": "needs to be manned", // i18n TODO
    "shopinfo.manning.min": " (min. crew strength {{manned}})", // i18n TODO
    "shopinfo.crew.salary": "daily salary: {{salary}}", // i18n TODO
    "shopinfo.crew.salaryTomorrow": "next day's salary: {{salary}}", // i18n TODO
    "shopinfo.crew.foodIntake": "daily food intake: {{foodIntake}}", // i18n TODO
    "shopinfo.crew.strength": "manning strength: {{strength}}", // i18n TODO
    "shopinfo.crew.manning": "manning a: {{manningType}}", // i18n TODO
    "shopinfo.crew.captain": "captaining this ship", // i18n TODO
    "shopinfo.crew.idle": "idle", // i18n TODO
    "shopinfo.projectileModifier": "fitted with {{modifierName}}", // i18n TODO
    "shopinfo.cannon.caliber": "caliber: {{caliber}}", // i18n TODO
    "shopinfo.cannon.shootRate": "shots per minute: {{spm}}", // i18n TODO
    "shopinfo.cannon.spread": "spread: {{spread}}", // i18n TODO
    "shopinfo.cannon.range": "max. range: {{rangeMeters}}", // i18n TODO
    "shopinfo.vacuum.range": "attract range: {{suckRadiusMeters}}", // i18n TODO
    "shopinfo.vacuum.strength": "attract power: {{strength}} N/sqrt(m)", // i18n TODO
    "shopinfo.engine.noFuel": "manual", // i18n TODO
    "shopinfo.engine.fuelType": "fuel type: {{fuelType}}", // i18n TODO
    "shopinfo.engine.fuelCost": "fuel cost: {{fuelCost}} kg/min", // i18n TODO
    "shopinfo.engine.thrust": "thrust: {{thrust}} kN", // i18n TODO

    "projectile.modifier.homing": "homing fins", // i18n TODO
    "projectile.modifier.gum": "propeller gum", // i18n TODO
    "projectile.modifier.incendiary": "incendiary phosphorus", // i18n TODO
    "projectile.modifier.noxious": "noxious gas", // i18n TODO
    "projectile.modifier.explosive": "explosive charges", // i18n TODO
    "projectile.modifier.spin": "spin charge", // i18n TODO
    "projectile.modifier.repulsion": "repulsion disc", // i18n TODO
    "projectile.modifier.plasmaField": "plasma field bomb", // i18n TODO
    "projectile.modifier.smokescreen": "smokescreen bomb", // i18n TODO
    "projectile.modifier.acid": "anti-armor corrosive acid", // i18n TODO

    "fueltype.coal": "coal", // i18n TODO
    "fueltype.diesel": "diesel", // i18n TODO

    "itemtype.crew": "crewmate", // i18n TODO
    "itemtype.food": "food", // i18n TODO
    "itemtype.cannon": "cannon", // i18n TODO
    "itemtype.engine": "engine", // i18n TODO
    "itemtype.vacuum": "vacuum", // i18n TODO
    "itemtype.cannonballAmmo": "cannonball", // i18n TODO
    "itemtype.fuel": "fuel", // i18n TODO
    "itemtype.valuable": "loot", // i18n TODO

    cannonball: "{{caliber}} cannonball",
    "cannonball.plural": "{{caliber}} cannonballs",

    "food.spoiled": "(spoiled)",
    "food.info.shelfLfe": "days until spoiled: {{spoilDays}}",

    "intermission.moneyCounter": "Money: {{money}}", // i18n TODO
    "intermission.drydock": "Drydock", // i18n TODO
    "intermission.drydock.parts": "Parts", // i18n TODO
    "intermission.drydock.part.action.repair": "Repair ({{repairCost}})", // i18n TODO
    "intermission.drydock.part.action.uninstall": "Uninstall", // i18n TODO
    "intermission.drydock.part.action.assignCrew": "Assign Crew", // i18n TODO
    "intermission.drydock.part.action.unassignCrew": "Unassign Crew", // i18n TODO
    "intermission.drydock.part.manned": "manned by: {{mannedBy}}",
    "intermission.drydock.part.unmanned": "(not manned!)",
    "intermission.drydock.part.damaged":
      "{{percent}}% damaged (cost to fix: {{repairCost}})", // i18n TODO
    "intermission.drydock.part.notDamaged": "Intact", // i18n TODO
    "intermission.drydock.slots": "Slots: ", // i18n TODO
    "intermission.drydock.inventory": "Inventory", // i18n TODO
    "intermission.drydock.item.weight": "weight: {{weight}}", // i18n TODO
    "intermission.drydock.item.damage":
      "{{damagePerc}}% damaged ({{repairCost}} to repair)", // i18n TODO
    "intermission.drydock.item.action.fireCrew": "Fire", // i18n TODO
    "intermission.drydock.item.action.resell": "Resell ({{value}})", // i18n TODO
    "intermission.drydock.item.action.resellHalf": "Resell Half ({{value}})", // i18n TODO
    "intermission.drydock.item.action.fleetMove": "Move to...", // i18n TODO
    "intermission.drydock.item.action.fleetMoveHalf": "Move Half to...", // i18n TODO
    "intermission.drydock.item.action.fleetMove.dropdown.to": "to {{shipName}}", // i18n TODO
    "intermission.drydock.item.action.fleetMove.dropdown.cancel": "cancel", // i18n TODO
    "intermission.drydock.item.action.appoint": "Appoint to Captainship", // i18n TODO
    "intermission.drydock.item.action.install": "Install Part", // i18n TODO
    "intermission.drydock.autoInstall": "Auto-Install", // i18n TODO
    "intermission.drydock.autoResell": "Auto-Resell", // i18n TODO
    "intermission.drydock.autoRepair": "Auto-Repair", // i18n TODO
    "intermission.drydock.repair.healthy": "Ship hull is fine",
    "intermission.drydock.repair.damaged":
      "Ship hull is damaged ({{repairCost}})",
    "intermission.drydock.stats": "Stats", // i18n TODO
    "intermission.drydock.stats.salary.name": "Salary:", // i18n TODO
    "intermission.drydock.stats.food.name": "Food:", // i18n TODO
    "intermission.drydock.stats.repairs.name": "Repairs:", // i18n TODO
    "intermission.drydock.stats.weight.name": "Weight:", // i18n TODO
    "intermission.drydock.stats.engines.name": "Engines:", // i18n TODO
    "intermission.drydock.stats.fuel.name": "Fuel:", // i18n TODO
    "intermission.drydock.stats.ammo.name": "Ammunition:", // i18n TODO
    "intermission.drydock.stats.manned.name": "Manned Parts:", // i18n TODO
    "intermission.drydock.stats.salary.info.strikeSoon":
      "Or else, crew may refuse to work in {{strikesIn}} days.",
    "intermission.drydock.stats.salary.info.insufficient":
      "You need {{money}} to meet salaries tomorrow, at {{salary}}/day.", // i18n TODO
    "intermission.drydock.stats.salary.info.sufficient":
      "You have enough money to meet all salary demands for {{days}} day, at {{salary}}/day.", // i18n TODO
    "intermission.drydock.stats.salary.info.sufficient.pluralDays":
      "You have enough money to meet all salary demands for {{days}} days, at {{salary}}/day.", // i18n TODO
    "intermission.drydock.stats.food.info.head":
      "You have {{food}} food point, and your crew consumes {{totalIntake}} a day.", // i18n TODO
    "intermission.drydock.stats.food.info.head.plural":
      "You have {{food}} food points, and your crew consumes {{totalIntake}} a day.", // i18n TODO
    "intermission.drydock.stats.food.info.insufficient":
      "You do not have enough, and your crew WILL refuse to work!", // i18n TODO
    "intermission.drydock.stats.food.info.sufficient":
      "You have enough for {{days}} days.", // i18n TODO
    "intermission.drydock.stats.repairs.info.intact":
      "Your ship is completely fine and needs no repairs.", // i18n TODO
    "intermission.drydock.stats.repairs.info.damaged.insufficient":
      "Your ship has damages, and you will need {{missingMoney}} more to fix everything, at {{totalCost}}.", // i18n TODO
    "intermission.drydock.stats.repairs.info.damaged.sufficient":
      "Your ship has damages, and you have enough money to fix everything - it will cost you {{totalCost}}, leaving you with {{remaining}}.", // i18n TODO
    "intermission.drydock.stats.weight.info":
      "Your ship weights {{totalWeight}}; {{hullWeight}} of that is the hull.", // i18n TODO
    "intermission.drydock.stats.engines.info":
      "Your ship, with its current engine situation, can output up to {{totalThrust}} kN/s.", // i18n TODO
    "intermission.drydock.stats.engines.info.none":
      "Your ship has no functioning engines. Check fuel and manning.", // i18n TODO
    "intermission.drydock.stats.fuel.info.head":
      "{{fueled}} of your {{numEngines}} installed engines have fuel.", // i18n TODO
    "intermission.drydock.stats.fuel.info.need":
      "You need more: {{missingFuelTypes}}", // i18n TODO
    "intermission.drydock.stats.fuel.info.quickest":
      "The fuel you'll first run out of is {{quickest}}, after {{quickestDuration}}.",
    "intermission.drydock.stats.ammo.info.head":
      "{{loaded}} of your {{numCannons}} cannons have ammo.", // i18n TODO
    "intermission.drydock.stats.ammo.info.need":
      "You need more of the following calibers: {{missingCalibers}}", // i18n TODO
    "intermission.drydock.stats.manned.info":
      "Of your ship's {{numParts}} installed parts, {{numNeedManned}} are manually operated. Of them, {{numManned}} have crew operating them.", // i18n TODO
    "intermission.shop": "Shop", // i18n TODO
    "intermission.shop.buy": "Buy", // i18n TODO
    "intermission.shop.hire": "Hire", // i18n TODO
    "intermission.harbor": "Harbor", // i18n TODO
    "intermission.harbor.ship.hp": "Max HP: {{maxDamage}}", // i18n TODO
    "intermission.harbor.ship.size": "Size: {{size}} x {{lateralSize}}", // i18n TODO
    "intermission.harbor.ship.slots": "Slots:", // i18n TODO
    "intermission.harbor.ship.action.switch": "Buy & Switch to Make ({{cost}})", // i18n TODO
    "intermission.harbor.ship.action.buy": "Buy & Add to Fleet ({{cost}})", // i18n TODO
    "intermission.harbor.ship.status.cannotAfford": "Not enough money!",
    "intermission.harbor.ship.status.mustUninstall":
      "Uninstall every part of your main ship first!",
    "intermission.cartography": "Cartography", // i18n TODO
    "intermission.cartography.invade": "Invade Next Island!", // i18n TODO

    all: "All",
    none: "None",
  },
};
