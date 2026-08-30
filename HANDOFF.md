# redline, a handoff

built by clement hugbo ([github.com/codemathics](https://github.com/codemathics)). you're picking up a tool i care about, so read this before you touch anything. the bar here is family.co, emil kowalski, benji taylor, aiden bai. if a change wouldn't survive in that company, it doesn't ship.

## what this is

redline is a chrome extension for designers who think in the browser. hover any element and a red line follows you. click and the element locks for editing. a floating panel exposes everything that matters (type, color, radius, border, shadow, spacing, even the text itself) as live-editable, scrubbable fields. every edit is tracked as a before → after diff, and one button copies the whole session as an agent-ready markdown annotation: selectors, element paths, text snippets, property diffs. paste that into a coding agent and it maps the rendered dom back to source components.

the loop is the product: look → tweak → copy → agent applies it to real code.

## run it

```bash
pnpm install
pnpm dev        # demo page + inspector auto-mounted at http://localhost:5210
```

`window.redline` exposes `{ mount, unmount, toggle, annotation }` in the dev harness. cmd+. re-toggles after esc.

build the extension:

```bash
pnpm run build:ext
```

then chrome://extensions → developer mode → load unpacked → `dist-extension/`. toolbar click toggles, click again or esc to quit.

## the map

everything lives in `src/inspector/`, vanilla js, no framework, one shadow root.

- `index.js`: orchestrator. mount/unmount, the two overlays, event capture, keyboard, undo stack, theme, the before/after view, toasts.
- `overlay.js`: the morphing highlight boxes. one class, two variants (`rl-hover`, `rl-pin`). the pin tracks its element with a raf loop; both morph with a 150ms spring.
- `panel.js`: the whole panel ui. sections, fields, scrubbing, breadcrumbs, font menu, changes tray, copy.
- `colorpicker.js`: custom picker popover. sv field, hue + alpha sliders, hex input, eyedropper api.
- `fonts.js`: font catalog. local fonts via queryLocalFonts (permission-gated, curated fallback) + curated google fonts loaded on demand.
- `styles.js`: computed-style reading, `PROP_META` (the single registry of editable properties), and `toHex`.
- `changes.js`: the change store. per-element edit maps, revert, before/after flips, and the markdown serializer.
- `dom.js`: selector generation, element paths, text-editability rules.
- `ui.css`: the entire design system. tokens at the top, everything resolves to them.

`src/main.js` is the dev harness entry, `src/content-entry.js` is the extension entry (injection toggles via a window guard). `index.html` + `demo/` is the page under test, not the product.

## the design system, and calls already settled

don't relitigate these without seeing them run.

- one accent, two volumes. the roaming hover line is the brand red whispered (50% alpha). the pinned element gets the full red frame, corners, and chip. we tried neutral-ghost hover and an indigo pin, both lost. red = where you are and what changed.
- the pin frame fades out (350ms) on every edit and softly returns after 2s idle, so the frame never hides the border you're literally editing. selecting again brings it back instantly.
- panel type is inter, values are mono, and the "Redline" wordmark is deliberately serif (ui-serif). section headers are sentence case, never all-caps, never all-lowercase.
- no em dashes anywhere in ui copy. period, comma, or colon.
- motion: transform/opacity only, ease-out or the spring token, sub-300ms, everything interruptible, prefers-reduced-motion collapses it all. panel content cascades in with a 10ms-per-item stagger capped at 240ms.
- editor themes: light and dark token sets on `:host(.rl-dark)`, follows system, persists per site in localStorage.

## hard-won gotchas (each of these cost a real debugging session)

1. `all: initial` on the shadow :host silently beat `font-family` and the panel rendered times for days without anyone noticing. `all: initial` goes first in the :host block, and font-family is re-declared on `.rl-panel`, `.rl-tag`, `.rl-toast`. don't consolidate those.
2. chrome returns oklab()/oklch() from getComputedStyle for modern colors. `toHex` normalizes by rasterizing one pixel on a canvas. don't replace it with string parsing.
3. hover-preview must never contaminate the recorded "before" value. the font menu calls `endPreview()` before committing a pick. the color picker commits through the same guarded path. if you add any new preview-then-commit interaction, restore the pre-preview value first.
4. never animate a transform that also carries -50% centering. the toast wiggled sideways because the overshoot spring overshot the centering too. wrappers own centering, springs own y/scale.
5. anything the inspector must ignore (its own root, other overlay tools) is excluded in `isInspectable` in `dom.js`.
6. clipboard falls back to execCommand when the permission is denied. keep both paths.
7. text editing only offers itself when children are text nodes and `<br>`s (line breaks round-trip as `\n`). widening that rule will eat someone's nested markup.
8. scrub and drag edits coalesce into one undo step (500ms window) or cmd+z becomes useless after a scrub.

## the annotation contract

```markdown
## Design annotations: host/path

### 1. `button.btn` ("Get started")
- selector: `div.hero-actions > button.btn:nth-of-type(1)`
- path: `body > main.main > section.hero > div.hero-actions > button.btn`
- changes:
  - `border-radius`: `12px` → `999px`
  - `text`: `Get started` → `Start now`
```

agents downstream parse this. if you change the shape, version it.

## where i'd go next

- capture the element's text snippet at copy time, not first-edit time (mid-typing edits currently produce snippets like "C").
- element screenshot in the annotation via `chrome.tabs.captureVisibleTab`.
- persistence per url (chrome.storage) so edits survive reloads.
- keyboard navigation inside the font menu and color picker.
- per-corner radius and a proper shadow builder.
- extension icons. it still ships iconless.
- iframe support, currently top document only.

## taste

the full bar lives in `TASTE.md` (tokens, motion rules, interaction details, the never-ship list, and the audit loop). read it before your first visual change. in one line: if a reviewer could say "this is just the default," it fails. loop until it doesn't.

## what's in this package

- `HANDOFF.md`: this file. start here.
- `TASTE.md`: the design bar. read second.
- `README.md`: user-facing usage and build instructions.
- `src/`: the inspector source (see the map above), dev harness entry, dev-only tooling.
- `extension/`: manifest + background worker.
- `dist-extension/`: a ready-to-load build (chrome://extensions → load unpacked).
- `demo/` + `index.html`: the page under test for local dev.
- `vite.config.js`, `vite.extension.config.js`, `scripts/pack-extension.js`: dev server on :5210 and the extension build.

`pnpm install` then `pnpm dev` is the whole setup.

built with care by clement hugbo · [github.com/codemathics](https://github.com/codemathics)
