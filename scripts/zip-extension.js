// zips the contents of dist-extension/ so manifest.json sits at the zip root.
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'dist-extension')
const zipDir = resolve(root, 'store')
const zipPath = resolve(zipDir, 'redline.zip')

if (!existsSync(resolve(out, 'manifest.json'))) {
  throw new Error('dist-extension/manifest.json missing. run pnpm run build:ext first.')
}

mkdirSync(zipDir, { recursive: true })
if (existsSync(zipPath)) unlinkSync(zipPath)

const zipped = spawnSync('zip', ['-X', '-r', zipPath, '.'], {
  cwd: out,
  stdio: 'inherit',
})
if (zipped.status !== 0) {
  throw new Error('zip failed. install the system zip command and retry.')
}

console.log(`wrote ${zipPath}`)
