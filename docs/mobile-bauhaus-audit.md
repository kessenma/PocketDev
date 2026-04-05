# Mobile Bauhaus Audit

## Tokens
- Current issue: the old theme skewed soft-neutral, rounded, and generic.
- Change made: added stronger semantic roles for `canvas`, `panel`, `panelAlt`, `inkStrong`, `accentBlue`, `accentRed`, `accentYellow`, and `focusFrame`.
- Priority: complete for first pass.

## Typography
- Current issue: most screens relied on raw `fontWeight` plus size scale, so hierarchy was inconsistent and visually flat.
- Change made: added semantic text roles and a mobile typography resolver with display/body split.
- Priority: complete for first pass, with platform-safe condensed fallbacks in place.
- Follow-up: drop a licensed `PocketDevBauhausDisplay.ttf` into [`/Users/ke/ws/PocketDev/apps/mobile/assets/fonts/README.md`](/Users/ke/ws/PocketDev/apps/mobile/assets/fonts/README.md) path and link it.

## Navigation
- Current issue: tab/navigation chrome was rounded and low-contrast.
- Change made: bottom tabs and workspace sidebar now use flatter panels, stronger borders, condensed labels, and clearer status treatment.
- Priority: complete for first pass.

## Surfaces
- Current issue: major work surfaces leaned on glass, glow, pill badges, and soft cards.
- Change made: introduced Bauhaus panel, button, and badge primitives; rethemed tasks, projects, settings, project banner, and new-task sheet around them.
- Priority: complete for first pass.

## Controls
- Current issue: segmented controls and provider chips were too pill-heavy.
- Change made: segmented controls and model selector controls now use rectangular, outlined treatments with stronger active blocks.
- Priority: complete for first pass.

## Onboarding
- Current issue: connect/setup flows still rely heavily on gradients and glass.
- Change made: intentionally deferred from this pass.
- Priority: next wave after the primitive system stabilizes.

## Do Not Use
- Glass cards for core work surfaces.
- Large blur or glow treatments in productivity flows.
- Oversized radii as the default for panels or buttons.
- Pill badges as the standard status shape.
- Decorative gradients on primary tasking surfaces.
- Display typography for dense metadata, inputs, or logs.
