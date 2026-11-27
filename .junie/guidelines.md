# Draft Dash project guidelines

Draft Dash is a booth mini-game for the Cloud9 x JetBrains hackathon (Category 3). See README.md for the game rules and booth requirements.

## Stack
- TypeScript + Vite, no UI framework. Vitest for tests.
- The only runtime dependency is the Chakra Petch font (`@fontsource`, OFL), bundled so the booth works offline. Do not add others without a clear reason.
- Animations are CSS-only (transform/opacity) and must stay off under `prefers-reduced-motion`.

## Structure
- `src/game/*.ts`: pure game logic (rules, scoring, leaderboard storage). No DOM, no timers. Each of these has a `*.test.ts` next to it.
- `src/game/sound.ts`: Web Audio sound effects, no audio files (browser-only, not unit tested).
- `src/sigils.ts`: original inline-SVG element icons.
- `src/main.ts`: screens (attract → play → result, plus `#leaderboard`) and input handling.
- `src/style.css`: all styles; colors live in the `:root` variables.

## Conventions
- Each screen is entered through `enterScreen()`, which aborts the previous screen's AbortController. Register every listener and timer with that screen's `signal` so the booth resets cleanly between players.
- Only static data or validated values (hero names, A-Z initials) go into `innerHTML`. Never inline unvalidated input.
- Original names, art and sounds only; nothing from Riot Games or other third-party titles.
- Controls stay simple: mouse-only must always work; keyboard shortcuts are extras.
- Keep accessibility: visible focus, buttons at least 44×44 px, readable contrast.

## Before finishing a task
Run `npm test` and `npm run build`; both must pass.
