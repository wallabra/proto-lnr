# Loot & Roam prototype

Loot & Roam is a physics action game, where you're a pirate ship, tasked with
invading islands, looting them and evading defenders, all while upgrading your
ship between islands, growing your fleet, and taking on ever dauntier challenges
and combat situations.

For now, we are going to use HTML5 Canvas to do a test version of the game. This
prototype will be used to test different aspects of gameplay, game design, and
physics simulation.

## How to Play

You can currently play on the [GitHub Pages site](wallabra.github.io/proto-lnr).
Your browser must support JavaScript, as well as HTML5 Canvas.

* Move and steer with the **left mouse button.**
* Shoot with **Spacebar.**
* Leave the island by going far enough from it; when prompted to, press **S**.

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
