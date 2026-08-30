// Custom color picker popover: SV field, hue + alpha sliders, hex input,
// and an EyeDropper for sampling colors straight off the page.

const EYEDROPPER_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.4 3.2l3.4 3.4M11.1 1.5a1.7 1.7 0 0 1 2.4 0l1 1a1.7 1.7 0 0 1 0 2.4l-2 2-3.4-3.4 2-2zM8.7 5.9L2.9 11.7c-.3.3-.5.7-.5 1.1l-.2 1.6a.5.5 0 0 0 .5.5l1.6-.2c.4 0 .8-.2 1.1-.5l5.8-5.8"/></svg>'

export function openColorPicker({ panel, anchor, value, onChange, onClose }) {
  const state = parseColor(value)

  const pop = document.createElement('div')
  pop.className = 'rl-colorpop'
  const anchorRect = anchor.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  pop.style.top = `${Math.max(10, Math.min(anchorRect.bottom - panelRect.top + 6, panelRect.height - 262))}px`
  pop.innerHTML = `
    <div class="rl-sv"><span class="rl-sv-thumb"></span></div>
    <div class="rl-slider rl-hue"><span class="rl-slider-thumb"></span></div>
    <div class="rl-slider rl-alpha"><span class="rl-alpha-track"></span><span class="rl-slider-thumb"></span></div>
    <div class="rl-color-row">
      ${'EyeDropper' in window ? `<button class="rl-eyedrop" title="Pick from page" aria-label="Pick color from page">${EYEDROPPER_ICON}</button>` : ''}
      <input class="rl-hexin" spellcheck="false" aria-label="Hex color" />
      <span class="rl-color-chip"><span></span></span>
    </div>`
  panel.appendChild(pop)

  const sv = pop.querySelector('.rl-sv')
  const svThumb = pop.querySelector('.rl-sv-thumb')
  const hue = pop.querySelector('.rl-hue')
  const hueThumb = hue.querySelector('.rl-slider-thumb')
  const alpha = pop.querySelector('.rl-alpha')
  const alphaTrack = pop.querySelector('.rl-alpha-track')
  const alphaThumb = alpha.querySelector('.rl-slider-thumb')
  const hexIn = pop.querySelector('.rl-hexin')
  const chip = pop.querySelector('.rl-color-chip span')

  const emit = () => {
    sync()
    onChange(toHexString(state))
  }

  const sync = () => {
    const pure = `hsl(${state.h} 100% 50%)`
    sv.style.background = `linear-gradient(transparent, #000), linear-gradient(90deg, #fff, ${pure})`
    svThumb.style.left = `${state.s * 100}%`
    svThumb.style.top = `${(1 - state.v) * 100}%`
    const { r, g, b } = hsvToRgb(state.h, state.s, state.v)
    svThumb.style.background = `rgb(${r} ${g} ${b})`
    hueThumb.style.left = `${(state.h / 360) * 100}%`
    hueThumb.style.background = pure
    alphaTrack.style.background = `linear-gradient(90deg, transparent, rgb(${r} ${g} ${b}))`
    alphaThumb.style.left = `${state.a * 100}%`
    const hex = toHexString(state)
    chip.style.background = hex === 'transparent' ? 'none' : hex
    if (document.activeElement !== hexIn) hexIn.value = hex.toUpperCase()
  }

  drag(sv, (x, y, rect) => {
    state.s = clamp01(x / rect.width)
    state.v = clamp01(1 - y / rect.height)
    emit()
  })
  drag(hue, (x, _y, rect) => {
    state.h = Math.round(clamp01(x / rect.width) * 360)
    emit()
  })
  drag(alpha, (x, _y, rect) => {
    state.a = Math.round(clamp01(x / rect.width) * 100) / 100
    emit()
  })

  hexIn.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') hexIn.blur()
    if (e.key === 'Escape') close()
  })
  hexIn.addEventListener('blur', () => {
    const parsed = parseColor(hexIn.value.trim())
    Object.assign(state, parsed)
    emit()
  })

  pop.querySelector('.rl-eyedrop')?.addEventListener('click', async () => {
    try {
      const result = await new window.EyeDropper().open()
      Object.assign(state, parseColor(result.sRGBHex))
      emit()
    } catch { /* user cancelled */ }
  })

  const dismiss = (e) => {
    if (!pop.contains(e.target) && !anchor.contains(e.target)) close()
  }
  const rootNode = panel.getRootNode()
  setTimeout(() => rootNode.addEventListener('click', dismiss, true), 0)

  const close = () => {
    rootNode.removeEventListener('click', dismiss, true)
    pop.remove()
    onClose?.()
  }

  sync()
  return close
}

function drag(zone, apply) {
  zone.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.tagName === 'INPUT') return
    zone.setPointerCapture(e.pointerId)
    const rect = zone.getBoundingClientRect()
    const move = (ev) => apply(ev.clientX - rect.left, ev.clientY - rect.top, rect)
    move(e)
    const up = () => {
      zone.removeEventListener('pointermove', move)
      zone.removeEventListener('pointerup', up)
    }
    zone.addEventListener('pointermove', move)
    zone.addEventListener('pointerup', up)
  })
}

// ------------------------------------------------------------- color math

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

function parseColor(input) {
  const fallback = { h: 0, s: 0, v: 1, a: 1 }
  if (!input || input === 'transparent') return { h: 0, s: 0, v: 1, a: 0 }
  let hex = String(input).trim().replace(/^#/, '')
  if (/^[0-9a-f]{3,4}$/i.test(hex)) hex = [...hex].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) return fallback
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
  return { ...rgbToHsv(r, g, b), a: Math.round(a * 100) / 100 }
}

function toHexString({ h, s, v, a }) {
  if (a === 0) return 'transparent'
  const { r, g, b } = hsvToRgb(h, s, v)
  const x = (n) => n.toString(16).padStart(2, '0')
  let hex = `#${x(r)}${x(g)}${x(b)}`
  if (a < 1) hex += x(Math.round(a * 255))
  return hex.toUpperCase()
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}
