// Reading + formatting computed styles.

export function readStyles(el) {
  const cs = getComputedStyle(el)
  return {
    fontFamily: primaryFont(cs.fontFamily),
    fontFamilyFull: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight === 'normal' ? 'normal' : cs.lineHeight,
    letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
    textAlign: cs.textAlign,
    color: toHex(cs.color),
    backgroundColor: toHex(cs.backgroundColor),
    borderRadius: cs.borderRadius,
    borderWidth: cs.borderTopWidth,
    borderColor: toHex(cs.borderTopColor),
    boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow,
    opacity: cs.opacity,
    display: cs.display,
    width: px(el.getBoundingClientRect().width),
    height: px(el.getBoundingClientRect().height),
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
    marginTop: cs.marginTop,
    marginRight: cs.marginRight,
    marginBottom: cs.marginBottom,
    marginLeft: cs.marginLeft,
    gap: cs.gap === 'normal' ? '0px' : cs.gap,
  }
}

export function hasOwnText(el) {
  return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
}

function primaryFont(stack) {
  const first = stack.split(',')[0].trim().replace(/^["']|["']$/g, '')
  return first
}

function px(n) {
  return `${Math.round(n * 10) / 10}px`
}

// any css color -> #hex (keeps alpha as 8-digit hex when < 1)
let probeCtx = null
export function toHex(color) {
  if (!color || color === 'transparent') return 'transparent'
  let m = String(color).match(/rgba?\(([^)]+)\)/)
  if (!m) {
    // normalize exotic spaces (oklch, oklab, color()) by rasterizing one pixel
    try {
      if (!probeCtx) {
        const c = document.createElement('canvas')
        c.width = c.height = 1
        probeCtx = c.getContext('2d', { willReadFrequently: true })
      }
      probeCtx.clearRect(0, 0, 1, 1)
      probeCtx.fillStyle = color
      probeCtx.fillRect(0, 0, 1, 1)
      const [r, g, b, a255] = probeCtx.getImageData(0, 0, 1, 1).data
      if (a255 === 0) return 'transparent'
      const h = (v) => v.toString(16).padStart(2, '0')
      let hex = `#${h(r)}${h(g)}${h(b)}`
      if (a255 < 255) hex += h(a255)
      return hex.toUpperCase()
    } catch {
      return color
    }
  }
  const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number)
  const [r, g, b] = parts
  const a = parts.length > 3 ? parts[3] : 1
  if (a === 0) return 'transparent'
  const h = (v) => Math.round(v).toString(16).padStart(2, '0')
  let hex = `#${h(r)}${h(g)}${h(b)}`
  if (a < 1) hex += h(a * 255)
  return hex.toUpperCase()
}

// Editable css property -> panel metadata
export const PROP_META = {
  text: { css: 'text', label: 'Content' },
  fontFamily: { css: 'font-family', label: 'Font' },
  fontSize: { css: 'font-size', label: 'Size', scrub: 1, min: 1 },
  fontWeight: { css: 'font-weight', label: 'Weight' },
  lineHeight: { css: 'line-height', label: 'Line height', scrub: 0.5, min: 0 },
  letterSpacing: { css: 'letter-spacing', label: 'Tracking', scrub: 0.1 },
  textAlign: { css: 'text-align', label: 'Align' },
  color: { css: 'color', label: 'Text color', color: true },
  backgroundColor: { css: 'background-color', label: 'Background', color: true },
  borderRadius: { css: 'border-radius', label: 'Radius', scrub: 1, min: 0 },
  borderWidth: { css: 'border-width', label: 'Border', scrub: 1, min: 0 },
  borderColor: { css: 'border-color', label: 'Border color', color: true },
  boxShadow: { css: 'box-shadow', label: 'Shadow' },
  opacity: { css: 'opacity', label: 'Opacity', scrub: 0.05, min: 0, max: 1 },
  width: { css: 'width', label: 'Width', scrub: 1, min: 0 },
  height: { css: 'height', label: 'Height', scrub: 1, min: 0 },
  paddingTop: { css: 'padding-top', label: 'Padding top', scrub: 1, min: 0 },
  paddingRight: { css: 'padding-right', label: 'Padding right', scrub: 1, min: 0 },
  paddingBottom: { css: 'padding-bottom', label: 'Padding bottom', scrub: 1, min: 0 },
  paddingLeft: { css: 'padding-left', label: 'Padding left', scrub: 1, min: 0 },
  marginTop: { css: 'margin-top', label: 'Margin top', scrub: 1 },
  marginRight: { css: 'margin-right', label: 'Margin right', scrub: 1 },
  marginBottom: { css: 'margin-bottom', label: 'Margin bottom', scrub: 1 },
  marginLeft: { css: 'margin-left', label: 'Margin left', scrub: 1 },
  gap: { css: 'gap', label: 'Gap', scrub: 1, min: 0 },
}
