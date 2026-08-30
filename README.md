# redline

inspect any element on any page, live-edit its styles, and copy an agent-ready
annotation of everything you changed.

hover to preview, click to pin. the panel exposes typography, color, radius,
border, shadow, opacity, size, gap, padding, and margin as live-editable fields.
every edit is tracked as a before → after diff; "copy for agent" serializes all
of them into markdown (selector, element path, text snippet, property diffs)
ready to paste into a coding agent.

## install

install redline from the [chrome web store](https://chromewebstore.google.com/category/extensions)
like any other extension. the listing is submitted; the store url goes here
once review finishes.

click the toolbar icon on any page to toggle the inspector (click again or
press esc to quit).

if you are working on the extension itself, `pnpm install` && `pnpm run pack:ext`
builds `dist-extension/` and a store zip. chrome://extensions → developer mode
→ load unpacked → `dist-extension/`.

## use it

- **hover** previews an element, **click** pins it.
- **drag a field label** (or the padding/margin numbers) to scrub values; hold
  **shift** for 10×. arrow keys nudge a focused field.
- **↑ / ↓ / ← / →** walk the DOM (parent / child / siblings) while pinned.
- **cmd+z** undoes the last edit. **esc** unpins, then quits.
- the **changes tray** (bottom of the panel) lists every diff; hover a row to
  revert it, click the element name to jump back to it.
- **copy for agent** puts the annotation markdown on your clipboard.

## local demo

`pnpm install` && `pnpm dev` is the local demo harness (demo page + inspector
at http://localhost:5210). it is how you try the inspector on a page under
test. it is not how you install the extension.

the harness auto-mounts the inspector (`window.redline.toggle()` or cmd+. to
re-toggle).

## annotation format

```markdown
## Design annotations: example.com/pricing

### 1. `button.btn` ("Get started")
- selector: `div.hero-actions > button.btn:nth-of-type(1)`
- path: `body > main.main > section.hero > div.hero-actions > button.btn`
- changes:
  - `border-radius`: `12px` → `999px`
      - `font-size`: `15px` → `17px`
```

## license

MIT. see `LICENSE`.
