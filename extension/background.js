// Toolbar click injects (or re-injects, which toggles) the inspector.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:|^file:/.test(tab.url || '')) return
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['redline.js'],
  })
})
