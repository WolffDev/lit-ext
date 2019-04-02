function getAllCookies (options = {}) {
  return browser.cookies.getAll(options)
}

function getCurrentTabsCookies (options = {}) {
  return getCurrentTab()
    .then(tab => {
      const _opt = Object.assign(options, { url: tab.url })
      return this.getAllCookies(_opt)
    })
}

function getCurrentTab () {
  return browser.tabs
    .query({ currentWindow: true, active: true })
    .then(tabs => {
      if (!tabs || !tabs[0]) {
        throw new Error('no active tabs!')
      }
      return tabs[0]
    })
}

function sendMessageToTab (tabId, message) {
  return browser.tabs.sendMessage(tabId, message)
}

function sendMessageToCurrentTab (message) {
  return getCurrentTab()
    .then(tab => {
      if (!tab) {
        return
      }
      // enhance message with the tabId
      if (message && !message.tabId) {
        message.tabId = tab.id
      }

      /**
       * since only one tab should be active and in the current
       * window at once the return variable should only have one entry
       */
      if (tab.id) {
        sendMessageToTab(tab.id, message).catch(err => {
          if (process.env.NODE_ENV === 'development') {
            console.log(err)
          }
        })
      }
    })
}

function removeCookie (cookie) {
  const url = 'http' + (cookie.secure ? 's' : '') + '://' + cookie.domain + cookie.path
  const { name } = cookie
  return browser.cookies.remove({ url, name })
}

function executeCode (tabId, code) {
  return browser.tabs
    .executeScript(tabId, {
      code,
      allFrames: true
    })
    .then(_ => {
      const e = browser.runtime.lastError
      if (e !== undefined) {
        console.error(`execute script error ${e}, tabId = ${tabId}, ${_}`)
      }
    })
}

function setIcon (options) {
  return browser.pageAction.setIcon(options)
}

function hidePageAction (tabId) {
  return browser.pageAction.hide(tabId)
}

function showPageAction (tabId) {
  return browser.pageAction.show(tabId)
}

function removeTab (tabId) {
  return browser.tabs.remove(tabId)
}

function getBrowserZoom (tabId) {
  return browser.tabs.getZoom(tabId)
}

function browserCaptureVisibleTabs (windowId, options) {
  return new Promise((resolve, reject) => {
    try {
      // this doesn't work when using `browser` instead of `chrome`
      chrome.tabs.captureVisibleTab(windowId, options, resolve)
    } catch (err) {
      reject(err)
    }
  })
}

export {
  setIcon,
  removeTab,
  executeCode,
  removeCookie,
  getAllCookies,
  getCurrentTab,
  getBrowserZoom,
  hidePageAction,
  showPageAction,
  getCurrentTabsCookies,
  sendMessageToCurrentTab,
  browserCaptureVisibleTabs
}
