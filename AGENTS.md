# AGENTS.md

Instructions for coding agents working on Lagos Bike Rush, an endless Three.js motorcycle traffic-dodging game built for start.ng.

## Product rules

- The ride begins at a manageable pace and gets faster as traffic is successfully passed.
- A collision ends the current run immediately and offers an instant restart.
- A dodge counts only after a traffic vehicle passes behind the rider without a collision.
- Keyboard and touch controls must provide equivalent left/right movement.
- The game must remain playable as a guest and when start.ng does not answer.
- Always show the start.ng identity card. Human riders use the supplied style; alternate forms retain the player's colours.

## Start.ng requirements

- Keep `dist/` committed because start.ng does not run a build step.
- Vite's base must remain `./` so production asset paths are relative.
- `cover.png` must be 16:10, at least 640×400 and under 2 MB.
- Validate the public repo with `POST https://api.start.ng/games/check` before publishing.
- Trust connect-frame replies only when `event.origin === "https://start.ng"` and the source matches the frame.
- Never commit secrets, tokens or player session values.

## Commands

Use pnpm through Corepack:

```powershell
corepack pnpm install
corepack pnpm check
corepack pnpm build
```

Run the build before committing. Review the generated `dist/` changes and commit them with the source.

## Technical direction

- Vite, strict TypeScript and Three.js.
- Plain HTML/CSS for overlays and touch controls.
- Procedural geometry before large downloaded models or textures.
- Clamp frame deltas, cap device pixel ratio, reuse geometry/materials, and avoid per-frame DOM allocation.
- Keep the game near 60 FPS on laptops and at least 30 FPS on mid-range phones.
