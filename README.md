# Redline

Inspect any element on any page, live-edit its styles, and copy an agent-ready
annotation of everything you changed.

Hover to preview, click to pin. The panel exposes typography, color, radius,
border, shadow, opacity, size, gap, padding, and margin as live-editable fields.
Every edit is tracked as a before → after diff; "Copy for agent" serializes all
of them into markdown (selector, element path, text snippet, property diffs)
ready to paste into Claude Code or any coding agent.

## Use it

- **Hover** previews an element, **click** pins it.
- **Drag a field label** (or the padding/margin numbers) to scrub values; hold
  **shift** for 10×. Arrow keys nudge a focused field.
- **↑ / ↓ / ← / →** walk the DOM (parent / child / siblings) while pinned.
- **Cmd+Z** undoes the last edit. **Esc** unpins, then quits.
- The **changes tray** (bottom of the panel) lists every diff; hover a row to
  revert it, click the element name to jump back to it.
- **Copy for agent** puts the annotation markdown on your clipboard.

## Dev harness

```bash
pnpm install
pnpm dev          # demo page + inspector at http://localhost:5210
```

The harness auto-mounts the inspector (`window.redline.toggle()` or Cmd+. to
re-toggle).

## Build the Chrome extension

```bash
pnpm run build:ext
```

Then open `chrome://extensions`, enable Developer mode, click **Load unpacked**,
and pick the `dist-extension/` folder. Click the Redline toolbar icon on any
page to toggle the inspector (click again or press Esc to quit).

## Annotation format

```markdown
## Design annotations: example.com/pricing

### 1. `button.btn` ("Get started")
- selector: `div.hero-actions > button.btn:nth-of-type(1)`
- path: `body > main.main > section.hero > div.hero-actions > button.btn`
- changes:
  - `border-radius`: `12px` → `999px`
  - `font-size`: `15px` → `17px`
```
