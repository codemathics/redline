# privacy

redline is a chrome extension that inspects and live-edits styles on the page
you have open. this page is the privacy policy for the extension.

**contact:** [github.com/codemathics/redline](https://github.com/codemathics/redline)

## what redline does

when you click the toolbar icon, redline injects its inspector into that tab.
it reads the page's own html and computed styles so you can hover, pin, and
edit them. edits live on the page until you leave or revert them. "copy for
agent" writes a markdown annotation (selector, path, text snippet, property
diffs) to your clipboard.

redline does not create an account, does not sign you in, and does not have a
backend.

## data redline handles

**the current tab.** on toolbar click, the inspector runs in that tab
(`activeTab` + `scripting`). it reads the document so it can highlight
elements and show their styles. it does not request access to every site in
advance. there are no `host_permissions`.

**theme preference.** light or dark is stored in `localStorage` under
`redline-theme` on the origin of the tab you used. that value never leaves
the browser.

**clipboard.** only when you click "copy for agent". the annotation is written
to the clipboard on your machine. redline does not upload it.

**local fonts (optional).** if you open the font picker and the browser
supports it, redline may call `queryLocalFonts` after that gesture so the
menu can list fonts installed on your computer. chrome will ask the first
time. if you deny it, redline falls back to a small built-in list. font names
stay on the device.

**google fonts stylesheets.** the inspector ui loads inter from
`fonts.googleapis.com` / `fonts.gstatic.com`. if you apply a curated web
font to an element, redline loads that family from the same hosts. those
requests go to google, not to us. they can include your ip address and the
font file being fetched. redline does not send page content, annotations, or
account data with them.

## what redline does not do

- no analytics, crash reports, or usage pings to the author
- no ads, no trackers, no third-party pixels
- no remote code. the extension package is what runs
- no selling or sharing of user data. there is no user database
- no collection of passwords, payment info, or location

## children

redline is a developer tool. it is not directed at children and does not
knowingly collect personal information from anyone.

## changes

if this policy changes, the update will land in this file on the public repo.

last updated: 29 august 2026
