// Walk a pinned DOM subtree and emit an SVG Figma can paste as editable layers.
// Clipboard writes image/svg+xml + text/plain only. Never PNG, never figmeta/kiwi -
// a broken text/html figmeta makes Figma ignore the SVG.

const SKIP_TAGS = new Set(['SCRIPT', 'LINK', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'TITLE'])

export async function snapshotElementForFigma(el) {
  return buildSvg(el)
}

export async function elementToSvg(el) {
  const shot = await buildSvg(el)
  return shot?.svg ?? null
}

export async function copyElementForFigma(el) {
  if (!el || !el.isConnected) return false
  const shotPromise = buildSvg(el)
  const written = await writeFigmaClipboard(el, shotPromise)
  if (written) return true
  try {
    await shotPromise
    return 'blocked'
  } catch {
    return false
  }
}

async function buildSvg(el) {
  if (!el || !el.isConnected) return null
  const root = el.getBoundingClientRect()
  const width = Math.max(1, Math.round(root.width))
  const height = Math.max(1, Math.round(root.height))
  const ctx = { defs: [], id: 0, origin: root }
  const body = await walkNode(el, ctx)
  if (!body) return null

  const defs = ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : ''
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">` +
    `${defs}${body}</svg>`
  return { svg, width, height }
}

async function walkNode(node, ctx) {
  if (node.nodeType === Node.TEXT_NODE) return paintTextNode(node, ctx)
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  if (SKIP_TAGS.has(node.tagName)) return ''
  if (node.tagName === 'REDLINE-ROOT') return ''
  if (node.closest?.('redline-root')) return ''

  const cs = getComputedStyle(node)
  if (cs.display === 'none' || cs.visibility === 'hidden') return ''

  const rect = node.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return ''

  const x = num(rect.left - ctx.origin.left)
  const y = num(rect.top - ctx.origin.top)
  const w = num(rect.width)
  const h = num(rect.height)
  const opacity = parseFloat(cs.opacity)
  const parts = []

  if (node.tagName === 'IMG') {
    parts.push(await paintImage(node, 0, 0, w, h, cs, ctx))
  } else if (node.tagName === 'SVG' || node instanceof SVGSVGElement) {
    parts.push(embedSvg(node, w, h))
  } else if (node.tagName === 'CANVAS') {
    parts.push(paintCanvas(node, w, h))
  } else {
    parts.push(...paintBox(cs, w, h, ctx))
  }

  if (node.tagName !== 'SVG') {
    const childCtx = { ...ctx, origin: rect }
    for (const child of node.childNodes) {
      const next = await walkNode(child, childCtx)
      if (next) parts.push(next)
    }
  }

  const inner = parts.filter(Boolean).join('')
  if (!inner) return ''

  const clip = overflowClip(cs, w, h, ctx)
  const extra = []
  if (clip) extra.push(`clip-path="url(#${clip})"`)
  if (opacity < 1) extra.push(`opacity="${num(opacity)}"`)

  return `<g transform="translate(${x} ${y})"${attr(extra)}>${inner}</g>`
}

function paintBox(cs, w, h, ctx) {
  const out = []
  const fill = cssColor(cs.backgroundColor)
  const radii = cornerRadii(cs, w, h)
  const stroke = borderStroke(cs)
  const shadows = parseShadows(cs.boxShadow)

  for (const sh of shadows) {
    if (sh.inset) continue
    out.push(shadowShape(w, h, radii, sh, ctx))
  }

  const bgImg = firstBackgroundLayer(cs.backgroundImage)
  if (fill || stroke || bgImg) {
    const inset = stroke ? stroke.width / 2 : 0
    const bx = inset
    const by = inset
    const bw = Math.max(0.5, w - inset * 2)
    const bh = Math.max(0.5, h - inset * 2)
    const r = scaleRadii(radii, inset)
    const shape = []
    if (fill) shape.push(`fill="${fill.hex}"${fill.a < 1 ? ` fill-opacity="${num(fill.a)}"` : ''}`)
    else shape.push('fill="none"')
    if (stroke) {
      shape.push(`stroke="${stroke.color.hex}"`)
      if (stroke.color.a < 1) shape.push(`stroke-opacity="${num(stroke.color.a)}"`)
      shape.push(`stroke-width="${num(stroke.width)}"`)
    }
    if (bgImg?.type === 'url') {
      out.push(rectOrPath(bx, by, bw, bh, r, shape))
      out.push(`<image href="${escAttr(bgImg.href)}" x="${num(bx)}" y="${num(by)}" width="${num(bw)}" height="${num(bh)}" preserveAspectRatio="xMidYMid slice"/>`)
    } else if (bgImg?.type === 'linear') {
      const id = uid(ctx)
      ctx.defs.push(linearGradientDef(id, bgImg))
      shape[0] = `fill="url(#${id})"`
      out.push(rectOrPath(bx, by, bw, bh, r, shape))
    } else {
      out.push(rectOrPath(bx, by, bw, bh, r, shape))
    }
  }

  for (const sh of shadows) {
    if (!sh.inset) continue
    out.push(insetStroke(w, h, radii, sh))
  }

  return out.filter(Boolean)
}

function shadowShape(w, h, radii, sh, ctx) {
  const x = sh.x - sh.spread
  const y = sh.y - sh.spread
  const bw = Math.max(0.5, w + sh.spread * 2)
  const bh = Math.max(0.5, h + sh.spread * 2)
  const attrs = [`fill="${sh.color.hex}"`]
  if (sh.color.a < 1) attrs.push(`fill-opacity="${num(sh.color.a)}"`)
  if (sh.blur > 0) {
    const id = uid(ctx)
    ctx.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${num(sh.blur / 2)}"/></filter>`)
    attrs.push(`filter="url(#${id})"`)
  }
  return rectOrPath(x, y, bw, bh, radii, attrs)
}

function insetStroke(w, h, radii, sh) {
  // inset 0 0 0 Npx color is a 1-bit inner ring (common ghost-button trick)
  if (sh.x !== 0 || sh.y !== 0 || sh.blur > 0.5) return ''
  const width = Math.max(1, sh.spread || 1)
  const inset = width / 2
  return rectOrPath(
    inset,
    inset,
    Math.max(0.5, w - width),
    Math.max(0.5, h - width),
    scaleRadii(radii, inset),
    [`fill="none"`, `stroke="${sh.color.hex}"`, `stroke-width="${num(width)}"`, sh.color.a < 1 ? `stroke-opacity="${num(sh.color.a)}"` : ''],
  )
}

function rectOrPath(x, y, w, h, r, attrs) {
  const a = attrs.filter(Boolean).join(' ')
  if (!r || (r.tl === r.tr && r.tr === r.br && r.br === r.bl)) {
    const rx = r ? num(r.tl) : 0
    return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${rx ? ` rx="${rx}"` : ''} ${a}/>`
  }
  return `<path d="${roundedPath(x, y, w, h, r)}" ${a}/>`
}

function roundedPath(x, y, w, h, r) {
  const tl = Math.min(r.tl, w / 2, h / 2)
  const tr = Math.min(r.tr, w / 2, h / 2)
  const br = Math.min(r.br, w / 2, h / 2)
  const bl = Math.min(r.bl, w / 2, h / 2)
  return (
    `M${num(x + tl)} ${num(y)}` +
    `H${num(x + w - tr)}` +
    `A${num(tr)} ${num(tr)} 0 0 1 ${num(x + w)} ${num(y + tr)}` +
    `V${num(y + h - br)}` +
    `A${num(br)} ${num(br)} 0 0 1 ${num(x + w - br)} ${num(y + h)}` +
    `H${num(x + bl)}` +
    `A${num(bl)} ${num(bl)} 0 0 1 ${num(x)} ${num(y + h - bl)}` +
    `V${num(y + tl)}` +
    `A${num(tl)} ${num(tl)} 0 0 1 ${num(x + tl)} ${num(y)}` +
    `Z`
  )
}

function paintTextNode(node, ctx) {
  const raw = node.textContent
  if (!raw || !raw.trim()) return ''
  const parent = node.parentElement
  if (!parent) return ''
  const cs = getComputedStyle(parent)
  if (cs.display === 'none' || cs.visibility === 'hidden') return ''
  const color = cssColor(cs.color)
  if (!color) return ''

  const fontSize = parseFloat(cs.fontSize) || 16
  const weight = cs.fontWeight || '400'
  const family = quoteFamily(cs.fontFamily)
  const spacing = cs.letterSpacing && cs.letterSpacing !== 'normal' ? parseFloat(cs.letterSpacing) : 0
  const italic = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique'
  const transform = cs.textTransform
  const lines = measureLines(node)
  const out = []

  for (const line of lines) {
    const text = applyTransform(line.text, transform)
    if (!text.trim()) continue
    const x = num(line.x - ctx.origin.left)
    const baseline = num(line.y - ctx.origin.top + fontSize * 0.86)
    const attrs = [
      `x="${x}"`,
      `y="${baseline}"`,
      `fill="${color.hex}"`,
      color.a < 1 ? `fill-opacity="${num(color.a)}"` : '',
      `font-size="${num(fontSize)}"`,
      `font-family="${escAttr(family)}"`,
      `font-weight="${escAttr(weight)}"`,
      italic ? `font-style="italic"` : '',
      spacing ? `letter-spacing="${num(spacing)}"` : '',
      `xml:space="preserve"`,
    ]
    out.push(`<text ${attrs.filter(Boolean).join(' ')}>${escText(text)}</text>`)
  }
  return out.join('')
}

function measureLines(node) {
  const raw = node.textContent
  const range = document.createRange()
  const lines = []
  let i = 0
  while (i < raw.length) {
    range.setStart(node, i)
    let end = i + 1
    range.setEnd(node, end)
    let box = range.getBoundingClientRect()
    while (end < raw.length) {
      range.setEnd(node, end + 1)
      const next = range.getBoundingClientRect()
      if (next.bottom > box.bottom + 1.5 && next.height > box.height + 1.5) break
      box = next
      end++
    }
    const text = raw.slice(i, end)
    if (text.trim()) {
      range.setStart(node, i)
      range.setEnd(node, end)
      const tight = range.getBoundingClientRect()
      lines.push({ text, x: tight.left, y: tight.top, w: tight.width, h: tight.height })
    }
    i = end
  }
  range.detach?.()
  return lines
}

async function paintImage(el, x, y, w, h, cs, ctx) {
  const href = el.currentSrc || el.src
  if (!href) return ''
  const data = href.startsWith('data:') ? href : await asDataUrl(href)
  const src = data || href
  const fit = cs.objectFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
  return `<image href="${escAttr(src)}" x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="${fit}"/>`
}

function paintCanvas(el, w, h) {
  try {
    const src = el.toDataURL()
    return `<image href="${escAttr(src)}" x="0" y="0" width="${num(w)}" height="${num(h)}" preserveAspectRatio="none"/>`
  } catch {
    return ''
  }
}

function embedSvg(el, w, h) {
  try {
    const clone = el.cloneNode(true)
    clone.removeAttribute('style')
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))
    clone.setAttribute('x', '0')
    clone.setAttribute('y', '0')
    return new XMLSerializer().serializeToString(clone)
  } catch {
    return ''
  }
}

function overflowClip(cs, w, h, ctx) {
  const ox = cs.overflowX
  const oy = cs.overflowY
  if ((ox === 'visible' || !ox) && (oy === 'visible' || !oy)) return ''
  if (ox === 'visible' && oy === 'visible') return ''
  const id = uid(ctx)
  const r = cornerRadii(cs, w, h)
  ctx.defs.push(`<clipPath id="${id}">${rectOrPath(0, 0, w, h, r, [])}</clipPath>`)
  return id
}

function cornerRadii(cs, w, h) {
  const cap = Math.min(w, h) / 2
  const read = (side) => Math.min(cap, Math.max(0, parseFloat(cs[side]) || 0))
  return {
    tl: read('borderTopLeftRadius'),
    tr: read('borderTopRightRadius'),
    br: read('borderBottomRightRadius'),
    bl: read('borderBottomLeftRadius'),
  }
}

function scaleRadii(r, inset) {
  if (!r) return r
  return {
    tl: Math.max(0, r.tl - inset),
    tr: Math.max(0, r.tr - inset),
    br: Math.max(0, r.br - inset),
    bl: Math.max(0, r.bl - inset),
  }
}

function borderStroke(cs) {
  const width = parseFloat(cs.borderTopWidth) || 0
  if (width <= 0 || cs.borderTopStyle === 'none') return null
  const color = cssColor(cs.borderTopColor)
  if (!color) return null
  return { width, color }
}

function parseShadows(value) {
  if (!value || value === 'none') return []
  const out = []
  for (const part of splitComma(value)) {
    const inset = /\binset\b/.test(part)
    const color = colorFromShadow(part)
    if (!color) continue
    const nums = [...part.matchAll(/-?[\d.]+px/g)].map((m) => parseFloat(m[0]))
    out.push({
      inset,
      x: nums[0] || 0,
      y: nums[1] || 0,
      blur: nums[2] || 0,
      spread: nums[3] || 0,
      color,
    })
  }
  return out
}

function colorFromShadow(part) {
  const rgb = part.match(/rgba?\([^)]+\)/i)
  if (rgb) return cssColor(rgb[0])
  const hex = part.match(/#[0-9a-f]{3,8}\b/i)
  if (hex) return cssColor(hex[0])
  const named = part.replace(/\binset\b/g, '').replace(/-?[\d.]+px/g, '').trim()
  return named ? cssColor(named) : null
}

function firstBackgroundLayer(value) {
  if (!value || value === 'none') return null
  const url = value.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/)
  if (url) return { type: 'url', href: url[2] }
  if (value.includes('gradient')) return parseLinearGradient(value)
  return null
}

function parseLinearGradient(value) {
  const m = value.match(/linear-gradient\((.+)\)/i)
  if (!m) return null
  const bits = splitComma(m[1])
  let angle = 180
  const stops = []
  for (const bit of bits) {
    const ang = bit.match(/^(-?[\d.]+)deg$/)
    if (ang && stops.length === 0) {
      angle = parseFloat(ang[1])
      continue
    }
    const col = cssColor(bit.trim().replace(/\s+[\d.]+%/, ''))
    if (col) stops.push(col)
  }
  if (stops.length < 2) return null
  return { type: 'linear', angle, stops }
}

function linearGradientDef(id, g) {
  const rad = ((g.angle - 90) * Math.PI) / 180
  const x2 = num(0.5 + 0.5 * Math.cos(rad))
  const y2 = num(0.5 + 0.5 * Math.sin(rad))
  const x1 = num(0.5 - 0.5 * Math.cos(rad))
  const y1 = num(0.5 - 0.5 * Math.sin(rad))
  const stops = g.stops.map((c, i) => {
    const off = g.stops.length === 1 ? 0 : i / (g.stops.length - 1)
    return `<stop offset="${num(off)}" stop-color="${c.hex}"${c.a < 1 ? ` stop-opacity="${num(c.a)}"` : ''}/>`
  }).join('')
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`
}

function cssColor(value) {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null
  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i)
  if (rgb) {
    const a = rgb[4] == null ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4])
    if (a <= 0) return null
    return { hex: toHex(+rgb[1], +rgb[2], +rgb[3]), a }
  }
  if (value[0] === '#') {
    const h = value.slice(1)
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16)
      const g = parseInt(h[1] + h[1], 16)
      const b = parseInt(h[2] + h[2], 16)
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1
      if (a <= 0) return null
      return { hex: toHex(r, g, b), a }
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
      if (a <= 0) return null
      return { hex: toHex(r, g, b), a }
    }
  }
  return sampleColor(value)
}

let colorCanvas = null
function sampleColor(value) {
  if (typeof document === 'undefined') return null
  if (!colorCanvas) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    colorCanvas = c.getContext('2d', { willReadFrequently: true })
  }
  const ctx = colorCanvas
  ctx.clearRect(0, 0, 1, 1)
  try { ctx.fillStyle = value } catch { return null }
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  if (a === 0) return null
  return { hex: toHex(r, g, b), a: a / 255 }
}

function toHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function quoteFamily(family) {
  return family
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .map((name) => (/\s/.test(name) ? `'${name}'` : name))
    .join(', ')
}

function applyTransform(text, transform) {
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  if (transform === 'capitalize') return text.replace(/\b\w/g, (c) => c.toUpperCase())
  return text
}

function splitComma(value) {
  const out = []
  let cur = ''
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function uid(ctx) {
  ctx.id += 1
  return `rl${ctx.id}`
}

function num(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function attr(list) {
  const s = list.filter(Boolean).join(' ')
  return s ? ` ${s}` : ''
}

function escText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
}

async function asDataUrl(href, base) {
  try {
    const abs = new URL(href, base || document.baseURI).href
    const res = await fetch(abs)
    if (!res.ok) return null
    return blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function isCompleteSvg(svg) {
  return typeof svg === 'string'
    && /<svg[\s>]/.test(svg)
    && svg.includes('</svg>')
}

async function writeFigmaClipboard(_el, shotPromise) {
  const svgText = shotPromise.then((s) => {
    if (!isCompleteSvg(s?.svg)) throw new Error('empty snapshot')
    return s.svg
  })

  const plain = svgText.then((svg) => new Blob([svg], { type: 'text/plain' }))
  const svgBlob = svgText.then((svg) => new Blob([svg], { type: 'image/svg+xml' }))

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = { 'text/plain': plain }
    const supports = (type) => typeof ClipboardItem.supports !== 'function' || ClipboardItem.supports(type)
    if (supports('image/svg+xml')) item['image/svg+xml'] = svgBlob
    try {
      await navigator.clipboard.write([new ClipboardItem(item)])
      return true
    } catch {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': plain })])
        return true
      } catch { /* fall through */ }
    }
  }
  try {
    return await writeTextFallback(await svgText)
  } catch {
    return false
  }
}

async function writeTextFallback(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
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
