# 16 · Compact workspace slides

## Goal

At the user's request, make the operator's central slide cards compact enough for long songs, with ordinary UI text and four/five columns, while preserving the live preview and projected content. Deliver as 0.2.1 with existing data intact.

## Depends on

05, 06, 15.

## Reference

Keep the ported workspace's selection, right-click editor, current-slide highlight, keyboard navigation and blank-screen control. Only the operator's cards change.

## Steps

1. Use container queries to display four columns at laptop workspace widths and five on wider desktops; smaller workspaces retain two/three readable columns.
2. Replace the projection canvas inside text cards with a compact, fixed-height text excerpt using the normal 14px UI token. Show the complete text on hover and in the editor, and number the cards.
3. Keep full text, typography and background in the actual projection frame and live preview. Preserve scroll-to-current, click, arrow navigation and editing.
4. Add an Electron regression with thirty slides at 1280×800, 1440×900 and 1920×1080, including card geometry/readability, full-text projection, current selection, editing and blank-screen control. Inspect screenshots.
5. Increment package version to 0.2.1 and update the delivery/update guide. Keep app identity, Iris home and database schema 11 unchanged.

## Acceptance

- `pnpm check && pnpm format:check && pnpm build && pnpm test:e2e`, all with temporary Iris homes.
- Four columns at 1280/1440 and five at 1920; at least three rows visible at these sizes; card height no more than 100px and main text 14px.
- Existing thirty-slide content remains available in the editor and live projection despite the compact excerpt.
- Push activates the existing Windows/macOS workflows, as requested for delivery. Do not claim CI results before they are available.

## Out of scope

Changing live-preview/output layout, projection typography, media-stage cards, data location, automatic updates or database schema.

## Deviations

- This explicit user request supersedes the web port's large projection-style workspace cards. The shared text grid also keeps Bible verse cards consistent, without changing Bible text or output behavior.
- Short excerpts fit compact cards; hovering or opening the editor gives the full text. The live/output frame always receives the complete text.

Verification: `pnpm check` (130 unit tests), `pnpm format:check`, `pnpm build` and `pnpm test:e2e` (22 passed) pass with temporary homes. Inspected the 1440 and 1920 screenshots: four columns with twenty cards visible at 1440×900; five columns with all thirty cards visible at 1920×1080. The test also verifies four columns at 1280×800, 14px text, unchanged projection frames on resize, complete live text, editor contents and keyboard/blank-screen behavior. Physical Windows update/HDMI and remote build completion remain unverified.
