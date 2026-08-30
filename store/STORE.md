# chrome web store listing

paste these into the developer dashboard. the zip is `store/redline.zip`
after `pnpm run pack:ext`.

privacy policy url (after this file is on `main`):
https://github.com/codemathics/redline/blob/main/privacy.md

homepage:
https://github.com/codemathics/redline

category: developer tools

language: english

## name

redline

## one-line summary (132 character limit)

inspect any element, live-edit its styles, and copy an agent-ready design annotation.

## detailed description

redline is a chrome extension for designers who think in the browser.

click the toolbar icon on any page. hover to preview an element. click to pin
it. a floating panel exposes typography, color, radius, border, shadow,
opacity, size, gap, padding, and margin as live-editable fields. drag a field
label to scrub a value. every edit is tracked as a before / after diff.

when you are done, "copy for agent" puts a markdown annotation on your
clipboard: selector, element path, text snippet, and the property diffs.
paste that into a coding agent so the rendered page maps back to source.

redline stays on the tab you opened it on. it does not run in the background
across the web. theme is remembered in localStorage on that origin. nothing
is uploaded to a redline server.

## single purpose (privacy tab)

inspect and live-edit css on the current tab, then copy a design annotation
of those edits.

## permission justifications

**activeTab.** inject the inspector only on the tab where the user clicks the
toolbar icon. redline does not need access to other tabs or to every site.

**scripting.** run the inspector script on that same tab after the click so
the overlay and panel can read and edit styles on the page.

remote code: no.

## graphic assets in this folder

- `promo-small.png` - 440 x 280 small promo tile (lockup on dark paper)
- `screenshot-01-inspect.png` - 1280 x 800, inspector pinned on a button
- `screenshot-02-card.png` - 1280 x 800, inspector pinned on a card title

optional extra shots he can take in the same size: hover preview, the
changes tray after an edit, and the copy-for-agent confirmation.

## store icon

the 128 x 128 tile is the crop-mark in `extension/icons/icon128.png`. chrome
reads it from the zip.
