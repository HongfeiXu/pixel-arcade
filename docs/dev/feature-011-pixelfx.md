# Feature 011 — PixelFX rewards (local)

Use original generated transparent pixel sprite sheets, inspired by [PixelFX](https://github.com/patch-gg/pixelfx) (concept only; original artwork generated for Pixel Arcade by Hermes Agent), not copied upstream assets. Reward successful new target placement and victory in Sokoban, line-clear score gains in both block games, and food in Snake. CSS one-shot animation, one overlay at a time, no input interception, no new runtime dependency, no animation under prefers-reduced-motion. No simulation or save format changes. Clear on undo/restart/selection/pause; no reward on replay or restore.

Updated scope: phone and desktop only. Disable web TV mode at its entry/automatic detection boundary; retain internal remote/focus helpers for now because Sokoban selection and shared keyboard logic use them. No independent TV project changes.

Acceptance: unit tests, production build, actual phone and desktop browser screenshots and interaction checks. No publication.

## Local evidence

- 215 tests / 16 files passed; production build passed.
- Chrome via Playwright on local production preview: 393×852 touch win/next; 1280×900 keyboard win/undo/reload, reduced-motion hides overlay; no horizontal overflow. Screenshots: [phone](../verification/pixelfx-phone.png), [desktop](../verification/pixelfx-desktop.png).
- Generated art: three original RGBA PNGs, 192×32, six 32×32 frames each; no upstream code or assets copied. CSS overlay is centered above board, not cell anchored.
- Other game reward hooks compiled; full browser scoring regression not performed. Physical devices not tested.
