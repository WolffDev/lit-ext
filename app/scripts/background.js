import env from '../modules/env'
import storeCreator from '../modules/store'
import {
  getClientByName,
  loadDescriptions,
  // itwAccessIdentifier,
  // IntowordsSettingsService,
  // settingsServiceApplicationName
} from '../modules/extension-services'
import {
  removeTab,
  getCurrentTab
} from '../modules/browser-api'
import {
  INCREMENT,
  SET_SESSION_ID
} from '../modules/store/actions/types'

let speechClient = null
let timerInterval = null

const cookieName = 'mv_session_id'

/**
 * default state
 * https://mv-login.mv-nordic.com | https://online.intowords.com
 */
const sessionCookie = {
  name: cookieName,
  value: [null, null],
  domain: [
    env.MV_SERVICES_URL.replace('https://', ''),
    env.MV_LOGIN_MV_NORDIC.replace('https://', '')
  ]
}

// redux store
const store = storeCreator()

/**
 * fired when a tab is updated
 * TODO:
 * this method runs alot. check `changeInfo`
 */
function onTabsUpdated (tabId, changeInfo, tab) {
  console.log('onTabsUpdated')
  if(tab.url.indexOf(`${env.MV_LOGIN_MV_NORDIC}/mvid-login/stop.php`) >- 1){
    let state = store.getState()
    if (state.global.session_id) {
      removeTab(tab.id)
        .then(() => {
          console.log('tab removed')
        })
        .catch(err => {
          console.log('tab could not be removed', err)
        })
    }
  }
}

function checkAnswer (result) {
  if (result && result.method_result) {
    if (result.has_permission !== undefined) {
      result.value = result.has_permission
    } else if (result.value === undefined) {
      // if result.value is undefined => we have user request (use user_info)
      result.value = result.user_info
    }
    if (result.method_result.res_code == 0) {
      return result.value
    }
    return {
      error: result
    }
  } else {
    console.log(result)
  }
}

browser.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion)
})

browser.browserAction.setBadgeText({ text: 'NyExt' })

// https://developer.chrome.com/extensions/tabs#event-onUpdated
browser.tabs.onUpdated.addListener(onTabsUpdated)

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message, sender)
  const state = store.getState()
  let sessionId = state.global.session_id
  if (sessionId && message.type && message.type === 'tts') {
    switch(message.payload.action) {
      case 'speak':

        // fake async call
        setTimeout(() => {
          const result = {
            "methodname": "speak",
            "version": "1.0",
            "servicenumber": 2,
            "servicename": "tts",
            "result": {
              "method_result": {
                "res_msg": "Method call OK",
                "res_code": 0
              },
              "value": {
                "indices": [
                  {
                    "wav_start": 0.212789,
                    "wav_end": 0.398503,
                    "text_index": 0,
                    "text_length": 4
                  },
                  {
                    "wav_start": 0.398503,
                    "wav_end": 1.010249,
                    "text_index": 5,
                    "text_length": 3
                  }
                ],
                "ogg_url": "/wav/mv_da_gsh" + sessionId, // "_9eacb09a-4988-4699-a79b-ce05a7405704.ogg",
                "wav_url": "",
                "id": "mv_da_gsh" + sessionId, // "_9eacb09a-4988-4699-a79b-ce05a7405704",
                "mp3_url": ""
              }
            },
            "type": "jsonwsp/response"
          }
          sendResponse(checkAnswer(result.result))
        }, 100)
        break
    }
    return true
  }
  getCurrentTab()
    .then(tab => {
      if (!tab) {
        return console.log('no active tab!')
      }
      return browser.tabs
        .sendMessage(tab.id, message)
        .then(console.log)
        .catch(console.log)
    })
    .catch(console.log)
})

browser.cookies.onChanged.addListener(info => {
  if (info.cookie.name !== cookieName) {
    return
  }
  const cookieDomain = info.cookie.domain
  const cookieDomainIndex = sessionCookie.domain.indexOf(cookieDomain)

  if (cookieDomainIndex < 0) {
    console.error(`${cookieName} changed on domain ${cookieDomain}`)
    return true
  }

  // update session cookie values
  sessionCookie.value[cookieDomainIndex] = info.cookie.value

  let sessionId = null

  for(let i = 0; i< sessionCookie.value.length; i++) {
    if (sessionCookie.value[i]) {
      sessionId = sessionCookie.value[i]
      break
    }
  }

  store.dispatch({
    type: SET_SESSION_ID,
    payload: {
      data: sessionId
    }
  })
})

// load client descriptions
loadDescriptions()
  .then(result => {
    console.log(result)
    // settingsClient = getClientByName(IntowordsSettingsService)

    /* // update counter
    timerInterval = setInterval(() => {
      store.dispatch({
        type: INCREMENT
      })
    }, 1000) */
  })
  .catch(console.error)
