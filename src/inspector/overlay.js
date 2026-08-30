// Morphing highlight boxes. Two variants share this class:
//   rl-hover — the roaming redline that follows the cursor
//   rl-pin   — the locked frame around the element being edited
import { shortLabel } from './dom.js'

export class Overlay {
  constructor(root, variant, { track = false } = {}) {
    this.el = document.createElement('div')
    this.el.className = `rl-overlay ${variant}`
    this.el.innerHTML = `
      <div class="rl-box"></div>
      <span class="rl-corner tl"></span><span class="rl-corner tr"></span>
      <span class="rl-corner bl"></span><span class="rl-corner br"></span>
      <div class="rl-tag">
        <span class="rl-tag-name"></span>
        <span class="rl-tag-dim"></span>
      </div>`
    root.appendChild(this.el)
    this.tagEl = this.el.querySelector('.rl-tag')
    this.tagName = this.el.querySelector('.rl-tag-name')
    this.tagDim = this.el.querySelector('.rl-tag-dim')
    this.target = null
    this.trackWhileShown = track
    this._label = null
    this._raf = null
  }

  show(el) {
    if (!el) return this.hide()
    this.target = el
    this.el.classList.add('rl-on')
    this._wakeNow()
    this._apply()
    if (this.trackWhileShown) this._startTracking()
  }

  // Fade out while the user is actively editing, so the frame never hides
  // the very styles being changed (borders, radius, shadows).
  quiet() {
    if (this._dimmed) return
    this._dimmed = true
    this._fade?.cancel()
    this._fade = this.el.animate([{ opacity: 0 }], {
      duration: this._motionOk() ? 350 : 1,
      easing: 'ease',
      fill: 'forwards',
    })
  }

  wake() {
    if (!this._dimmed) return
    this._dimmed = false
    this._fade?.cancel()
    this._fade = this.el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: this._motionOk() ? 600 : 1,
      easing: 'ease',
    })
  }

  _wakeNow() {
    this._dimmed = false
    this._fade?.cancel()
    this._fade = null
  }

  _motionOk() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  hide() {
    this.target = null
    this._label = null
    this.el.classList.remove('rl-on')
    this._wakeNow()
    this._stopTracking()
  }

  refresh() {
    if (this.target) this._apply()
  }

  _apply() {
    const el = this.target
    if (!el || !el.isConnected) return this.hide()
    const r = el.getBoundingClientRect()
    this.el.style.transform = `translate(${r.left}px, ${r.top}px)`
    this.el.style.width = `${r.width}px`
    this.el.style.height = `${r.height}px`
    this.el.classList.toggle('rl-flip', r.top < 44)
    const label = shortLabel(el)
    if (label !== this._label) {
      this._label = label
      this.tagName.textContent = label
      // pop the chip when the target identity changes
      this.tagEl.classList.remove('rl-tag-pop')
      void this.tagEl.offsetWidth
      this.tagEl.classList.add('rl-tag-pop')
    }
    this.tagDim.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`
  }

  // Follow scroll/resize/live edits while shown.
  _startTracking() {
    if (this._raf) return
    const loop = () => {
      this._apply()
      this._raf = requestAnimationFrame(loop)
    }
    this._raf = requestAnimationFrame(loop)
  }

  _stopTracking() {
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  }

  destroy() {
    this._stopTracking()
    this.el.remove()
  }
}
