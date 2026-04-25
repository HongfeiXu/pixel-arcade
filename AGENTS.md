# AGENTS.md

## Project

Pixel Arcade is a mobile-first PWA for young children: a pixel-style classic mini-game collection.

Primary target devices:
- iPhone 16 Pro Max: 440x956pt
- iPhone 16 Pro: 393x852pt

Production URL: https://hongfeixu.github.io/pixel-arcade/

## Commands

- `npm run dev` - start Vite dev server, default port 5173
- `npm run dev -- --host` - start dev server for LAN/mobile testing
- `npm run build` - run TypeScript build and Vite production build
- `npm run test:run` - run Vitest tests
- `npm run preview` - preview production build locally

## Stack

- React 19 + TypeScript + Vite 7
- React Router v7: `/` lobby, `/game/:id` game page
- Canvas 2D for game rendering
- CSS Modules, one `.module.css` per component where needed
- vite-plugin-pwa with Service Worker, manifest, and auto update
- Deployment through GitHub Pages and GitHub Actions on `master`

## Architecture Rules

- Game cores must be plain TypeScript classes and must not depend on React.
- New games implement the `GameInstance` interface from `src/games/types.ts`.
- Register games in `src/games/registry.ts`.
- `useGame` owns game lifecycle, React bridging, callbacks, visibility handling, score updates, and localStorage state handling.
- Game instances should not read or write localStorage directly.
- Canvas renders only the game area. HUD, score, preview, overlays, and controls are React UI.
- Compute game cell sizes from the actual available canvas container size, using `min(floor(width / cols), floor(height / rows))`.
- Use DPR-aware Canvas setup and `imageSmoothingEnabled = false`.

## Coding Conventions

- Use TypeScript strictly; avoid `any` and avoid `unknown` unless there is a clear boundary reason.
- Use CSS Modules instead of UI frameworks or global component styling.
- Do not introduce new UI frameworks or state-management libraries unless explicitly approved.
- Keep comments sparse. Chinese comments are acceptable when they clarify non-obvious game logic.
- Prefer existing project patterns over new abstractions.
- Commit messages and user-facing project docs may be Chinese.

## Development Workflow

- Follow spec-driven development for features: discuss requirements, write/update a plan or feature document, then implement.
- For multi-step work, update the relevant plan document as tasks complete.
- Keep `docs/PLAN.md`, `docs/PROGRESS.md`, and `README.md` consistent when feature status changes.
- Keep `docs/IDEAS.md` as a lightweight idea pool; do not treat ideas there as committed roadmap items.
- Do not stop after partial implementation when the requested scope is clear. Carry work through implementation, verification, and status reporting.

## Verification

- Run `npm run build` before claiming code changes are complete.
- Run `npm run test:run` when touching tested game logic, especially `src/games/snake/`.
- For UI/gameplay changes, also use local browser/mobile testing when feasible.
- Report any verification command that could not be run.

## Key Paths

- `src/games/types.ts` - shared game interfaces and actions
- `src/games/registry.ts` - game registry
- `src/hooks/useGame.ts` - lifecycle and persistence bridge
- `src/hooks/useKeyboard.ts` - keyboard control mapping
- `src/components/GamePad.tsx` - touch control surface
- `docs/PLAN.md` - roadmap and milestone status
- `docs/PROGRESS.md` - development progress summary
- `docs/dev/` - architecture, API, deployment, and feature docs
