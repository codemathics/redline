// Dev harness entry: mounts the inspector immediately and exposes a handle.
import { mount, unmount, toggle, annotation } from './inspector/index.js'

window.redline = { mount, unmount, toggle, annotation }
mount()

// Cmd/Ctrl + . re-toggles after quitting with Esc.
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === '.') {
    e.preventDefault()
    toggle()
  }
})
