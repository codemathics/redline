// DOM utilities: selector generation, element paths, labels.

const SKIP_TAGS = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD'])

export function isInspectable(el) {
  return (
    el instanceof Element &&
    !SKIP_TAGS.has(el.tagName) &&
    !el.closest('redline-root, agentation-root, [data-agentation], [data-agentation-root]')
  )
}

export function shortLabel(el) {
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${el.id}`
  const cls = firstMeaningfulClass(el)
  return cls ? `${tag}.${cls}` : tag
}

function firstMeaningfulClass(el) {
  if (typeof el.className !== 'string') return null
  return (
    el.className
      .split(/\s+/)
      .filter(Boolean)
      // skip utility soup (tailwind-ish) in the label; prefer semantic names
      .find((c) => !/[:[\]!]/.test(c) && c.length < 24) || null
  )
}

// Stable-ish CSS selector: walks up until unique, prefers ids and classes,
// falls back to nth-of-type.
export function cssSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`
  const parts = []
  let node = el
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    let part = node.tagName.toLowerCase()
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`)
      break
    }
    const cls = firstMeaningfulClass(node)
    if (cls) part += `.${CSS.escape(cls)}`
    const parent = node.parentElement
    if (parent) {
      const siblings = [...parent.children].filter((c) => c.tagName === node.tagName)
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`
    }
    parts.unshift(part)
    if (document.querySelectorAll(parts.join(' > ')).length === 1) break
    node = parent
  }
  return parts.join(' > ')
}

export function elementPath(el) {
  const chain = []
  let node = el
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    chain.unshift(shortLabel(node))
    node = node.parentElement
  }
  return chain.join(' > ')
}

export function ancestorChain(el, max = 5) {
  const chain = [el]
  let node = el.parentElement
  while (node && node.tagName !== 'HTML' && chain.length < max) {
    chain.unshift(node)
    node = node.parentElement
  }
  return chain
}

// Text-content editing: an element is editable when its children are only
// text nodes and <br>s. Line breaks round-trip as \n.
export function isTextEditable(el) {
  const nodes = [...el.childNodes]
  return (
    nodes.some((n) => n.nodeType === 3 && n.textContent.trim()) &&
    nodes.every((n) => n.nodeType === 3 || (n.nodeType === 1 && n.tagName === 'BR'))
  )
}

export function getEditableText(el) {
  let out = ''
  for (const n of el.childNodes) out += n.nodeType === 3 ? n.textContent : '\n'
  return out
}

export function setEditableText(el, value) {
  el.textContent = ''
  String(value)
    .split('\n')
    .forEach((part, i) => {
      if (i) el.appendChild(document.createElement('br'))
      el.appendChild(document.createTextNode(part))
    })
}

export function textSnippet(el, max = 60) {
  const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}
