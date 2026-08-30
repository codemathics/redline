// The inspector panel: sections of live-editable fields + changes tray.

import { ancestorChain, shortLabel, isTextEditable, getEditableText, setEditableText } from './dom.js'
import { readStyles, hasOwnText, toHex, PROP_META } from './styles.js'
import { GOOGLE_FONTS, fontStack, loadGoogleFont, localFonts } from './fonts.js'
import { openColorPicker } from './colorpicker.js'

const ICONS = {
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>',
  cursor: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3l12 5.5-5 1.7L9.8 15z"/></svg>',
  eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 8s2.2-4.2 6.2-4.2S14.2 8 14.2 8s-2.2 4.2-6.2 4.2S1.8 8 1.8 8z"/><circle cx="8" cy="8" r="1.9"/></svg>',
  sun: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>',
  moon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 9.5A5.8 5.8 0 0 1 6.5 2.5a5.8 5.8 0 1 0 7 7z"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  alignLeft: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h6M3 12h8"/></svg>',
  alignCenter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M5 8h6M4 12h8"/></svg>',
  alignRight: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M7 8h6M5 12h8"/></svg>',
}

export class Panel {
  /**
   * @param {ShadowRoot} root
   * @param {object} hooks { onClose, onSelect, onEdit(el, prop, before, after), store }
   */
  constructor(root, hooks) {
    this.root = root
    this.hooks = hooks
    this.store = hooks.store
    this.el = document.createElement('div')
    this.el.className = 'rl-panel'
    root.appendChild(this.el)
    this.target = null
    this.trayOpen = false
    this._drag = { x: 0, y: 0 }
    this.render(null)
  }

  destroy() {
    this.el.remove()
  }

  // ---------------------------------------------------------------- render

  render(el) {
    this._closePopovers()
    this.target = el
    this.el.innerHTML = ''
    this.el.appendChild(this._head())
    const body = document.createElement('div')
    body.className = 'rl-body'
    if (!el) {
      body.appendChild(this._empty())
    } else {
      const s = readStyles(el)
      body.appendChild(this._crumbs(el))
      if (hasOwnText(el)) body.appendChild(this._textSection(el, s))
      body.appendChild(this._surfaceSection(el, s))
      body.appendChild(this._layoutSection(el, s))
      this._stagger(body)
    }
    this.el.appendChild(body)
    this.el.appendChild(this._tray())
  }

  // Cascade the panel contents in, top to bottom.
  _stagger(body) {
    const items = body.querySelectorAll('.rl-crumbs, .rl-sec-head, .rl-grid > *')
    items.forEach((n, i) => {
      n.classList.add('rl-anim')
      n.style.animationDelay = `${Math.min(i * 10, 240)}ms`
    })
  }

  refreshTray() {
    const tray = this.el.querySelector('.rl-tray')
    if (tray) tray.replaceWith(this._tray())
    const count = this.el.querySelector('.rl-tray-count')
    if (count) {
      count.classList.remove('rl-pop')
      void count.offsetWidth
      count.classList.add('rl-pop')
    }
  }

  _head() {
    const head = document.createElement('div')
    head.className = 'rl-head'
    const dark = this.hooks.isDark?.() ?? false
    head.innerHTML = `
      <span class="rl-logo"></span>
      <span class="rl-title">Redline</span>
      <span class="rl-head-spacer"></span>
      <button class="rl-iconbtn" data-act="theme" title="Switch to ${dark ? 'light' : 'dark'} editor" aria-label="Toggle editor theme">${dark ? ICONS.sun : ICONS.moon}</button>
      <button class="rl-iconbtn" data-act="close" title="Quit (Esc)" aria-label="Quit Redline">${ICONS.close}</button>`
    head.querySelector('[data-act="close"]').addEventListener('click', () => this.hooks.onClose())
    const themeBtn = head.querySelector('[data-act="theme"]')
    themeBtn.addEventListener('click', () => {
      const nowDark = this.hooks.onToggleTheme?.()
      themeBtn.innerHTML = nowDark ? ICONS.sun : ICONS.moon
      themeBtn.title = `Switch to ${nowDark ? 'light' : 'dark'} editor`
    })
    this._draggable(head)
    return head
  }

  _empty() {
    const div = document.createElement('div')
    div.className = 'rl-empty'
    div.innerHTML = `
      <div class="rl-empty-art">
        <span class="rl-bracket tl"></span><span class="rl-bracket tr"></span>
        <span class="rl-bracket bl"></span><span class="rl-bracket br"></span>
        <span class="rl-pulse"></span>
        ${ICONS.cursor}
      </div>
      <div class="rl-empty-title">Select an element</div>
      <div class="rl-empty-sub">Hover to preview, click to inspect.</div>
      <div class="rl-keys">
        <span class="rl-keygroup"><span class="rl-kbd">esc</span> quit</span>
        <span class="rl-keygroup"><span class="rl-kbd">↑</span> parent</span>
        <span class="rl-keygroup"><span class="rl-kbd">←</span><span class="rl-kbd">→</span> siblings</span>
      </div>`
    return div
  }

  _crumbs(el) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-crumbs'
    const chain = ancestorChain(el)
    chain.forEach((node, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'rl-crumb-sep'
        sep.textContent = '/'
        wrap.appendChild(sep)
      }
      const btn = document.createElement('button')
      btn.className = 'rl-crumb' + (node === el ? ' rl-here' : '')
      btn.textContent = shortLabel(node)
      btn.addEventListener('click', () => node !== el && this.hooks.onSelect(node))
      btn.addEventListener('mouseenter', () => this.hooks.onPreview?.(node))
      btn.addEventListener('mouseleave', () => this.hooks.onPreview?.(null))
      wrap.appendChild(btn)
    })
    requestAnimationFrame(() => (wrap.scrollLeft = wrap.scrollWidth))
    return wrap
  }

  _section(title) {
    const sec = document.createElement('div')
    sec.className = 'rl-sec'
    sec.innerHTML = `<div class="rl-sec-head"><span class="rl-sec-title">${title}</span></div>`
    const grid = document.createElement('div')
    grid.className = 'rl-grid'
    sec.appendChild(grid)
    return [sec, grid]
  }

  _textSection(el, s) {
    const [sec, grid] = this._section('Text')
    if (isTextEditable(el)) grid.appendChild(this._contentField(el))
    grid.appendChild(this._fontField(el, s.fontFamily))
    grid.appendChild(this._field(el, 'fontSize', s.fontSize))
    grid.appendChild(this._field(el, 'fontWeight', s.fontWeight, { scrub: 100, min: 100, max: 900 }))
    grid.appendChild(this._field(el, 'lineHeight', s.lineHeight))
    grid.appendChild(this._field(el, 'letterSpacing', s.letterSpacing))
    grid.appendChild(this._field(el, 'color', s.color))
    grid.appendChild(this._alignSeg(el, s.textAlign))
    return sec
  }

  _surfaceSection(el, s) {
    const [sec, grid] = this._section('Surface')
    grid.appendChild(this._field(el, 'backgroundColor', s.backgroundColor))
    grid.appendChild(this._field(el, 'borderRadius', s.borderRadius))
    grid.appendChild(this._field(el, 'borderWidth', s.borderWidth))
    grid.appendChild(this._field(el, 'borderColor', s.borderColor))
    grid.appendChild(this._field(el, 'boxShadow', s.boxShadow, { span: 2 }))
    grid.appendChild(this._field(el, 'opacity', s.opacity))
    return sec
  }

  _layoutSection(el, s) {
    const [sec, grid] = this._section('Layout')
    grid.appendChild(this._field(el, 'width', s.width))
    grid.appendChild(this._field(el, 'height', s.height))
    if (s.display.includes('flex') || s.display.includes('grid')) {
      grid.appendChild(this._field(el, 'gap', s.gap))
    }
    const pad = this._spaceBox(el, 'Padding', {
      t: ['paddingTop', s.paddingTop],
      r: ['paddingRight', s.paddingRight],
      b: ['paddingBottom', s.paddingBottom],
      l: ['paddingLeft', s.paddingLeft],
    })
    pad.classList.add('rl-span2')
    grid.appendChild(pad)
    const mar = this._spaceBox(el, 'Margin', {
      t: ['marginTop', s.marginTop],
      r: ['marginRight', s.marginRight],
      b: ['marginBottom', s.marginBottom],
      l: ['marginLeft', s.marginLeft],
    })
    mar.classList.add('rl-span2')
    grid.appendChild(mar)
    return sec
  }

  // ---------------------------------------------------------------- fields

  _field(el, prop, value, opts = {}) {
    const meta = PROP_META[prop]
    const wrap = document.createElement('div')
    wrap.className = 'rl-field'
    if (opts.span === 2) wrap.classList.add('rl-span2')
    const isColor = !!meta.color
    if (isColor) wrap.classList.add('rl-color')
    const scrubStep = opts.scrub ?? meta.scrub
    if (scrubStep) wrap.classList.add('rl-scrub')
    if (this.store.originalOf(el, prop) !== undefined) wrap.classList.add('rl-dirty')

    const label = document.createElement('span')
    label.className = 'rl-label'
    label.textContent = meta.label
    const input = document.createElement('input')
    input.className = 'rl-input'
    input.value = value
    input.spellcheck = false
    input.setAttribute('aria-label', meta.label)
    wrap.append(label, input)

    const commit = (v) => {
      if (v === input.dataset.applied) return
      this._apply(el, prop, v)
      input.dataset.applied = v
      input.value = isColor ? toHex(getComputedStyle(el)[prop] ?? v) || v : v
      wrap.classList.toggle('rl-dirty', this.store.originalOf(el, prop) !== undefined)
      if (isColor && swatchFill) paintSwatch(swatchFill, input.value)
    }
    input.dataset.applied = value
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') { commit(input.value.trim()); input.blur() }
      if (e.key === 'Escape') { input.value = input.dataset.applied; input.blur() }
      // arrow nudge for numeric values
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && scrubStep) {
        e.preventDefault()
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1) * scrubStep
        commit(nudge(input.dataset.applied, delta, opts.min ?? meta.min, opts.max ?? meta.max))
      }
    })
    input.addEventListener('blur', () => commit(input.value.trim()))

    let swatchFill = null
    if (isColor) {
      const swatch = document.createElement('button')
      swatch.className = 'rl-swatch'
      swatch.setAttribute('aria-label', `${meta.label} picker`)
      swatchFill = swatch
      paintSwatch(swatch, value)
      swatch.addEventListener('click', () => {
        this._closePopovers()
        this._closeColorPop = openColorPicker({
          panel: this.el,
          anchor: wrap,
          value: input.dataset.applied,
          onChange: (hex) => {
            commit(hex)
            paintSwatch(swatch, input.value)
          },
          onClose: () => (this._closeColorPop = null),
        })
      })
      wrap.appendChild(swatch)
    }

    if (scrubStep) this._scrubbable(label, input, commit, scrubStep, opts.min ?? meta.min, opts.max ?? meta.max)
    return wrap
  }

  // Editable text content: applies live on every keystroke.
  _contentField(el) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-field rl-span2'
    if (this.store.originalOf(el, 'text') !== undefined) wrap.classList.add('rl-dirty')
    const label = document.createElement('span')
    label.className = 'rl-label'
    label.textContent = 'Content'
    const input = document.createElement('textarea')
    input.className = 'rl-input rl-textarea'
    input.rows = 1
    input.value = getEditableText(el)
    input.spellcheck = false
    input.setAttribute('aria-label', 'Text content')
    wrap.append(label, input)

    const fit = () => {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    }
    const commit = () => {
      this.hooks.onEditIntent?.()
      const before = this.store.originalOf(el, 'text') ?? getEditableText(el)
      setEditableText(el, input.value)
      this.hooks.onEdit(el, 'text', before, input.value)
      wrap.classList.toggle('rl-dirty', this.store.originalOf(el, 'text') !== undefined)
    }
    input.addEventListener('input', () => { fit(); commit() })
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Escape') input.blur()
    })
    requestAnimationFrame(fit)
    return wrap
  }

  // Font picker: local fonts + Google fonts, live preview on hover,
  // optional apply-to-whole-page.
  _fontField(el, current) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-field rl-span2 rl-fontfield'
    if (this.store.originalOf(el, 'fontFamily') !== undefined) wrap.classList.add('rl-dirty')
    wrap.innerHTML = `
      <span class="rl-label">Font</span>
      <button class="rl-fontvalue" aria-haspopup="listbox">
        <span class="rl-fontname"></span>
        ${ICONS.chevron}
      </button>`
    const nameEl = wrap.querySelector('.rl-fontname')
    nameEl.textContent = current
    wrap.querySelector('.rl-fontvalue').addEventListener('click', () => {
      this._openFontMenu(el, wrap, (family) => {
        nameEl.textContent = family
        wrap.classList.toggle('rl-dirty', this.store.originalOf(el, 'fontFamily') !== undefined)
      })
    })
    return wrap
  }

  _closePopovers() {
    this._closeFontMenu()
    this._closeColorPop?.()
    this._closeColorPop = null
  }

  async _openFontMenu(el, anchor, onPicked) {
    this._closePopovers()
    const menu = document.createElement('div')
    menu.className = 'rl-fontmenu'
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = this.el.getBoundingClientRect()
    menu.style.top = `${Math.min(anchorRect.bottom - panelRect.top + 6, panelRect.height - 330)}px`
    menu.innerHTML = `
      <input class="rl-fontsearch" placeholder="Search fonts" spellcheck="false" aria-label="Search fonts" />
      <div class="rl-fontlist" role="listbox"></div>
      <button class="rl-fontpage">Set as page font</button>`
    this.el.appendChild(menu)
    this._fontMenu = menu

    const search = menu.querySelector('.rl-fontsearch')
    const list = menu.querySelector('.rl-fontlist')
    const applied = () => getComputedStyle(el).fontFamily

    let hoverToken = 0
    const preview = async (family, google) => {
      const token = ++hoverToken
      if (google) await loadGoogleFont(family)
      if (token !== hoverToken || !this._fontMenu) return
      el.style.fontFamily = fontStack(family)
    }
    const endPreview = () => {
      hoverToken++
      const orig = this.store.originalOf(el, 'fontFamily')
      const edit = this.store.groups.get(el)?.edits.get('fontFamily')
      el.style.fontFamily = edit ? edit.after : orig !== undefined ? orig : ''
    }
    const pick = async (family, google) => {
      if (google) await loadGoogleFont(family)
      // restore the pre-preview value first so `before` is captured correctly
      endPreview()
      this._apply(el, 'fontFamily', fontStack(family))
      onPicked(family)
      this._closeFontMenu()
    }

    const locals = await localFonts()
    const render = () => {
      const q = search.value.trim().toLowerCase()
      const match = (f) => f.toLowerCase().includes(q)
      list.innerHTML = ''
      const section = (title, fonts, google) => {
        const hits = fonts.filter(match).slice(0, 60)
        if (!hits.length) return
        const cap = document.createElement('div')
        cap.className = 'rl-fontcap'
        cap.textContent = title
        list.appendChild(cap)
        for (const family of hits) {
          const opt = document.createElement('button')
          opt.className = 'rl-fontopt'
          opt.setAttribute('role', 'option')
          opt.textContent = family
          if (!google) opt.style.fontFamily = fontStack(family)
          opt.addEventListener('mouseenter', () => preview(family, google))
          opt.addEventListener('mouseleave', endPreview)
          opt.addEventListener('click', () => pick(family, google))
          list.appendChild(opt)
        }
      }
      section('On this device', locals, false)
      section('Google fonts', GOOGLE_FONTS, true)
    }
    render()
    search.addEventListener('input', render)
    search.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Escape') this._closeFontMenu()
    })

    menu.querySelector('.rl-fontpage').addEventListener('click', () => {
      endPreview()
      this._apply(document.body, 'fontFamily', applied())
      this.hooks.onToast?.('Applied to the whole page')
      this._closeFontMenu()
    })

    // close on outside click
    this._fontMenuDismiss = (e) => {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) this._closeFontMenu()
    }
    setTimeout(() => this.root.addEventListener('click', this._fontMenuDismiss, true), 0)
    search.focus()
  }

  _closeFontMenu() {
    if (this._fontMenuDismiss) this.root.removeEventListener('click', this._fontMenuDismiss, true)
    this._fontMenuDismiss = null
    this._fontMenu?.remove()
    this._fontMenu = null
  }

  _alignSeg(el, current) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-seg rl-span2'
    const thumb = document.createElement('span')
    thumb.className = 'rl-seg-thumb'
    wrap.appendChild(thumb)
    const options = [
      ['left', ICONS.alignLeft],
      ['center', ICONS.alignCenter],
      ['right', ICONS.alignRight],
    ]
    const normalized = current === 'start' ? 'left' : current === 'end' ? 'right' : current
    const buttons = options.map(([val, icon]) => {
      const b = document.createElement('button')
      b.innerHTML = icon
      b.dataset.val = val
      b.setAttribute('aria-label', `Align ${val}`)
      if (val === normalized) b.classList.add('rl-on')
      b.addEventListener('click', () => {
        this._apply(el, 'textAlign', val)
        buttons.forEach((x) => x.classList.toggle('rl-on', x === b))
        moveThumb(b)
      })
      wrap.appendChild(b)
      return b
    })
    const moveThumb = (b) => {
      thumb.style.width = `${b.offsetWidth}px`
      thumb.style.transform = `translateX(${b.offsetLeft - 2}px)`
    }
    requestAnimationFrame(() => {
      const active = buttons.find((b) => b.classList.contains('rl-on')) || buttons[0]
      thumb.style.transition = 'none'
      moveThumb(active)
      void thumb.offsetWidth
      thumb.style.transition = ''
    })
    return wrap
  }

  _spaceBox(el, cap, sides) {
    const box = document.createElement('div')
    box.className = 'rl-spacebox'
    box.innerHTML = `<span class="rl-spacebox-cap">${cap}</span><div class="rl-spacebox-inner"></div>`
    for (const [pos, [prop, value]] of Object.entries(sides)) {
      const input = document.createElement('input')
      input.className = `rl-space-in ${pos}`
      input.value = parseFloat(value) || 0
      input.dataset.applied = input.value
      input.setAttribute('aria-label', PROP_META[prop].label)
      const commit = (raw) => {
        const n = parseFloat(raw)
        if (isNaN(n)) { input.value = input.dataset.applied; return }
        const v = `${n}px`
        this._apply(el, prop, v)
        input.value = n
        input.dataset.applied = n
        input.classList.toggle('rl-dirty', this.store.originalOf(el, prop) !== undefined)
      }
      input.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Enter') { commit(input.value); input.blur() }
        if (e.key === 'Escape') { input.value = input.dataset.applied; input.blur() }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          commit(String(parseFloat(input.dataset.applied) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)))
        }
      })
      input.addEventListener('blur', () => commit(input.value))
      this._scrubbable(input, input, (v) => commit(String(parseFloat(v))), 1, cap === 'Padding' ? 0 : undefined)
      box.appendChild(input)
    }
    return box
  }

  // Drag horizontally on `handle` to scrub the numeric value in `input`.
  _scrubbable(handle, input, commit, step, min, max) {
    let startX = 0
    let startVal = 0
    let scrubbing = false
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      const n = parseFloat(input.dataset.applied ?? input.value)
      if (isNaN(n)) return
      startX = e.clientX
      startVal = n
      scrubbing = false
      handle.setPointerCapture(e.pointerId)
      const move = (ev) => {
        const dx = ev.clientX - startX
        if (!scrubbing && Math.abs(dx) < 3) return
        scrubbing = true
        let v = startVal + Math.round(dx / 2) * step * (ev.shiftKey ? 10 : 1)
        v = Math.round(v * 100) / 100
        if (min !== undefined) v = Math.max(min, v)
        if (max !== undefined) v = Math.min(max, v)
        commit(replaceNumber(input.dataset.applied ?? input.value, v))
      }
      const up = () => {
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', up)
        if (scrubbing && input.blur) input.blur()
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
    })
  }

  _apply(el, prop, value) {
    this.hooks.onEditIntent?.()
    const meta = PROP_META[prop]
    const before = this.store.originalOf(el, prop) ?? currentValue(el, prop)
    el.style.setProperty(meta.css, value)
    const after = currentValue(el, prop)
    this.hooks.onEdit(el, prop, before, after)
  }

  // ---------------------------------------------------------------- tray

  _tray() {
    const tray = document.createElement('div')
    tray.className = 'rl-tray' + (this.trayOpen ? ' rl-open' : '')
    const count = this.store.count
    const head = document.createElement('button')
    head.className = 'rl-tray-head'
    head.setAttribute('aria-expanded', String(this.trayOpen))
    head.innerHTML = `
      <span class="rl-tray-count ${count === 0 ? 'rl-zero' : ''}">${count}</span>
      <span class="rl-tray-title">${count === 1 ? 'Change' : 'Changes'}</span>
      <span class="rl-tray-spacer"></span>
      <span class="rl-tray-chev">${ICONS.chevron}</span>`
    head.addEventListener('click', () => {
      this.trayOpen = !this.trayOpen
      tray.classList.toggle('rl-open', this.trayOpen)
      head.setAttribute('aria-expanded', String(this.trayOpen))
    })
    tray.appendChild(head)

    const list = document.createElement('div')
    list.className = 'rl-tray-list'
    for (const [el, group] of this.store.groups) {
      const g = document.createElement('div')
      g.className = 'rl-diff-group'
      const elBtn = document.createElement('button')
      elBtn.className = 'rl-diff-el'
      elBtn.textContent = group.label
      elBtn.title = 'Jump to element'
      elBtn.addEventListener('click', () => this.hooks.onSelect(el))
      g.appendChild(elBtn)
      for (const [prop, edit] of group.edits) {
        const row = document.createElement('div')
        row.className = 'rl-diff-row'
        row.innerHTML = `
          <span class="rl-prop">${PROP_META[prop].css}</span>
          <span class="rl-before">${escapeHtml(edit.before)}</span>
          <span class="rl-arrow">→</span>
          <span class="rl-after">${escapeHtml(edit.after)}</span>`
        const x = document.createElement('button')
        x.className = 'rl-diff-x'
        x.title = 'Revert'
        x.setAttribute('aria-label', `Revert ${PROP_META[prop].css}`)
        x.innerHTML = ICONS.x
        x.addEventListener('click', () => {
          this.hooks.onEditIntent?.()
          this.store.revert(el, prop)
          if (this.target === el) this.render(el)
        })
        row.appendChild(x)
        g.appendChild(row)
      }
      list.appendChild(g)
    }
    tray.appendChild(list)

    const actions = document.createElement('div')
    actions.className = 'rl-actions'
    const viewing = this.hooks.isViewingBefore?.() ?? false
    const eye = document.createElement('button')
    eye.className = 'rl-btn rl-btn-ghost rl-btn-eye' + (viewing ? ' rl-on' : '')
    eye.title = viewing ? 'Show your edits' : 'Show the original page'
    eye.setAttribute('aria-pressed', String(viewing))
    eye.setAttribute('aria-label', 'Toggle original page')
    eye.innerHTML = ICONS.eye
    eye.disabled = count === 0
    eye.addEventListener('click', () => this.hooks.onToggleView?.())
    const reset = document.createElement('button')
    reset.className = 'rl-btn rl-btn-ghost'
    reset.textContent = 'Reset'
    reset.addEventListener('click', () => {
      this.hooks.onEditIntent?.()
      this.store.revertAll()
      if (this.target) this.render(this.target)
    })
    const copy = document.createElement('button')
    copy.className = 'rl-btn rl-btn-primary'
    copy.innerHTML = `${ICONS.copy}<span>Copy for agent</span>`
    copy.disabled = count === 0
    copy.addEventListener('click', async () => {
      const ok = await copyText(this.store.toMarkdown())
      if (!ok) {
        this.hooks.onToast?.('Clipboard blocked by the browser')
        return
      }
      copy.classList.add('rl-copied')
      copy.innerHTML = `${ICONS.check}<span>Copied</span>`
      this.hooks.onToast?.(`${count} ${count === 1 ? 'change' : 'changes'} copied as annotation`)
      setTimeout(() => {
        copy.classList.remove('rl-copied')
        copy.innerHTML = `${ICONS.copy}<span>Copy for agent</span>`
      }, 1600)
    })
    actions.append(eye, reset, copy)
    tray.appendChild(actions)
    return tray
  }

  // ---------------------------------------------------------------- drag

  _draggable(handle) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return
      const startX = e.clientX - this._drag.x
      const startY = e.clientY - this._drag.y
      handle.setPointerCapture(e.pointerId)
      const move = (ev) => {
        this._drag.x = ev.clientX - startX
        this._drag.y = ev.clientY - startY
        this.el.style.transform = `translate(${this._drag.x}px, ${this._drag.y}px)`
      }
      const up = () => {
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', up)
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
    })
  }
}

function currentValue(el, prop) {
  const meta = PROP_META[prop]
  const cs = getComputedStyle(el)
  const raw = cs.getPropertyValue(meta.css)
  return meta.color ? toHex(raw) : raw
}

function nudge(value, delta, min, max) {
  const n = parseFloat(value)
  if (isNaN(n)) return value
  let v = Math.round((n + delta) * 100) / 100
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return replaceNumber(value, v)
}

function replaceNumber(value, n) {
  const m = String(value).match(/-?\d*\.?\d+/)
  if (!m) return String(n)
  return String(value).replace(/-?\d*\.?\d+/, String(n))
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fall back to the legacy path (still works without the permission)
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { ok = false }
    ta.remove()
    return ok
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function paintSwatch(node, value) {
  node.style.background =
    !value || value === 'transparent'
      ? 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 8px 8px'
      : value
}
