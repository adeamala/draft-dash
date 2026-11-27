# Draft Dash

**90 seconds to out-draft the enemy coach.** A booth mini-game for the Cloud9 x JetBrains "Sky's The Limit" Hackathon 2026 (Category 3: Event Mini Game).

**Play it:** https://adeamala.github.io/draft-dash/

Drafting is the strategy layer of esports that casual fans rarely see. Draft Dash turns it into a one-click reflex game: the enemy locks a hero, you pick the counter before the timer runs out.

## How to play

1. The enemy reveals a hero.
2. Click the one card (of three) that beats it. Blaze beats Frost, Frost beats Volt, Volt beats Blaze.
3. Faster picks score more; after 3 correct in a row, picks score x2; after 6, x3.
4. A wrong pick or a timeout costs one of 3 lives. The run ends after 90 seconds or 3 lost lives.

Shortcuts: `1` `2` `3` pick a card, `F` toggles fullscreen, `M` toggles sound (also as buttons on the start screen).

## Run it

```bash
npm install
npm run dev     # local dev server
npm test        # rules tests
npm run build   # production build in dist/
```

## Built with

- JetBrains WebStorm (and Junie for selected features)
- TypeScript + Vite, no framework
- `localStorage` for an offline daily leaderboard; a second window updates through the browser `storage` event

## Booth setup

For the event, run `npm run build && npm run preview` once; the built game then runs from the laptop with no internet.

1. Open the game on the play screen.
2. Open the same URL with `#leaderboard` at the end (e.g. `http://localhost:5173/#leaderboard`) on the second monitor. It updates live, no internet needed.

## Roadmap

- [x] Core rules: element cycle, round timer, combo, scoring (`src/game/rules.ts`)
- [x] Screens: attract → play → result (3-letter initials, mouse or keyboard) → back to attract
- [x] Leaderboard window (`#leaderboard`) synced offline, daily reset (`src/game/leaderboard.ts`)
- [x] Booth mode: 15 s idle on the result screen saves as `???` and returns to attract; no context menu
- [x] Fullscreen toggle
- [x] Sound effects synthesized with the Web Audio API, with mute (`src/game/sound.ts`)

## Submission checklist (deadline Jan 12, 2027, 11:00 PT)

- [ ] Public repo with this LICENSE and the `.idea` / `.junie` folders committed
- [ ] Playable demo link (static hosting of `dist/`)
- [ ] Demo video, max 3 minutes, public on YouTube
- [ ] Project description: features and which JetBrains tools did what
- [ ] Methodology write-up
- [ ] Category 3 selected on Devpost
- [ ] Optional bonus: AI workflow story (JetBrains IDE / Junie / Air)
