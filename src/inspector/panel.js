// The inspector panel: sections of live-editable fields + changes tray.

import { ancestorChain, shortLabel, isTextEditable, getEditableText, setEditableText } from './dom.js'
import { readStyles, hasOwnText, toHex, PROP_META } from './styles.js'
import { GOOGLE_FONTS, fontStack, loadGoogleFont, localFonts } from './fonts.js'
import { openColorPicker } from './colorpicker.js'

const ICONS = {
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1"/></svg>',
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>',
  mark: '<svg viewBox="0 0 1040 1051" fill="currentColor" aria-hidden="true"><rect x="31.8359" y="150" width="40" height="751"/><rect x="967.836" y="150" width="40" height="751"/><rect x="894.836" y="32" width="40" height="751" transform="rotate(90 894.836 32)"/><rect x="894.836" y="979" width="40" height="751" transform="rotate(90 894.836 979)"/><rect x="968" width="72" height="72"/><rect width="72" height="72"/><rect y="979" width="72" height="72"/><rect x="968" y="979" width="72" height="72"/></svg>',
  lockup: '<svg viewBox="0 0 3525 1051" aria-hidden="true"><g class="rl-brand-mark"><rect x="31.8359" y="150" width="40" height="751"/><rect x="967.836" y="150" width="40" height="751"/><rect x="894.836" y="32" width="40" height="751" transform="rotate(90 894.836 32)"/><rect x="894.836" y="979" width="40" height="751" transform="rotate(90 894.836 979)"/><rect x="968" width="72" height="72"/><rect width="72" height="72"/><rect y="979" width="72" height="72"/><rect x="968" y="979" width="72" height="72"/></g><g class="rl-brand-word"><path d="M3382.5 838.491C3349.66 838.491 3320.25 827.546 3294.26 805.658C3268.27 783.769 3247.4 752.989 3231.67 713.316C3216.62 672.959 3209.1 626.446 3209.1 573.777C3209.1 519.739 3216.96 472.2 3232.7 431.159C3248.43 390.118 3269.98 357.969 3297.34 334.713C3324.7 311.456 3355.14 299.828 3388.65 299.828C3429.01 299.828 3461.5 316.587 3486.12 350.103C3511.43 382.936 3524.09 436.631 3524.09 511.189C3524.09 533.762 3515.54 545.048 3498.44 545.048H3303.49C3289.81 545.048 3282.97 552.914 3282.97 568.646C3282.97 641.152 3293.57 695.531 3314.78 731.784C3335.98 768.037 3363 786.163 3395.83 786.163C3421.83 786.163 3443.03 776.929 3459.45 758.461C3475.86 739.992 3489.2 708.87 3499.46 665.093C3501.51 657.569 3505.96 653.806 3512.8 653.806C3521.01 653.806 3524.09 660.647 3522.03 674.327C3511.09 735.204 3493.65 777.955 3469.71 802.58C3445.77 826.52 3416.7 838.491 3382.5 838.491ZM3300.41 519.397H3404.04C3436.88 519.397 3453.29 502.297 3453.29 468.096C3453.29 423.635 3447.82 388.75 3436.88 363.442C3425.93 338.133 3409.51 325.479 3387.63 325.479C3360.95 325.479 3338.38 340.869 3319.91 371.65C3302.12 402.431 3290.5 446.208 3285.02 502.981C3283.66 513.925 3288.79 519.397 3300.41 519.397Z"/><path d="M2775.37 829.256C2765.11 829.256 2759.98 825.494 2759.98 817.97C2759.98 811.814 2764.42 807.71 2773.32 805.658L2785.63 803.606C2799.99 800.87 2809.23 796.766 2813.33 791.294C2818.12 785.137 2820.51 774.877 2820.51 760.513V415.769C2820.51 403.457 2818.46 395.248 2814.36 391.144C2810.94 386.356 2804.44 383.278 2794.86 381.91L2773.32 378.832C2764.42 378.148 2759.98 374.386 2759.98 367.546C2759.98 362.074 2765.45 358.311 2776.39 356.259C2797.6 352.839 2813.67 347.367 2824.62 339.843C2836.25 332.319 2848.22 323.085 2860.53 312.14C2866.68 305.984 2871.82 302.906 2875.92 302.906C2882.08 302.906 2885.15 307.01 2885.15 315.218V361.39C2885.15 367.546 2887.21 371.65 2891.31 373.702C2896.1 375.07 2901.23 373.018 2906.7 367.546C2934.06 341.553 2958 323.769 2978.52 314.192C2999.73 304.616 3021.96 299.828 3045.21 299.828C3075.99 299.828 3100.62 310.772 3119.09 332.661C3137.56 353.865 3146.79 385.33 3146.79 427.055V760.513C3146.79 774.877 3148.84 785.137 3152.95 791.294C3157.73 796.766 3167.31 800.528 3181.67 802.58L3204.25 805.658C3211.77 807.026 3215.53 811.13 3215.53 817.97C3215.53 825.494 3211.43 829.256 3203.22 829.256H3030.85C3021.27 829.256 3016.48 825.494 3016.48 817.97C3016.48 811.13 3020.25 807.026 3027.77 805.658L3042.14 803.606C3056.5 801.554 3065.73 797.45 3069.84 791.294C3074.63 785.137 3077.02 774.877 3077.02 760.513V438.341C3077.02 404.825 3070.86 381.226 3058.55 367.546C3046.24 353.865 3028.8 347.025 3006.22 347.025C2984.34 347.025 2964.5 353.523 2946.71 366.52C2929.61 378.832 2915.93 395.59 2905.67 416.795C2895.41 437.315 2890.28 460.23 2890.28 485.538V760.513C2890.28 774.877 2892.34 785.137 2896.44 791.294C2901.23 797.45 2910.8 801.212 2925.17 802.58L2952.87 805.658C2960.4 807.026 2964.16 810.788 2964.16 816.944C2964.16 825.152 2959.03 829.256 2948.77 829.256H2775.37Z"/><path d="M2674.15 208.514C2659.78 208.514 2647.47 203.384 2637.21 193.123C2627.63 182.863 2622.85 169.867 2622.85 154.134C2622.85 138.402 2627.63 125.748 2637.21 116.172C2647.47 105.911 2659.78 100.781 2674.15 100.781C2688.51 100.781 2700.48 105.911 2710.06 116.172C2719.63 125.748 2724.42 138.402 2724.42 154.134C2724.42 169.867 2719.63 182.863 2710.06 193.123C2700.48 203.384 2688.51 208.514 2674.15 208.514ZM2587.96 829.258C2577.7 829.258 2572.57 825.496 2572.57 817.972C2572.57 811.816 2577.02 807.712 2585.91 805.66L2598.22 803.608C2615.32 800.872 2626.27 796.768 2631.05 791.295C2635.84 785.139 2638.24 774.879 2638.24 760.515V415.771C2638.24 403.458 2636.18 395.25 2632.08 391.146C2628.66 386.358 2622.16 383.28 2612.59 381.912L2591.04 378.834C2582.15 378.15 2577.7 374.388 2577.7 367.547C2577.7 362.075 2583.17 358.313 2594.12 356.261C2615.32 352.841 2632.42 347.369 2645.42 339.845C2658.41 332.321 2671.07 323.086 2683.38 312.142C2689.54 305.986 2694.67 302.908 2698.77 302.908C2704.93 302.908 2708.01 307.012 2708.01 315.22V760.515C2708.01 774.879 2710.06 785.139 2714.16 791.295C2718.27 797.452 2726.13 801.214 2737.76 802.582L2763.41 805.66C2770.93 807.028 2774.7 810.79 2774.7 816.946C2774.7 825.154 2769.57 829.258 2759.31 829.258H2587.96Z"/><path d="M2393.3 829.258C2385.09 829.258 2380.98 825.496 2380.98 817.971C2380.98 811.131 2384.75 807.027 2392.27 805.659L2406.63 803.607C2421 801.555 2431.6 797.451 2438.44 791.295C2445.28 785.139 2448.7 774.878 2448.7 760.514V172.602C2448.7 160.29 2446.65 151.74 2442.55 146.952C2439.13 142.164 2432.63 139.428 2423.05 138.744L2399.45 135.665C2391.93 134.297 2388.17 130.193 2388.17 123.353C2388.17 116.513 2391.93 112.409 2399.45 111.041C2418.61 106.937 2435.02 102.149 2448.7 96.6766C2462.38 91.2045 2473.67 85.7323 2482.56 80.2602C2493.5 73.4201 2501.71 70 2507.19 70C2514.71 70 2518.47 75.4721 2518.47 86.4164V760.514C2518.47 774.878 2520.52 785.139 2524.63 791.295C2529.42 796.767 2538.99 800.529 2553.36 802.581L2576.95 805.659C2584.48 807.027 2588.24 811.131 2588.24 817.971C2588.24 825.496 2584.14 829.258 2575.93 829.258H2393.3Z"/><path d="M2130.6 838.492C2100.5 838.492 2073.49 828.232 2049.55 807.711C2026.29 786.507 2008.16 757.436 1995.17 720.499C1982.17 682.878 1975.67 639.443 1975.67 590.194C1975.67 532.737 1984.56 482.462 2002.35 439.369C2020.13 395.592 2044.76 361.391 2076.22 336.766C2107.69 312.142 2143.26 299.829 2182.93 299.829C2192.5 299.829 2202.08 300.855 2211.66 302.907C2221.23 304.275 2230.47 307.012 2239.36 311.116C2250.3 316.588 2255.78 314.194 2255.78 303.933V172.602C2255.78 160.29 2253.72 151.74 2249.62 146.952C2246.2 142.164 2239.7 139.428 2230.13 138.744L2203.45 135.665C2195.93 134.297 2192.16 130.193 2192.16 123.353C2192.16 116.513 2195.93 112.409 2203.45 111.041C2225.34 106.937 2242.78 102.149 2255.78 96.6766C2269.46 91.2045 2280.74 85.7323 2289.64 80.2602C2300.58 73.4201 2308.79 70 2314.26 70C2321.78 70 2325.55 75.4721 2325.55 86.4164V731.785C2325.55 760.514 2332.73 774.878 2347.09 774.878C2355.98 774.878 2364.19 769.064 2371.72 757.436C2379.24 745.124 2383 724.603 2383 695.875C2383 684.93 2387.45 679.458 2396.34 679.458C2404.55 679.458 2408.65 685.272 2408.65 696.901C2408.65 746.834 2400.1 783.087 2383 805.659C2365.9 827.548 2346.41 838.492 2324.52 838.492C2304.68 838.492 2289.64 831.994 2279.38 818.997C2269.11 805.317 2262.27 789.243 2258.85 770.774C2258.17 765.302 2255.78 762.566 2251.67 762.566C2247.57 761.882 2243.81 764.276 2240.39 769.748C2221.23 796.425 2203.79 814.551 2188.06 824.128C2172.33 833.704 2153.17 838.492 2130.6 838.492ZM2153.17 791.295C2170.96 791.295 2187.37 785.481 2202.42 773.852C2218.16 761.54 2230.81 745.124 2240.39 724.603C2250.65 704.083 2255.78 681.168 2255.78 655.86V425.004C2255.78 394.224 2248.59 369.941 2234.23 352.157C2220.55 334.372 2202.42 325.48 2179.85 325.48C2141.55 325.48 2110.42 348.052 2086.48 393.198C2063.23 437.659 2051.6 498.536 2051.6 575.83C2051.6 646.283 2060.49 699.979 2078.27 736.916C2096.74 773.168 2121.71 791.295 2153.17 791.295Z"/><path d="M1818.21 838.491C1785.38 838.491 1755.96 827.546 1729.97 805.658C1703.98 783.769 1683.12 752.989 1667.38 713.316C1652.33 672.959 1644.81 626.446 1644.81 573.777C1644.81 519.739 1652.68 472.2 1668.41 431.159C1684.14 390.118 1705.69 357.969 1733.05 334.713C1760.41 311.456 1790.85 299.828 1824.36 299.828C1864.72 299.828 1897.21 316.587 1921.84 350.103C1947.15 382.936 1959.8 436.631 1959.8 511.189C1959.8 533.762 1951.25 545.048 1934.15 545.048H1739.2C1725.52 545.048 1718.68 552.914 1718.68 568.646C1718.68 641.152 1729.29 695.531 1750.49 731.784C1771.7 768.037 1798.71 786.163 1831.55 786.163C1857.54 786.163 1878.74 776.929 1895.16 758.461C1911.58 739.992 1924.92 708.87 1935.18 665.093C1937.23 657.569 1941.67 653.806 1948.51 653.806C1956.72 653.806 1959.8 660.647 1957.75 674.327C1946.8 735.204 1929.36 777.955 1905.42 802.58C1881.48 826.52 1852.41 838.491 1818.21 838.491ZM1736.13 519.397H1839.76C1872.59 519.397 1889 502.297 1889 468.096C1889 423.635 1883.53 388.75 1872.59 363.442C1861.64 338.133 1845.23 325.479 1823.34 325.479C1796.66 325.479 1774.09 340.869 1755.62 371.65C1737.84 402.431 1726.21 446.208 1720.74 502.981C1719.37 513.925 1724.5 519.397 1736.13 519.397Z"/><path d="M1493.62 371.65C1521.66 323.769 1555.52 299.828 1595.19 299.828C1617.77 299.828 1634.52 306.668 1645.47 320.349C1656.41 333.345 1661.89 348.051 1661.89 364.468C1661.89 377.464 1658.47 388.066 1651.63 396.274C1645.47 404.483 1635.55 408.587 1621.87 408.587C1610.93 408.587 1602.72 406.193 1597.25 401.405C1592.46 395.932 1588.35 389.776 1584.93 382.936C1582.2 376.096 1578.78 370.282 1574.67 365.494C1570.57 360.022 1563.73 357.285 1554.15 357.285C1541.84 357.285 1530.21 364.81 1519.27 379.858C1508.32 394.222 1499.09 413.717 1491.57 438.341C1484.73 462.966 1481.31 491.011 1481.31 522.475V760.513C1481.31 774.877 1483.36 785.137 1487.46 791.294C1492.25 797.45 1501.83 801.212 1516.19 802.58L1543.89 805.658C1551.42 807.026 1555.18 810.788 1555.18 816.944C1555.18 825.152 1550.05 829.256 1539.79 829.256H1366.39C1356.13 829.256 1351 825.494 1351 817.97C1351 811.814 1355.45 807.71 1364.34 805.658L1376.65 803.606C1391.01 800.87 1400.25 796.766 1404.35 791.294C1409.14 785.137 1411.54 774.877 1411.54 760.513V415.769C1411.54 403.457 1409.48 395.248 1405.38 391.144C1401.96 386.356 1395.46 383.278 1385.88 381.91L1364.34 378.832C1355.45 378.148 1351 374.386 1351 367.546C1351 362.074 1356.47 358.311 1367.42 356.259C1388.62 352.839 1404.7 347.367 1415.64 339.843C1427.27 332.319 1439.24 323.085 1451.55 312.14C1457.71 305.984 1462.84 302.906 1466.94 302.906C1473.1 302.906 1476.17 307.01 1476.17 315.218V370.624C1476.17 375.412 1478.23 378.49 1482.33 379.858C1486.44 380.542 1490.2 377.806 1493.62 371.65Z"/></g></svg>',
  eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 8s2.2-4.2 6.2-4.2S14.2 8 14.2 8s-2.2 4.2-6.2 4.2S1.8 8 1.8 8z"/><circle cx="8" cy="8" r="1.9"/></svg>',
  sun: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>',
  moon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 9.5A5.8 5.8 0 0 1 6.5 2.5a5.8 5.8 0 1 0 7 7z"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  alignLeft: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h6M3 12h8"/></svg>',
  alignCenter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M5 8h6M4 12h8"/></svg>',
  alignRight: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M7 8h6M5 12h8"/></svg>',
}

export class Panel {
  /**
   * @param {ShadowRoot} root
   * @param {object} hooks { onClose, onSelect, onEdit(el, prop, before, after), store }
   */
  constructor(root, hooks) {
    this.root = root
    this.hooks = hooks
    this.store = hooks.store
    this.el = document.createElement('div')
    this.el.className = 'rl-panel'
    root.appendChild(this.el)
    this.target = null
    this.trayOpen = false
    this._drag = { x: 0, y: 0 }
    this.render(null)
  }

  destroy() {
    this.el.remove()
  }

  // ---------------------------------------------------------------- render

  render(el) {
    this._closePopovers()
    this.target = el
    this.el.innerHTML = ''
    this.el.appendChild(this._head())
    const body = document.createElement('div')
    body.className = 'rl-body'
    if (!el) {
      body.appendChild(this._empty())
    } else {
      const s = readStyles(el)
      body.appendChild(this._crumbs(el))
      if (hasOwnText(el)) body.appendChild(this._textSection(el, s))
      body.appendChild(this._surfaceSection(el, s))
      body.appendChild(this._layoutSection(el, s))
      this._stagger(body)
    }
    this.el.appendChild(body)
    this.el.appendChild(this._tray())
  }

  // Cascade the panel contents in, top to bottom.
  _stagger(body) {
    const items = body.querySelectorAll('.rl-crumbs, .rl-sec-head, .rl-grid > *')
    items.forEach((n, i) => {
      n.classList.add('rl-anim')
      n.style.animationDelay = `${Math.min(i * 10, 240)}ms`
    })
  }

  refreshTray() {
    const tray = this.el.querySelector('.rl-tray')
    if (tray) tray.replaceWith(this._tray())
    const count = this.el.querySelector('.rl-tray-count')
    if (count) {
      count.classList.remove('rl-pop')
      void count.offsetWidth
      count.classList.add('rl-pop')
    }
  }

  _head() {
    const head = document.createElement('div')
    head.className = 'rl-head'
    const dark = this.hooks.isDark?.() ?? false
    head.innerHTML = `
      <span class="rl-brand" aria-label="Redline">${ICONS.lockup}</span>
      <span class="rl-head-spacer"></span>
      <button class="rl-iconbtn" data-act="theme" title="Switch to ${dark ? 'light' : 'dark'} editor" aria-label="Toggle editor theme">${dark ? ICONS.sun : ICONS.moon}</button>
      <button class="rl-iconbtn" data-act="close" title="Quit (Esc)" aria-label="Quit Redline">${ICONS.close}</button>`
    head.querySelector('[data-act="close"]').addEventListener('click', () => this.hooks.onClose())
    const themeBtn = head.querySelector('[data-act="theme"]')
    themeBtn.addEventListener('click', () => {
      const nowDark = this.hooks.onToggleTheme?.()
      themeBtn.innerHTML = nowDark ? ICONS.sun : ICONS.moon
      themeBtn.title = `Switch to ${nowDark ? 'light' : 'dark'} editor`
    })
    this._draggable(head)
    return head
  }

  _empty() {
    const div = document.createElement('div')
    div.className = 'rl-empty'
    div.innerHTML = `
      <div class="rl-empty-art">
        <span class="rl-pulse"></span>
        ${ICONS.mark}
      </div>
      <div class="rl-empty-title">Select an element</div>
      <div class="rl-empty-sub">Hover to preview, click to inspect.</div>
      <div class="rl-keys">
        <span class="rl-keygroup"><span class="rl-kbd">esc</span> quit</span>
        <span class="rl-keygroup"><span class="rl-kbd">↑</span> parent</span>
        <span class="rl-keygroup"><span class="rl-kbd">←</span><span class="rl-kbd">→</span> siblings</span>
      </div>`
    return div
  }

  _crumbs(el) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-crumbs'
    const chain = ancestorChain(el)
    chain.forEach((node, i) => {
      if (i > 0) {
        const sep = document.createElement('span')
        sep.className = 'rl-crumb-sep'
        sep.textContent = '/'
        wrap.appendChild(sep)
      }
      const btn = document.createElement('button')
      btn.className = 'rl-crumb' + (node === el ? ' rl-here' : '')
      btn.textContent = shortLabel(node)
      btn.addEventListener('click', () => node !== el && this.hooks.onSelect(node))
      btn.addEventListener('mouseenter', () => this.hooks.onPreview?.(node))
      btn.addEventListener('mouseleave', () => this.hooks.onPreview?.(null))
      wrap.appendChild(btn)
    })
    requestAnimationFrame(() => (wrap.scrollLeft = wrap.scrollWidth))
    return wrap
  }

  _section(title) {
    const sec = document.createElement('div')
    sec.className = 'rl-sec'
    sec.innerHTML = `<div class="rl-sec-head"><span class="rl-sec-title">${title}</span></div>`
    const grid = document.createElement('div')
    grid.className = 'rl-grid'
    sec.appendChild(grid)
    return [sec, grid]
  }

  _textSection(el, s) {
    const [sec, grid] = this._section('Text')
    if (isTextEditable(el)) grid.appendChild(this._contentField(el))
    grid.appendChild(this._fontField(el, s.fontFamily))
    grid.appendChild(this._field(el, 'fontSize', s.fontSize))
    grid.appendChild(this._field(el, 'fontWeight', s.fontWeight, { scrub: 100, min: 100, max: 900 }))
    grid.appendChild(this._field(el, 'lineHeight', s.lineHeight))
    grid.appendChild(this._field(el, 'letterSpacing', s.letterSpacing))
    grid.appendChild(this._field(el, 'color', s.color))
    grid.appendChild(this._alignSeg(el, s.textAlign))
    return sec
  }

  _surfaceSection(el, s) {
    const [sec, grid] = this._section('Surface')
    grid.appendChild(this._field(el, 'backgroundColor', s.backgroundColor))
    grid.appendChild(this._field(el, 'borderRadius', s.borderRadius))
    grid.appendChild(this._field(el, 'borderWidth', s.borderWidth))
    grid.appendChild(this._field(el, 'borderColor', s.borderColor))
    grid.appendChild(this._field(el, 'boxShadow', s.boxShadow, { span: 2 }))
    grid.appendChild(this._field(el, 'opacity', s.opacity))
    return sec
  }

  _layoutSection(el, s) {
    const [sec, grid] = this._section('Layout')
    grid.appendChild(this._field(el, 'width', s.width))
    grid.appendChild(this._field(el, 'height', s.height))
    if (s.display.includes('flex') || s.display.includes('grid')) {
      grid.appendChild(this._field(el, 'gap', s.gap))
    }
    const pad = this._spaceBox(el, 'Padding', {
      t: ['paddingTop', s.paddingTop],
      r: ['paddingRight', s.paddingRight],
      b: ['paddingBottom', s.paddingBottom],
      l: ['paddingLeft', s.paddingLeft],
    })
    pad.classList.add('rl-span2')
    grid.appendChild(pad)
    const mar = this._spaceBox(el, 'Margin', {
      t: ['marginTop', s.marginTop],
      r: ['marginRight', s.marginRight],
      b: ['marginBottom', s.marginBottom],
      l: ['marginLeft', s.marginLeft],
    })
    mar.classList.add('rl-span2')
    grid.appendChild(mar)
    return sec
  }

  // ---------------------------------------------------------------- fields

  _field(el, prop, value, opts = {}) {
    const meta = PROP_META[prop]
    const wrap = document.createElement('div')
    wrap.className = 'rl-field'
    if (opts.span === 2) wrap.classList.add('rl-span2')
    const isColor = !!meta.color
    if (isColor) wrap.classList.add('rl-color')
    const scrubStep = opts.scrub ?? meta.scrub
    if (scrubStep) wrap.classList.add('rl-scrub')
    if (this.store.originalOf(el, prop) !== undefined) wrap.classList.add('rl-dirty')

    const label = document.createElement('span')
    label.className = 'rl-label'
    label.textContent = meta.label
    const input = document.createElement('input')
    input.className = 'rl-input'
    input.value = value
    input.spellcheck = false
    input.setAttribute('aria-label', meta.label)
    wrap.append(label, input)

    const commit = (v) => {
      if (v === input.dataset.applied) return
      this._apply(el, prop, v)
      input.dataset.applied = v
      input.value = isColor ? toHex(getComputedStyle(el)[prop] ?? v) || v : v
      wrap.classList.toggle('rl-dirty', this.store.originalOf(el, prop) !== undefined)
      if (isColor && swatchFill) paintSwatch(swatchFill, input.value)
    }
    input.dataset.applied = value
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') { commit(input.value.trim()); input.blur() }
      if (e.key === 'Escape') { input.value = input.dataset.applied; input.blur() }
      // arrow nudge for numeric values
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && scrubStep) {
        e.preventDefault()
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1) * scrubStep
        commit(nudge(input.dataset.applied, delta, opts.min ?? meta.min, opts.max ?? meta.max))
      }
    })
    input.addEventListener('blur', () => commit(input.value.trim()))

    let swatchFill = null
    if (isColor) {
      const swatch = document.createElement('button')
      swatch.className = 'rl-swatch'
      swatch.setAttribute('aria-label', `${meta.label} picker`)
      swatchFill = swatch
      paintSwatch(swatch, value)
      swatch.addEventListener('click', () => {
        this._closePopovers()
        this._closeColorPop = openColorPicker({
          panel: this.el,
          anchor: wrap,
          value: input.dataset.applied,
          onChange: (hex) => {
            commit(hex)
            paintSwatch(swatch, input.value)
          },
          onClose: () => (this._closeColorPop = null),
        })
      })
      wrap.appendChild(swatch)
    }

    if (scrubStep) this._scrubbable(label, input, commit, scrubStep, opts.min ?? meta.min, opts.max ?? meta.max)
    return wrap
  }

  // Editable text content: applies live on every keystroke.
  _contentField(el) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-field rl-span2'
    if (this.store.originalOf(el, 'text') !== undefined) wrap.classList.add('rl-dirty')
    const label = document.createElement('span')
    label.className = 'rl-label'
    label.textContent = 'Content'
    const input = document.createElement('textarea')
    input.className = 'rl-input rl-textarea'
    input.rows = 1
    input.value = getEditableText(el)
    input.spellcheck = false
    input.setAttribute('aria-label', 'Text content')
    wrap.append(label, input)

    const fit = () => {
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight}px`
    }
    const commit = () => {
      this.hooks.onEditIntent?.()
      const before = this.store.originalOf(el, 'text') ?? getEditableText(el)
      setEditableText(el, input.value)
      this.hooks.onEdit(el, 'text', before, input.value)
      wrap.classList.toggle('rl-dirty', this.store.originalOf(el, 'text') !== undefined)
    }
    input.addEventListener('input', () => { fit(); commit() })
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Escape') input.blur()
    })
    requestAnimationFrame(fit)
    return wrap
  }

  // Font picker: local fonts + Google fonts, live preview on hover,
  // optional apply-to-whole-page.
  _fontField(el, current) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-field rl-span2 rl-fontfield'
    if (this.store.originalOf(el, 'fontFamily') !== undefined) wrap.classList.add('rl-dirty')
    wrap.innerHTML = `
      <span class="rl-label">Font</span>
      <button class="rl-fontvalue" aria-haspopup="listbox">
        <span class="rl-fontname"></span>
        ${ICONS.chevron}
      </button>`
    const nameEl = wrap.querySelector('.rl-fontname')
    nameEl.textContent = current
    wrap.querySelector('.rl-fontvalue').addEventListener('click', () => {
      this._openFontMenu(el, wrap, (family) => {
        nameEl.textContent = family
        wrap.classList.toggle('rl-dirty', this.store.originalOf(el, 'fontFamily') !== undefined)
      })
    })
    return wrap
  }

  _closePopovers() {
    this._closeFontMenu()
    this._closeColorPop?.()
    this._closeColorPop = null
  }

  async _openFontMenu(el, anchor, onPicked) {
    this._closePopovers()
    const menu = document.createElement('div')
    menu.className = 'rl-fontmenu'
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = this.el.getBoundingClientRect()
    menu.style.top = `${Math.min(anchorRect.bottom - panelRect.top + 6, panelRect.height - 330)}px`
    menu.innerHTML = `
      <input class="rl-fontsearch" placeholder="Search fonts" spellcheck="false" aria-label="Search fonts" />
      <div class="rl-fontlist" role="listbox"></div>
      <button class="rl-fontpage">Set as page font</button>`
    this.el.appendChild(menu)
    this._fontMenu = menu

    const search = menu.querySelector('.rl-fontsearch')
    const list = menu.querySelector('.rl-fontlist')
    const applied = () => getComputedStyle(el).fontFamily

    let hoverToken = 0
    const preview = async (family, google) => {
      const token = ++hoverToken
      if (google) await loadGoogleFont(family)
      if (token !== hoverToken || !this._fontMenu) return
      el.style.fontFamily = fontStack(family)
    }
    const endPreview = () => {
      hoverToken++
      const orig = this.store.originalOf(el, 'fontFamily')
      const edit = this.store.groups.get(el)?.edits.get('fontFamily')
      el.style.fontFamily = edit ? edit.after : orig !== undefined ? orig : ''
    }
    const pick = async (family, google) => {
      if (google) await loadGoogleFont(family)
      // restore the pre-preview value first so `before` is captured correctly
      endPreview()
      this._apply(el, 'fontFamily', fontStack(family))
      onPicked(family)
      this._closeFontMenu()
    }

    const locals = await localFonts()
    const render = () => {
      const q = search.value.trim().toLowerCase()
      const match = (f) => f.toLowerCase().includes(q)
      list.innerHTML = ''
      const section = (title, fonts, google) => {
        const hits = fonts.filter(match).slice(0, 60)
        if (!hits.length) return
        const cap = document.createElement('div')
        cap.className = 'rl-fontcap'
        cap.textContent = title
        list.appendChild(cap)
        for (const family of hits) {
          const opt = document.createElement('button')
          opt.className = 'rl-fontopt'
          opt.setAttribute('role', 'option')
          opt.textContent = family
          if (!google) opt.style.fontFamily = fontStack(family)
          opt.addEventListener('mouseenter', () => preview(family, google))
          opt.addEventListener('mouseleave', endPreview)
          opt.addEventListener('click', () => pick(family, google))
          list.appendChild(opt)
        }
      }
      section('On this device', locals, false)
      section('Google fonts', GOOGLE_FONTS, true)
    }
    render()
    search.addEventListener('input', render)
    search.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Escape') this._closeFontMenu()
    })

    menu.querySelector('.rl-fontpage').addEventListener('click', () => {
      endPreview()
      this._apply(document.body, 'fontFamily', applied())
      this.hooks.onToast?.('Applied to the whole page')
      this._closeFontMenu()
    })

    // close on outside click
    this._fontMenuDismiss = (e) => {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) this._closeFontMenu()
    }
    setTimeout(() => this.root.addEventListener('click', this._fontMenuDismiss, true), 0)
    search.focus()
  }

  _closeFontMenu() {
    if (this._fontMenuDismiss) this.root.removeEventListener('click', this._fontMenuDismiss, true)
    this._fontMenuDismiss = null
    this._fontMenu?.remove()
    this._fontMenu = null
  }

  _alignSeg(el, current) {
    const wrap = document.createElement('div')
    wrap.className = 'rl-seg rl-span2'
    const thumb = document.createElement('span')
    thumb.className = 'rl-seg-thumb'
    wrap.appendChild(thumb)
    const options = [
      ['left', ICONS.alignLeft],
      ['center', ICONS.alignCenter],
      ['right', ICONS.alignRight],
    ]
    const normalized = current === 'start' ? 'left' : current === 'end' ? 'right' : current
    const buttons = options.map(([val, icon]) => {
      const b = document.createElement('button')
      b.innerHTML = icon
      b.dataset.val = val
      b.setAttribute('aria-label', `Align ${val}`)
      if (val === normalized) b.classList.add('rl-on')
      b.addEventListener('click', () => {
        this._apply(el, 'textAlign', val)
        buttons.forEach((x) => x.classList.toggle('rl-on', x === b))
        moveThumb(b)
      })
      wrap.appendChild(b)
      return b
    })
    const moveThumb = (b) => {
      thumb.style.width = `${b.offsetWidth}px`
      thumb.style.transform = `translateX(${b.offsetLeft - 2}px)`
    }
    requestAnimationFrame(() => {
      const active = buttons.find((b) => b.classList.contains('rl-on')) || buttons[0]
      thumb.style.transition = 'none'
      moveThumb(active)
      void thumb.offsetWidth
      thumb.style.transition = ''
    })
    return wrap
  }

  _spaceBox(el, cap, sides) {
    const box = document.createElement('div')
    box.className = 'rl-spacebox'
    box.innerHTML = `<span class="rl-spacebox-cap">${cap}</span><div class="rl-spacebox-inner"></div>`
    for (const [pos, [prop, value]] of Object.entries(sides)) {
      const input = document.createElement('input')
      input.className = `rl-space-in ${pos}`
      input.value = parseFloat(value) || 0
      input.dataset.applied = input.value
      input.setAttribute('aria-label', PROP_META[prop].label)
      const commit = (raw) => {
        const n = parseFloat(raw)
        if (isNaN(n)) { input.value = input.dataset.applied; return }
        const v = `${n}px`
        this._apply(el, prop, v)
        input.value = n
        input.dataset.applied = n
        input.classList.toggle('rl-dirty', this.store.originalOf(el, prop) !== undefined)
      }
      input.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Enter') { commit(input.value); input.blur() }
        if (e.key === 'Escape') { input.value = input.dataset.applied; input.blur() }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          commit(String(parseFloat(input.dataset.applied) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)))
        }
      })
      input.addEventListener('blur', () => commit(input.value))
      this._scrubbable(input, input, (v) => commit(String(parseFloat(v))), 1, cap === 'Padding' ? 0 : undefined)
      box.appendChild(input)
    }
    return box
  }

  // Drag horizontally on `handle` to scrub the numeric value in `input`.
  _scrubbable(handle, input, commit, step, min, max) {
    let startX = 0
    let startVal = 0
    let scrubbing = false
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      const n = parseFloat(input.dataset.applied ?? input.value)
      if (isNaN(n)) return
      startX = e.clientX
      startVal = n
      scrubbing = false
      handle.setPointerCapture(e.pointerId)
      const move = (ev) => {
        const dx = ev.clientX - startX
        if (!scrubbing && Math.abs(dx) < 3) return
        scrubbing = true
        let v = startVal + Math.round(dx / 2) * step * (ev.shiftKey ? 10 : 1)
        v = Math.round(v * 100) / 100
        if (min !== undefined) v = Math.max(min, v)
        if (max !== undefined) v = Math.min(max, v)
        commit(replaceNumber(input.dataset.applied ?? input.value, v))
      }
      const up = () => {
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', up)
        if (scrubbing && input.blur) input.blur()
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
    })
  }

  _apply(el, prop, value) {
    this.hooks.onEditIntent?.()
    const meta = PROP_META[prop]
    const before = this.store.originalOf(el, prop) ?? currentValue(el, prop)
    el.style.setProperty(meta.css, value)
    const after = currentValue(el, prop)
    this.hooks.onEdit(el, prop, before, after)
  }

  // ---------------------------------------------------------------- tray

  _tray() {
    const tray = document.createElement('div')
    tray.className = 'rl-tray' + (this.trayOpen ? ' rl-open' : '')
    const count = this.store.count
    const head = document.createElement('button')
    head.className = 'rl-tray-head'
    head.setAttribute('aria-expanded', String(this.trayOpen))
    head.innerHTML = `
      <span class="rl-tray-count ${count === 0 ? 'rl-zero' : ''}">${count}</span>
      <span class="rl-tray-title">${count === 1 ? 'Change' : 'Changes'}</span>
      <span class="rl-tray-spacer"></span>
      <span class="rl-tray-chev">${ICONS.chevron}</span>`
    head.addEventListener('click', () => {
      this.trayOpen = !this.trayOpen
      tray.classList.toggle('rl-open', this.trayOpen)
      head.setAttribute('aria-expanded', String(this.trayOpen))
    })
    tray.appendChild(head)

    const list = document.createElement('div')
    list.className = 'rl-tray-list'
    for (const [el, group] of this.store.groups) {
      const g = document.createElement('div')
      g.className = 'rl-diff-group'
      const elBtn = document.createElement('button')
      elBtn.className = 'rl-diff-el'
      elBtn.textContent = group.label
      elBtn.title = 'Jump to element'
      elBtn.addEventListener('click', () => this.hooks.onSelect(el))
      g.appendChild(elBtn)
      for (const [prop, edit] of group.edits) {
        const row = document.createElement('div')
        row.className = 'rl-diff-row'
        row.innerHTML = `
          <span class="rl-prop">${PROP_META[prop].css}</span>
          <span class="rl-before">${escapeHtml(edit.before)}</span>
          <span class="rl-arrow">→</span>
          <span class="rl-after">${escapeHtml(edit.after)}</span>`
        const x = document.createElement('button')
        x.className = 'rl-diff-x'
        x.title = 'Revert'
        x.setAttribute('aria-label', `Revert ${PROP_META[prop].css}`)
        x.innerHTML = ICONS.x
        x.addEventListener('click', () => {
          this.hooks.onEditIntent?.()
          this.store.revert(el, prop)
          if (this.target === el) this.render(el)
        })
        row.appendChild(x)
        g.appendChild(row)
      }
      list.appendChild(g)
    }
    tray.appendChild(list)

    const actions = document.createElement('div')
    actions.className = 'rl-actions'
    const viewing = this.hooks.isViewingBefore?.() ?? false
    const eye = document.createElement('button')
    eye.className = 'rl-btn rl-btn-ghost rl-btn-eye' + (viewing ? ' rl-on' : '')
    eye.title = viewing ? 'Show your edits' : 'Show the original page'
    eye.setAttribute('aria-pressed', String(viewing))
    eye.setAttribute('aria-label', 'Toggle original page')
    eye.innerHTML = ICONS.eye
    eye.disabled = count === 0
    eye.addEventListener('click', () => this.hooks.onToggleView?.())
    const reset = document.createElement('button')
    reset.className = 'rl-btn rl-btn-ghost'
    reset.textContent = 'Reset'
    reset.addEventListener('click', () => {
      this.hooks.onEditIntent?.()
      this.store.revertAll()
      if (this.target) this.render(this.target)
    })
    const copy = document.createElement('button')
    copy.className = 'rl-btn rl-btn-primary'
    copy.innerHTML = `${ICONS.copy}<span>Copy for agent</span>`
    copy.disabled = count === 0
    copy.addEventListener('click', async () => {
      const ok = await copyText(this.store.toMarkdown())
      if (!ok) {
        this.hooks.onToast?.('Clipboard blocked by the browser')
        return
      }
      copy.classList.add('rl-copied')
      copy.innerHTML = `${ICONS.check}<span>Copied</span>`
      this.hooks.onToast?.(`${count} ${count === 1 ? 'change' : 'changes'} copied as annotation`)
      setTimeout(() => {
        copy.classList.remove('rl-copied')
        copy.innerHTML = `${ICONS.copy}<span>Copy for agent</span>`
      }, 1600)
    })
    actions.append(eye, reset, copy)
    tray.appendChild(actions)
    return tray
  }

  // ---------------------------------------------------------------- drag

  _draggable(handle) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return
      const startX = e.clientX - this._drag.x
      const startY = e.clientY - this._drag.y
      handle.setPointerCapture(e.pointerId)
      const move = (ev) => {
        this._drag.x = ev.clientX - startX
        this._drag.y = ev.clientY - startY
        this.el.style.transform = `translate(${this._drag.x}px, ${this._drag.y}px)`
      }
      const up = () => {
        handle.removeEventListener('pointermove', move)
        handle.removeEventListener('pointerup', up)
      }
      handle.addEventListener('pointermove', move)
      handle.addEventListener('pointerup', up)
    })
  }
}

function currentValue(el, prop) {
  const meta = PROP_META[prop]
  const cs = getComputedStyle(el)
  const raw = cs.getPropertyValue(meta.css)
  return meta.color ? toHex(raw) : raw
}

function nudge(value, delta, min, max) {
  const n = parseFloat(value)
  if (isNaN(n)) return value
  let v = Math.round((n + delta) * 100) / 100
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return replaceNumber(value, v)
}

function replaceNumber(value, n) {
  const m = String(value).match(/-?\d*\.?\d+/)
  if (!m) return String(n)
  return String(value).replace(/-?\d*\.?\d+/, String(n))
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fall back to the legacy path (still works without the permission)
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function paintSwatch(node, value) {
  node.style.background =
    !value || value === 'transparent'
      ? 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 8px 8px'
      : value
}
