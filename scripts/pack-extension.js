// copies static extension files (manifest, background, icons) next to the
// built content script in dist-extension/.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'dist-extension')
mkdirSync(out, { recursive: true })

for (const f of ['manifest.json', 'background.js']) {
  copyFileSync(resolve(root, 'extension', f), resolve(out, f))
}

const iconDir = resolve(out, 'icons')
mkdirSync(iconDir, { recursive: true })
for (const f of ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png']) {
  const src = resolve(root, 'extension', 'icons', f)
  if (!existsSync(src)) {
    throw new Error(`missing ${src}`)
  }
  copyFileSync(src, resolve(iconDir, f))
}

console.log('dist-extension/ ready. load unpacked via chrome://extensions.')
