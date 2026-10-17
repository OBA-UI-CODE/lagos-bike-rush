# Lagos Bike Rush

An endless 3D motorcycle traffic-dodging game built with Three.js for start.ng.

## Game loop

Weave through Lagos traffic, count every clean dodge and survive as the road accelerates. One collision ends the run. Signed-in start.ng players bring their character colours and identity into the game and can save their best run to the shared leaderboard.

## Development

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm build
```

The production build is committed in `dist/` because start.ng serves static files and does not run a package build.

## Controls

- `A` / `D` or arrow keys: steer
- Touch the left/right controls on mobile
- `P`: pause

## Start.ng

The game uses the documented `https://start.ng/connect` frame to read the current player, save scores and load the shared leaderboard. Outside a `*.start.ng` address it falls back to a guest rider so local development remains playable.
