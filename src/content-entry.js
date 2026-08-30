// Chrome extension content entry. Injected on toolbar click; re-injection toggles.
import { toggle } from './inspector/index.js'

if (window.__REDLINE__) {
  window.__REDLINE__.toggle()
} else {
  window.__REDLINE__ = { toggle }
  toggle()
}
