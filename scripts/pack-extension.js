// Copies the static extension files next to the built content script.
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'dist-extension')
mkdirSync(out, { recursive: true })
for (const f of ['manifest.json', 'background.js']) {
  copyFileSync(resolve(root, 'extension', f), resolve(out, f))
}
console.log('dist-extension/ ready. Load it via chrome://extensions -> Load unpacked.')
