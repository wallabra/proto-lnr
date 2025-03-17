# Loot & Roam prototype

> :pushpin: If you're looking for the main Loot & Roam repository, see https://codeberg.org/GameCircular/loot-and-roam

Loot & Roam is a physics action game, where you're a pirate ship, tasked with
invading islands, looting them and evading defenders, all while upgrading your
ship between islands, growing your fleet, and taking on ever dauntier challenges
and combat situations.

This is the prototype, which is written for the Web in TypeScript, using HTML5
Canvas. Note that it is not optimized for performance or cross-platform access,
serving more as a proof-of-concept and as a testing ground for features and
game design, as opposed to a full-fledged game.

## How to Play

You can currently play on the [GitHub Pages site](https://wallabra.github.io/proto-lnr).
Your browser must support JavaScript, as well as HTML5 Canvas.

* Move and steer with the **left mouse button.** Alternatively, use **WASD**.
* Shoot with **Spacebar**, or rapid fire with the **right mouse button**.
* Toggle the HUD with **H**.
* Pause the game with **P**.
* Leave the island by going far enough from it; when prompted to, press **L**.
* You can reset the game with **R**.

## Technical

### Debug Server

To run a local debug server:

```sh
pnpm run server
```

Then you can access it at `localhost:1234`.

You can change the port by passing `--port=<myport>`, for instance:

```sh
pnpm run server --port=1400
```

### Contribution

Before commiting, make sure to prettify and lint:

```sh
pnpm prettify && pnpm lint
```

The prototype is not being prioritized for development. If you want to
contribute to the Loot & Roam project, see the [main repository](https://codeberg.org/GameCircular/loot-and-roam),
and in particular its [Contribution Guidelines](https://codeberg.org/GameCircular/loot-and-roam/src/branch/main/CONTRIBUTING.md).
