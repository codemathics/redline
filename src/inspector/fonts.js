// Font catalog: fonts on this machine + a curated set of open-source web fonts.

export const CURATED_LOCAL = [
  'SF Pro Text', 'SF Pro Display', 'New York', 'Helvetica Neue', 'Arial',
  'Avenir Next', 'Futura', 'Gill Sans', 'Optima', 'Georgia', 'Palatino',
  'Times New Roman', 'Baskerville', 'Menlo', 'SF Mono', 'Monaco', 'Courier New',
]

export const GOOGLE_FONTS = [
  'Inter', 'DM Sans', 'Manrope', 'Space Grotesk', 'Sora', 'Outfit',
  'Plus Jakarta Sans', 'Figtree', 'Instrument Sans', 'Work Sans', 'Rubik',
  'Karla', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
  'Bricolage Grotesque', 'Playfair Display', 'Fraunces', 'Instrument Serif',
  'Lora', 'Crimson Pro', 'IBM Plex Sans', 'IBM Plex Mono', 'JetBrains Mono',
  'Space Mono', 'Fira Code',
]

const SERIF = new Set([
  'New York', 'Georgia', 'Palatino', 'Times New Roman', 'Baskerville',
  'Playfair Display', 'Fraunces', 'Instrument Serif', 'Lora', 'Crimson Pro',
])
const MONO = new Set([
  'Menlo', 'SF Mono', 'Monaco', 'Courier New', 'IBM Plex Mono',
  'JetBrains Mono', 'Space Mono', 'Fira Code',
])

export function fontStack(family) {
  const generic = MONO.has(family) ? 'monospace' : SERIF.has(family) ? 'serif' : 'sans-serif'
  return `"${family}", ${generic}`
}

export function isLocalFontAvailable(family) {
  try {
    return document.fonts.check(`12px "${family}"`)
  } catch {
    return false
  }
}

// Load a Google font into the page (idempotent). Resolves once usable.
const loaded = new Set()
export async function loadGoogleFont(family) {
  if (!loaded.has(family)) {
    loaded.add(family)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`
    document.head.appendChild(link)
  }
  try {
    await document.fonts.load(`12px "${family}"`)
  } catch { /* best effort */ }
}

// Full local list via the Local Font Access API (permission-gated, needs a
// user gesture). Falls back to the curated list filtered by availability.
let localCache = null
export async function localFonts() {
  if (localCache) return localCache
  if ('queryLocalFonts' in window) {
    try {
      const fonts = await window.queryLocalFonts()
      const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b))
      if (families.length) return (localCache = families)
    } catch { /* denied or unsupported: fall through */ }
  }
  return (localCache = CURATED_LOCAL.filter(isLocalFontAvailable))
}
