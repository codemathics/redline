// Redline: inspect, live-edit, and annotate any element on the page.

import css from './ui.css?inline'
import { Overlay } from './overlay.js'
import { Panel } from './panel.js'
import { ChangeStore } from './changes.js'
import { isInspectable, setEditableText } from './dom.js'
import { PROP_META } from './styles.js'

const FONT_ID = 'redline-inter'
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'

let instance = null

export function toggle() {
  if (instance) unmount()
  else mount()
  return !!instance
}

export function mount() {
  if (instance) return instance
  instance = new Redline()
  return instance
}

export function unmount() {
  instance?.destroy()
  instance = null
}

export function annotation() {
  return instance ? instance.store.toMarkdown() : null
}

class Redline {
  constructor() {
    this.host = document.createElement('redline-root')
    this.host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;'
    const root = this.host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = css
    root.appendChild(style)
    document.documentElement.appendChild(this.host)
    this._injectFont()

    let savedTheme = null
    try { savedTheme = localStorage.getItem('redline-theme') } catch { /* sandboxed */ }
    this.dark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    this.host.classList.toggle('rl-dark', this.dark)

    this.selected = null
    this.hovered = null
    this.undoStack = []
    this.viewingBefore = false

    this.store = new ChangeStore(() => this.panel?.refreshTray())
    this.hoverOverlay = new Overlay(root, 'rl-hover')
    this.pinOverlay = new Overlay(root, 'rl-pin', { track: true })
    this.panel = new Panel(root, {
      store: this.store,
      onClose: () => unmount(),
      onSelect: (el) => this.select(el),
      onPreview: (el) => this._previewFromPanel(el),
      onEdit: (el, prop, before, after) => this._onEdit(el, prop, before, after),
      onEditIntent: () => this._exitBeforeView(),
      onToggleView: () => this._toggleView(),
      isViewingBefore: () => this.viewingBefore,
      onToggleTheme: () => this._toggleTheme(),
      isDark: () => this.dark,
      onToast: (msg) => this.toast(msg),
    })
    this.root = root

    this._onMove = this._onMove.bind(this)
    this._onClick = this._onClick.bind(this)
    this._onKey = this._onKey.bind(this)
    this._onScroll = this._onScroll.bind(this)
    window.addEventListener('pointermove', this._onMove, true)
    window.addEventListener('click', this._onClick, true)
    window.addEventListener('keydown', this._onKey, true)
    window.addEventListener('scroll', this._onScroll, true)
    window.addEventListener('resize', this._onScroll, true)
  }

  destroy() {
    clearTimeout(this._pinTimer)
    window.removeEventListener('pointermove', this._onMove, true)
    window.removeEventListener('click', this._onClick, true)
    window.removeEventListener('keydown', this._onKey, true)
    window.removeEventListener('scroll', this._onScroll, true)
    window.removeEventListener('resize', this._onScroll, true)
    this.hoverOverlay.destroy()
    this.pinOverlay.destroy()
    this.panel.destroy()
    this.host.remove()
  }

  // ------------------------------------------------------------ selection

  select(el) {
    if (!el || !isInspectable(el)) return
    this.selected = el
    clearTimeout(this._pinTimer)
    this.pinOverlay.show(el)
    this.hoverOverlay.hide()
    this.panel.render(el)
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  deselect() {
    this.selected = null
    this.pinOverlay.hide()
    this.panel.render(null)
  }

  _previewFromPanel(el) {
    if (el && isInspectable(el)) this.hoverOverlay.show(el)
    else this.hoverOverlay.hide()
  }

  // ------------------------------------------------------------ events

  _onMove(e) {
    // The redline keeps roaming even while something is pinned for editing.
    if (e.composedPath().includes(this.host)) {
      this.hovered = null
      this.hoverOverlay.hide()
      return
    }
    const el = e.target
    if (el === this.hovered) return
    if (!isInspectable(el)) return
    this.hovered = el
    if (el === this.selected) this.hoverOverlay.hide()
    else this.hoverOverlay.show(el)
  }

  _onClick(e) {
    if (e.composedPath().includes(this.host)) return
    const el = e.target
    if (!isInspectable(el)) return
    e.preventDefault()
    e.stopPropagation()
    if (this.selected === el) return
    this.select(el)
  }

  _onKey(e) {
    // Never swallow keys typed inside our own panel (fields handle their own).
    if (e.composedPath().includes(this.host)) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (this.selected) this.deselect()
      else unmount()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      e.stopPropagation()
      this._undo()
      return
    }
    if (!this.selected) return
    const moves = {
      ArrowUp: (el) => el.parentElement,
      ArrowDown: (el) => el.firstElementChild,
      ArrowLeft: (el) => el.previousElementSibling,
      ArrowRight: (el) => el.nextElementSibling,
      // legacy key names
      Up: (el) => el.parentElement,
      Down: (el) => el.firstElementChild,
      Left: (el) => el.previousElementSibling,
      Right: (el) => el.nextElementSibling,
    }
    if (moves[e.key]) {
      e.preventDefault()
      e.stopPropagation()
      const next = moves[e.key](this.selected)
      if (next && isInspectable(next)) this.select(next)
    }
  }

  _onScroll() {
    this.hoverOverlay.refresh()
    this.pinOverlay.refresh()
  }

  // ------------------------------------------------------------ edits

  _onEdit(el, prop, before, after) {
    // Coalesce rapid same-property edits (scrubbing) into one undo step.
    const now = performance.now()
    const top = this.undoStack[this.undoStack.length - 1]
    if (top && top.el === el && top.prop === prop && now - top.t < 500) {
      top.t = now
    } else {
      const prevApplied = this.store.groups.get(el)?.edits.get(prop)?.after ?? before
      this.undoStack.push({ el, prop, value: prevApplied, t: now })
    }
    this.store.record(el, prop, before, after)
    this.pinOverlay.refresh()
    this._restPin()
  }

  // Get the frame out of the way while edits are flowing; bring it back
  // softly once the user has paused.
  _restPin() {
    this.pinOverlay.quiet()
    clearTimeout(this._pinTimer)
    this._pinTimer = setTimeout(() => this.pinOverlay.wake(), 2000)
  }

  _toggleTheme() {
    this.dark = !this.dark
    this.host.classList.toggle('rl-dark', this.dark)
    try { localStorage.setItem('redline-theme', this.dark ? 'dark' : 'light') } catch { /* sandboxed */ }
    return this.dark
  }

  // ---------------------------------------------------------- before/after

  _toggleView() {
    if (this.viewingBefore) {
      this.viewingBefore = false
      this.store.showEdited()
      this.toast('Showing your edits')
    } else {
      if (this.store.count === 0) return
      this.viewingBefore = true
      this.store.showOriginal()
      this.toast('Showing the original page')
    }
    this.panel.refreshTray()
    this.pinOverlay.refresh()
  }

  _exitBeforeView() {
    if (!this.viewingBefore) return
    this.viewingBefore = false
    this.store.showEdited()
    this.panel.refreshTray()
  }

  _undo() {
    const entry = this.undoStack.pop()
    if (!entry) return
    this._exitBeforeView()
    const { el, prop, value } = entry
    if (prop === 'text') setEditableText(el, value)
    else el.style.setProperty(PROP_META[prop].css, value)
    this.store.record(el, prop, value, value)
    if (this.selected === el) this.panel.render(el)
    this.pinOverlay.refresh()
    this._restPin()
    this.toast('Undone')
  }

  // ------------------------------------------------------------ toast

  toast(msg) {
    clearTimeout(this._toastTimer)
    let t = this._toastEl
    if (!t || !t.isConnected) {
      // fresh toast: animate in (wrapper owns centering so the spring only
      // touches translateY/scale, never the -50% centering)
      this._toastWrap?.remove()
      const wrap = document.createElement('div')
      wrap.className = 'rl-toast-wrap'
      t = document.createElement('div')
      t.className = 'rl-toast'
      t.innerHTML = `<span></span>`
      wrap.appendChild(t)
      this.root.appendChild(wrap)
      this._toastWrap = wrap
      this._toastEl = t
    } else {
      // toast already visible: swap the text in place with a small pulse
      t.classList.remove('rl-toast-swap')
      void t.offsetWidth
      t.classList.add('rl-toast-swap')
    }
    t.querySelector('span').textContent = msg
    this._toastTimer = setTimeout(() => {
      t.classList.add('rl-leaving')
      setTimeout(() => {
        this._toastWrap?.remove()
        this._toastWrap = null
        this._toastEl = null
      }, 220)
    }, 2200)
  }

  _injectFont() {
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    document.head.appendChild(link)
  }
}
