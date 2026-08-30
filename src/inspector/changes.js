// Change store: tracks per-element before/after edits and serializes them
// into an agent-ready annotation.

import { cssSelector, elementPath, shortLabel, textSnippet, setEditableText } from './dom.js'
import { PROP_META } from './styles.js'

export class ChangeStore {
  constructor(onChange) {
    this.groups = new Map() // Element -> { selector, path, label, text, edits: Map<prop, {before, after}> }
    this.onChange = onChange
  }

  record(el, prop, before, after) {
    let group = this.groups.get(el)
    if (!group) {
      group = {
        selector: cssSelector(el),
        path: elementPath(el),
        label: shortLabel(el),
        text: textSnippet(el),
        edits: new Map(),
      }
      this.groups.set(el, group)
    }
    const existing = group.edits.get(prop)
    const original = existing ? existing.before : before
    if (normalize(original) === normalize(after)) {
      group.edits.delete(prop)
      if (group.edits.size === 0) this.groups.delete(el)
    } else {
      group.edits.set(prop, { before: original, after })
    }
    this.onChange?.()
  }

  originalOf(el, prop) {
    return this.groups.get(el)?.edits.get(prop)?.before
  }

  revert(el, prop) {
    const group = this.groups.get(el)
    if (!group) return
    const edit = group.edits.get(prop)
    if (!edit) return
    applyValue(el, prop, edit.before)
    group.edits.delete(prop)
    if (group.edits.size === 0) this.groups.delete(el)
    this.onChange?.()
  }

  revertAll() {
    for (const [el, group] of this.groups) {
      for (const [prop, edit] of group.edits) {
        applyValue(el, prop, edit.before)
      }
    }
    this.groups.clear()
    this.onChange?.()
  }

  // Temporarily flip the whole page between its original and edited state.
  showOriginal() {
    for (const [el, group] of this.groups) {
      for (const [prop, edit] of group.edits) applyValue(el, prop, edit.before)
    }
  }

  showEdited() {
    for (const [el, group] of this.groups) {
      for (const [prop, edit] of group.edits) applyValue(el, prop, edit.after)
    }
  }

  get count() {
    let n = 0
    for (const group of this.groups.values()) n += group.edits.size
    return n
  }

  toMarkdown() {
    const lines = []
    lines.push(`## Design annotations: ${location.host}${location.pathname}`)
    lines.push('')
    lines.push(
      'Live style edits made in the browser with Redline. Apply each change to the source component that renders the element (selectors and computed values below describe the rendered DOM, not the source).'
    )
    let i = 0
    for (const group of this.groups.values()) {
      i++
      lines.push('')
      lines.push(`### ${i}. \`${group.label}\`${group.text ? ` ("${group.text}")` : ''}`)
      lines.push(`- selector: \`${group.selector}\``)
      lines.push(`- path: \`${group.path}\``)
      lines.push('- changes:')
      for (const [prop, edit] of group.edits) {
        lines.push(`  - \`${PROP_META[prop].css}\`: \`${edit.before}\` → \`${edit.after}\``)
      }
    }
    lines.push('')
    return lines.join('\n')
  }
}

function normalize(v) {
  return String(v).trim().toLowerCase()
}

// 'text' is a pseudo-property for content edits; everything else is a style.
export function applyValue(el, prop, value) {
  if (prop === 'text') setEditableText(el, value)
  else el.style.setProperty(PROP_META[prop].css, value)
}
