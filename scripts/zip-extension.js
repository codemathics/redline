// zips the contents of dist-extension/ so manifest.json sits at the zip root.
// writes dist/redline-<version>.zip and removes any previous redline-*.zip there.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'dist-extension')
const zipDir = resolve(root, 'dist')
const manifestPath = resolve(out, 'manifest.json')

if (!existsSync(manifestPath)) {
  throw new Error('dist-extension/manifest.json missing. run pnpm run build:ext first.')
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const version = manifest.version
if (!version) {
  throw new Error('dist-extension/manifest.json is missing version.')
}

mkdirSync(zipDir, { recursive: true })
for (const name of readdirSync(zipDir)) {
  if (/^redline-.*\.zip$/.test(name)) {
    unlinkSync(resolve(zipDir, name))
  }
}

const zipPath = resolve(zipDir, `redline-${version}.zip`)
const zipped = spawnSync('zip', ['-X', '-r', zipPath, '.'], {
  cwd: out,
  stdio: 'inherit',
})
if (zipped.status !== 0) {
  throw new Error('zip failed. install the system zip command and retry.')
}

console.log(`wrote ${zipPath}`)
