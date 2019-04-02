import env from './env'
import { getSettings } from './settings'
import hasOggSupport from './has-ogg-support'
import { Events } from './constants'

// let versionDelegate = noop
let serviceErrorCallback = null
const noop = () => {}

const canPlayOgg = hasOggSupport()
const mv_services_url = env['MV_SERVICES_URL']
const settings_service_application_name_pdfViewer = 'pdf-viewer'
const intowords_access_identifier = 'product.web.*.intowords.release'

const aiMap = {
  daMivoAccessIdentifier: 'product.web.da.mivo.release',
  svMivoAccessIdentifier: 'product.web.sv.mivo.release',
  nbMivoAccessIdentifier: 'product.web.nb.mivo.release',
  enMivoAccessIdentifier: 'product.web.en.mivo.release',
  daGrammateketAccessIdentifier: 'product.web.da.grammarsuggestions.release',
  commaSuggestionsAccessIdentifier: 'product.web.da.commasuggestions.release'
}

function checkAnswer (result, successDelegate, errorDelegate) {
  if (result && result.method_result) {
    if (result.has_permission !== undefined) {
      result.value = result.has_permission
    } else if (result.value === undefined) {
      // if result.value is undefined => we have user request (use user_info)
      result.value = result.user_info
    }
    if (result.method_result.res_code == 0) {
      successDelegate(result.value)
    } else {
      relogin()
      if (errorDelegate) {
        errorDelegate(result.method_result, result.value)
      }
    }
  } else {
    console.log(result)
  }
}

function relogin () {
  window.PubSub.publish(Events.relogin, null)
}

function loadScript (url, callback = noop) {
  const head = document.getElementsByTagName('body')[0]
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = url
  script.onload = callback
  head.appendChild(script)
}

function loadSignonScript () {
  const settingsInstance = getSettings()
  const sessionId = settingsInstance.getSessionID()
  if (sessionId && sessionId != 'null') {
    const scriptUrl = `https://signon.mv-nordic.com/sp-tools/keep_alive?mimetype=js&mv_session_id=${sessionId}`
    loadScript(scriptUrl)
  }
}

function getAccessIdentifier (aiKey) {
  let _accessIdentifier = aiMap[aiKey]
  if (!_accessIdentifier) {
    throw new Error(`no access identifier found by key ${aiKey}`)
  }
  return _accessIdentifier
}

class ClientManager {
  constructor () {
    console.log('new client manager')

    // access identifiers
    this.daMivoAccessIdentifier = 'product.web.da.mivo.release'
    this.svMivoAccessIdentifier = 'product.web.sv.mivo.release'
    this.nbMivoAccessIdentifier = 'product.web.nb.mivo.release'
    this.enMivoAccessIdentifier = 'product.web.en.mivo.release'
    this.daGrammateketAccessIdentifier = 'product.web.da.grammarsuggestions.release'
    this.commaSuggestionsAccessIdentifier = 'product.web.da.commasuggestions.release'

    this.prediction = {
      getListOfWords (sentence, delegate) {
        chrome.runtime.sendMessage({
          type: 'prediction',
          payload: {
            data: sentence,
            action: 'GetListOfWords2'
          }
        }, result => {
          if (delegate) {
            delegate(result)
          }
        })
      },

      getTopicDictionaries (delegate) {
        chrome.runtime.sendMessage({
          type: 'prediction',
          payload: {
            data: sentence,
            action: 'GetTopicDictionaries'
          }
        }, result => {
          if (delegate) {
            delegate(result)
          }
        })
      }
    }

    this.dictionary = {
      search (searchString, dictID, delegate) {
        chrome.runtime.sendMessage({
          type: 'DictionaryService',
          payload: {
            data: {
              dictID,
              searchString
            },
            action: 'search'
          }
        }, result => {
          if (delegate) {
            delegate(result)
          }
        })
      },
      getArticle (dictID, word, key, settings, delegate, errorDelegate) {
        chrome.runtime.sendMessage({
          type: 'DictionaryService',
          payload: {
            data: {
              key,
              word,
              dictID,
              settings
            },
            action: 'getArticle'
          }
        }, result => {

          // TODO: add better error handling
          if (delegate) {
            delegate(result)
          }
        })
      },
      getDictionaries (delegate) {
        chrome.runtime.sendMessage({
          type: 'DictionaryService',
          payload: {
            action: 'getDictionaries'
          }
        }, result => {
          // TODO: add better error handling
          if (delegate) {
            delegate(result)
          }
        })
      }
    }

    this.speach = {
      speak (text, returnIndices, delegate, isUserVoiceId, voiceId) {
        const voiceSpeed = 135
        voiceId = voiceId || 'mv_en_crb' || 'mv_da_gsh' || 'nve_ror_ioana'
        chrome.runtime.sendMessage({
          type: 'tts',
          payload: {
            data: {
              voice_id: voiceId,
              return_indices: returnIndices,
              text: text.replace(/\u2019/g,"'"),
              type: canPlayOgg ? 'ogg' : 'mp3',
              voice_speed: voiceSpeed
            },
            action: 'speak'
          }
        }, result => {
          // console.log(result)
          if (delegate) {
            delegate(result)
          }
        })
      },

      getIndeces (id, delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'tts',
            payload: {
              action: 'get_indices',
              data: { id }
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      }
    }

    this.dictionarySpeach = {
      speak (language, text, delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntoWordsVS',
            payload: {
              action: 'speak',
              data: {
                text,
                type: canPlayOgg ? 'ogg': 'mp3',
                app_name: language,
              }
            }
          },
          result => {

            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      }
    }

    this.session = {
      checkSessionId () {
        const settingsInstance = getSettings()
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'checkAccess',
              data: {
                session_id: settingsInstance.getSessionID()
              }
            }
          },
          result => {
            // TODO: add better error handling
            if (result && !result.value) {
              relogin()
            }
          }
        )
      }
    }

    this.settings = {
      checkIfUserHasAccess (delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'checkAccess',
              data: {}
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      getCurrentSettings (delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'getCurrentSettings',
              data: {}
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      getProfiles (delegate) {
        let mvProfileId
        /* // not used
        chrome.runtime.sendMessage({
          mv_profile_id: {
            method: 'get'
          }
        }, noop) */
        setTimeout(() => {
          // TODO: this will never get called
          if (mvProfileId && mainViewModel.profilesInfo && mainViewModel.profilesInfo.current_profile_id == mvProfileId) {
            delegate(mainViewModel.profilesInfo)
          } else {
            chrome.runtime.sendMessage(
              {
                type: 'IntowordsSettingsService',
                payload: {
                  action: 'getProfiles',
                  data: {}
                }
              },
              result => {
                /* // TODO: add better error handling
                if (delegate) {
                  delegate(result)
                } */
                checkAnswer(result, delegate)
              }
            )
          }
        }, 100)
      },

      setProfiles (profileInfo, delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'setProfiles',
              data: {
                profile_info: profileInfo
              }
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      getSettings (delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'getSettings'
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      saveSettings (settingsData, delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'saveSettings',
              data: {
                settings: settingsData
              }
            }
          }, result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      getSupportedValues (delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'getSupportedValues'
            }
          }, result => {
            // TODO: add better error handling
            if (result.method_result.res_code == 0) {
              if (result.value != undefined && result.value != null) {
                delegate(result)
              }
            } else {
              alert(result.method_result.res_msg)
            }
          }
        )
      },

      restoreValues (delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'restoreValues'
            }
          }, result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      },

      saveSettingsForPdfViewer (profileInfo, delegate) {
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'setProfiles',
              data: {
                profile_info: profileInfo
              }
            }
          }, result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )

        const settingsInstance = getSettings()
        chrome.runtime.sendMessage(
          {
            type: 'IntowordsSettingsService',
            payload: {
              action: 'saveSettings',
              data: {
                settings: settingsInstance.getSettingData(),
                application: settings_service_application_name_pdfViewer
              }
            }
          }, result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      }
    }

    this.permission = {
      hasPermission (delegate) {
        const settingsInstance = getSettings()
        const sessionId = settingsInstance.getSessionID()
        if (sessionId && sessionId != 'null') {
          chrome.runtime.sendMessage(
            {
              type: 'UserService',
              payload: {
                action: 'hasPermission',
                data: {
                  session_id: sessionId,
                  access_identifier: intowords_access_identifier
                }
              }
            },
            result => {
              // TODO: add better error handling
              checkAnswer(result, value => {
                if (value) {
                  window.__ITW__.noUserAccess = false
                  delegate()
                } else {
                  window.__ITW__.noUserAccess = true
                  relogin()
                }
              })
            }
          )
        }
      },

      hasAppPermission (accessIdentifier, delegate) {
        const settingsInstance = getSettings()
        const sessionId = settingsInstance.getSessionID()
        chrome.runtime.sendMessage(
          {
            type: 'UserService',
            payload: {
              action: 'hasPermission',
              data: {
                session_id: sessionId,
                access_identifier: accessIdentifier
              }
            }
          },
          result => {
            // TODO: add better error handling
            checkAnswer(result, value => {
              if (delegate) {
                delegate(value)
              }
            })
          }
        )
      },

      whoAmI (delegate) {
        const settingsInstance = getSettings()
        const sessionId = settingsInstance.getSessionID()
        chrome.runtime.sendMessage(
          {
            type: 'UserService',
            payload: {
              action: 'whoami',
              data: {
                session_id: sessionId
              }
            }
          },
          result => {
            // TODO: add better error handling
            if (delegate) {
              delegate(result)
            }
          }
        )
      }
    }
  }

  // TODO: replace this using `process.env`
  getMVServicesUrl () {
    return mv_services_url
  }

  setServiceErrorCallback (errorCallback) {
    serviceErrorCallback = errorCallback
  }

  getAccessIdentifier (key) {
    const accessIdentifier = aiMap[key]
    if (!key || !accessIdentifier) {
      let err = new Error('cannot get access identifier')
      err.payload = {
        key,
        accessIdentifier
      }
      throw err
    }
    return accessIdentifier
  }

  // TODO: this is not a typo
  // rename this when renaming the method in all the files where it is used
  loadDescrioptions (callback) {
    callback()
  }

  setVersionDelegate (delegate) {
    // versionDelegate = delegate
  }
}

// setup client manager singleton
const clientManager = new ClientManager()

loadSignonScript()
setInterval(loadSignonScript, 5 * 60 * 1000)

export { checkAnswer, getAccessIdentifier }

export default clientManager