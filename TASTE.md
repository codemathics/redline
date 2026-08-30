# taste

this is the bar for redline. HANDOFF.md tells you what exists, this tells you how to judge anything new. the references are the published work of vercel geist, emil kowalski, rauno freiberg, family.co, benji taylor, and aiden bai. not vibes, their actual shipped work.

## the system is the law

every visual value resolves to a token in `src/inspector/ui.css`. a raw hex, a one-off px, or a hand-rolled shadow in a component means the change is not done. if you need a new value, mint a token first, then use it.

### type

- ui face: inter (injected via google fonts link, with system fallbacks). re-declared explicitly on `.rl-panel`, `.rl-tag`, `.rl-toast` because of the shadow-dom `all: initial` trap.
- values and code: the mono stack (`ui-monospace`, sf mono...). every number, selector, hex, and property name renders mono. prose never does.
- the wordmark "Redline" is serif (`ui-serif`, new york on mac). it is the only serif in the tool. that contrast is the identity, don't spread it.
- scale is tiny and tight: 10 / 11 / 12 / 13px. labels 10px, values 11px mono, body 12px, titles 13px semibold. nothing bigger inside the panel, ever.
- section headers are sentence case ("Text", "Surface", "Layout"). never all-caps with letterspacing, never all-lowercase.
- no em dashes in any ui copy. period, comma, or colon.

### color

- neutrals are a warm oklch ramp (hue 80, barely-there chroma), never generic grays, never pure #000 or #fff.
- one accent: marker red `oklch(0.6 0.213 27)`. it means two things and only two things: where you are (pin frame, current breadcrumb) and what changed (dirty dots, diff values, count chip).
- the same red at two volumes is the interaction model: hover = red at 50% alpha (a whisper), pinned = full red (a commitment). we tried a second hue (indigo) and a neutral ghost. both lost. one voice.
- both themes are first-class. every surface color is a token with a light and a dark value under `:host(.rl-dark)`. if you add a color and only think about light mode, it will look broken in dark within the hour.
- green appears exactly once (the copied-state confirmation). do not let it creep.

### depth

- panels: layered shadows (a 1px ring + a tight key + a wide ambient), glass backgrounds (`backdrop-filter: blur + saturate`), hairline borders at ~8% ink. no flat lone 1px borders around important surfaces.
- fields sit in the surface (tinted fill, no border) and lift on focus (solid bg + accent ring). that inversion is the field language, keep it.
- chips (element tags, toast) are near-black with the shadow-chip token, readable over any page.

### motion

- transform and opacity only. never animate layout properties on ui chrome.
- two curves: `--rl-ease` (crisp ease-out) for exits and utility, `--rl-spring` (slight overshoot) for arrivals and morphs. same interaction type, same duration, everywhere.
- durations: 120ms utility, 180ms standard, 260ms entrances, nothing routine over 300ms.
- entrances stagger top-to-bottom, 10ms per item, capped at 240ms total.
- everything is interruptible. never a spinner where a morph will do.
- `prefers-reduced-motion` collapses all of it to 1ms. this is wired globally in ui.css, keep new animations inside that umbrella.
- the classic trap already hit once: never put -50% centering in the same transform a spring animates. wrappers center, springs move.

### interaction details

- every numeric field scrubs (drag the label), shift = 10x, arrow keys nudge, enter commits, esc reverts. a new numeric field must do all five or it's not finished.
- edits apply live, per keystroke where typing is the input. the page is the preview, never a "apply" button.
- previews (font hover, color drag) must restore the pre-preview value before committing, or the change store records a lie.
- destructive-ish actions (reset, revert) act instantly but everything is undoable (cmd+z, coalesced per gesture).
- focus is visible everywhere: accent ring, never the browser default outline. keyboard paths exist for select (arrows walk the dom), quit (esc), and undo.
- the tool must never fight the page: clicks on non-inspectable ui pass through, other overlay tools are excluded, z-index is max but pointer-events default to none.

## never ship

- anything a reviewer could call "just the default": native form controls in the panel (we replaced the color input for exactly this), default browser easing, untouched-framework look.
- a second accent hue, a third font, a new radius value that isn't a token.
- all-caps section labels, em dashes, title-case buttons.
- motion over 300ms, ease-in on ui, scale(0) entrances, center-origin popovers.
- a light-mode-only or dark-mode-only surface.
- asserting a feel from code. run it, watch it move, screenshot both themes side by side. feel does not exist in a diff.

## the loop

when you change anything visual: screenshot light and dark, compare against the sibling surfaces, fix the lowest-scoring one, repeat until peers look like siblings. one off surface fails the whole tool.
