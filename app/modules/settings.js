// private methods and fields
let profileId = null
let sessionId = null
let eventLoaded = []

// ************************************
let fontColorPrediction = '#000'
let availableVoices = null
let availableLangCodes = null
let settingsData = null
let topicDictionaries = null
let isDataLoaded = false

// ******** hardcoded values ************
const PREDICTION_NUMBER_OF_WORDS_SEND = 3
const PREDICTION_NUMBER_OF_WORDS_SHOW_LOWER_BOUND = 1
let PREDICTION_NUMBER_OF_WORDS_SHOW_UPPER_BOUND = 10

// ******** settings names **************
const PREDICTION_NUMBER_OF_WORDS_SHOW_NAME = 'numberOfDisplayedWords'
const NUMBER_OF_WORDS_PREDICTION_SETTING_NAME = 'numberOfWords'
const SHOW_ALTERNATIVE_SETTING_NAME = 'showAlternative'
const READ_WORDS_SETTING_NAME = 'readWords'
const VOICETYPE_TEXT_SETTING_NAME = 'voice_id'
const VOICESPEED_TEXT_SETTING_NAME = 'voiceSpeed'
const MAXWORDLENGTH_TEXT_SETTING_NAME = 'maxWordLength'
const FONTCOLOR_PREDICTION_SETTING_NAME = 'wordColor1'
const PREDICT_NEXT_WORD_PREDICTION_SETTING_NAME = 'predictNextWord'
const IS_SHORTCUTS_SHOWN_PREDICTION_SETTING_NAME = 'showShortCuts'
const IS_WORDLIST_SHOWN_PREDICTION_SETTING_NAME = 'showWordlist'
const READ_FROM_CURSOR = 'readingStrategy'
const LANGUAGE_SETTING_NAME = 'language'
const USER_LANGUAGE_SETTING_NAME = 'userLanguage'
const HIGHLIGHTSTRATEGY_TEXT_SETTING_NAME = 'highlightStrategy'
const SHOW_TOPIC_WORDS = 'showTopicWord'
const LETTERREADINGSTYLE_TEXT_SETTING_NAME = 'wordlistFontType'
const LETTER_NAME_AFTER_TYPING = 'letterName'
const LETTER_SOUND_AFTER_TYPING = 'letterSound'

const readingStrategies = {
  page: 1,
  sentance: 2
}

const highlightStrategies = {
  word: 1,
  sentance: 2,
  doublehighlight: 3
}

class Settings {
  constructor () {
    this.Domain = 'https://online.intowords.com'
    /* chrome.runtime.sendMessage({
      type: 'IntowordsSettingsService',
      payload: {
        action: 'init'
      }
    }, response => {
      console.log(response)
    }) */
  }

  /* **************** start save methods */

  saveSettingsToServer (cb) {
    sendDataToServer(cb)
  }

  saveIsWordlistShown (value, callback) {
    return updateAndSaveToServer(IS_WORDLIST_SHOWN_PREDICTION_SETTING_NAME, value, callback)
  }

  saveWordsNumberPrediction (value, callback) {
    return updateAndSaveToServer(PREDICTION_NUMBER_OF_WORDS_SHOW_NAME, value, callback)
  }

  saveHasToReadPredictionWords (value, callback) {
    return updateAndSaveToServer(READ_WORDS_SETTING_NAME, value, callback)
  }

  saveReadAfterType (value) {
    return updateAndSaveToServer(this.getReadAfterTypeKey(), value)
  }

  saveReadSentenceAfterType (value) {
    updateAndSaveToServer(this.getReadSentenceAfterTypeKey(), value)
  }

  saveReadWordAfterType (value) {
    updateAndSaveToServer(this.getReadWordAfterTypeKey(), value)
  }

  saveIsAlternativeShown (value, callback) {
    updateAndSaveToServer(SHOW_ALTERNATIVE_SETTING_NAME, value, callback)
  }

  saveVOICESPEED (value, callback) {
    updateAndSaveToServer(VOICESPEED_TEXT_SETTING_NAME, value, callback)
  }

  saveIsShortcutsShown (value, callback) {
    updateAndSaveToServer(IS_SHORTCUTS_SHOWN_PREDICTION_SETTING_NAME, value, callback)
  }

  savePredictNextWord (value, callback) {
    updateAndSaveToServer(PREDICT_NEXT_WORD_PREDICTION_SETTING_NAME, value, callback)
  }

  saveReadFromCursor (value, saveToServer, callback) {
    value = value ? readingStrategies.sentance : readingStrategies.page
    if (saveToServer) {
      updateAndSaveToServer(READ_FROM_CURSOR, value, callback)
    } else {
      updateSetting(READ_FROM_CURSOR, value)
    }
  }

  saveLETTERREADINGSTYLE (value, callback) {
    updateAndSaveToServer(LETTERREADINGSTYLE_TEXT_SETTING_NAME, value, callback)
  }

  saveLetterSoundAndLetterNameTyping (soundValue, letterValue) {
    if (settingsData.hasOwnProperty(LETTER_SOUND_AFTER_TYPING)) {
      if (settingsData[LETTER_SOUND_AFTER_TYPING] != soundValue) {
        settingsData[LETTER_SOUND_AFTER_TYPING] = soundValue
      }
    }
    if (settingsData.hasOwnProperty(LETTER_NAME_AFTER_TYPING)) {
      if (settingsData[LETTER_NAME_AFTER_TYPING] != letterValue) {
        settingsData[LETTER_NAME_AFTER_TYPING] = letterValue
      }
    }

    sendDataToServer()
  }

  saveHIGHLIGHTSTRATEGY (value, callback) {
    updateAndSaveToServer(HIGHLIGHTSTRATEGY_TEXT_SETTING_NAME, value, callback)
  }

  saveShowTopicWords (value, callback) {
    updateAndSaveToServer(SHOW_TOPIC_WORDS, value, callback)
  }

  loadSettings (callback) {
    chrome.runtime.sendMessage({
      type: 'IntowordsSettingsService',
      payload: {
        action: 'getSettings'
      }
    }, result => {
      console.error(result)

      /* alternativeColor: "#0060ff"
      backgroundColor: "#FBFAF5"
      dblClickRead: true
      highlightColor: "#ffc000"
      highlightStrategy: 1
      lang_code: "dad"
      language: "da"
      letterName: false
      letterSound: false
      maxWordLength: 99
      minAlternativeLength: 3
      minPrefixLength: 1
      minWordLength: 1
      numberOfDisplayedTopicWords: 12
      numberOfDisplayedWords: 28
      numberOfTopicWords: 12
      numberOfWords: 28
      predictNextWord: false
      readWhileTyping: false
      readWhileTypingSentence: false
      readWhileTypingWord: false
      readWords: true
      readingStrategy: 1
      showAlternative: true
      showHomophones: true
      showShortCuts: true
      showTopicWord: true
      showWordlist: false
      textAreaFont: "Lucida Sans Unicode"
      textAreaFontSize: 12
      textAreaFontType: 0
      useContext: true
      userLangCode: "dad"
      userLanguage: "da"
      voiceSpeed: 122
      voice_id: "mv_da_gsh"
      wildCards: true
      wordColor: "#000000"
      wordlistColor: "#000000"
      wordlistFont: "Lucida Sans Unicode"
      wordlistFontSize: 12
      wordlistFontType: 0 */


      settingsData = result
      isDataLoaded = true

      // this is almost duplicate with client-manager.js -> prediction -> getTopicDictionaries
      chrome.runtime.sendMessage({
        type: 'prediction',
        payload: {
          action: 'getTopicDictionaries'
        }
      }, dictResult => {
        topicDictionaries = dictResult
        onloaded()
      })

      if (callback) {
        callback()
      }
    })
  }

  loadSupportedValues (callback) {
    chrome.runtime.sendMessage({
      type: 'IntowordsSettingsService',
      payload: {
        action: 'getSupportedValues'
      }
    }, supportedValues => {
      availableVoices = supportedValues.value.voices
      // TODO: search for this into master because it's never used
      // availbaleLanguages = supportedValues.value.languages
      availableLangCodes = supportedValues.value.lang_codes
      PREDICTION_NUMBER_OF_WORDS_SHOW_UPPER_BOUND = supportedValues.value.maxNumberOfWords

      if (callback) {
        callback()
      }
    })
  }

  restoreSettings () {
    isDataLoaded = false
    chrome.runtime.sendMessage(
      {
        type: 'IntowordsSettingsService',
        payload: {
          action: 'restoreValues'
        }
      }, result => {
        settingsData = result
        isDataLoaded = true
        onloaded()
      }
    )
  }

  /* **************** end save methods */

  getSessionID () {
    return sessionId
  }

  setSessionID (value) {
    sessionId = value
  }

  getProfileID () {
    return profileId
  }

  setProfileID (value) {
    profileId = value
  }

  registerLoaded (f) {
    eventLoaded.push(f)
  }

  unregisterLoaded (f) {
    let i = eventLoaded.indexOf(f)
    while (i > -1) {
      eventLoaded.splice(i, 1)
      i = eventLoaded.indexOf(f)
    }
  }

  getPREDICTION_NUMBER_OF_WORDS_SEND () {
    return PREDICTION_NUMBER_OF_WORDS_SEND
  }

  getIsWordlistShown () {
    return getSetting(IS_WORDLIST_SHOWN_PREDICTION_SETTING_NAME)
  }

  getPosibleWordsNumberPrediction () {
    return getPosibleValues(PREDICTION_NUMBER_OF_WORDS_SHOW_NAME)
  }

  getWordsNumberPrediction () {
    return getSetting(PREDICTION_NUMBER_OF_WORDS_SHOW_NAME)
  }

  getNumberOfWordsPrediction () {
    return getSetting(NUMBER_OF_WORDS_PREDICTION_SETTING_NAME)
  }

  getHasToReadPredictionWords () {
    return getSetting(READ_WORDS_SETTING_NAME)
  }

  getReadAfterTypeKey () {
    return 'readWhileTyping'
  }

  getReadAfterType () {
    let canRead = getSetting(this.getReadAfterTypeKey())
    return canRead == null ? false : canRead
  }

  getReadSentenceAfterTypeKey () {
    return 'readWhileTypingSentence'
  }

  getReadSentenceAfterType () {
    let canRead = getSetting(this.getReadSentenceAfterTypeKey())
    return canRead == null ? true : canRead
  }

  getReadWordAfterTypeKey () {
    return 'readWhileTypingWord'
  }

  getReadWordAfterType () {
    let canRead = getSetting(this.getReadWordAfterTypeKey())
    return canRead == null ? true : canRead
  }

  getIsAlternativeShown () {
    return getSetting(SHOW_ALTERNATIVE_SETTING_NAME)
  }

  getVOICETYPE () {
    return getSetting(VOICETYPE_TEXT_SETTING_NAME)
  }

  getAvailableVoices () {
    return getPosibleValues(VOICETYPE_TEXT_SETTING_NAME)
  }

  getUserVoiceId () {
    const userLang = getSetting('userLangCode')
    const userVoice = $.grep(availableVoices, n => n.lang_code == userLang)
    return userVoice.length > 0 ? userVoice[0].voice_id : getVOICETYPE()
  }

  getUserVoiceIdByBrowserLanguage (browserLanguage) {
    let userLang = null
    switch (browserLanguage) {
      case 'da':
        userLang = 'dad'
      break
        case 'sv':
      userLang = 'sws'
        break
      case 'sw':
      userLang = 'sws'
        break
      case 'nb':
      userLang = 'non'
        break
      case 'no':
      userLang = 'non'
        break
      case 'ny':
      userLang = 'nyn'
        break
      case 'en':
      userLang = 'eng'
        break
      case 'de':
      userLang = 'ged'
        break
      case 'es':
      userLang = 'spe'
        break
      case 'du':
      userLang = 'dun'
        break
      case 'nl':
      userLang = 'dun'
        break
      case 'pl':
      userLang = 'plp'
        break
      default:
        break
    }

    const userVoice = $.grep(availableVoices, n => n.lang_code == userLang)

    return userVoice.length > 0 ? userVoice[0].voice_id : null
  }

  getAvailableLangCodes () {
    return availableLangCodes
  }

  getVOICESPEED () {
    return getSetting(VOICESPEED_TEXT_SETTING_NAME)
  }

  getMaxVolumeSpeed (voice_id) {
    let res = 100
    for (let i = 0; i < availableVoices.length; i++) {
      if (availableVoices[i].voice_id == voice_id) {
        res = availableVoices[i].max_speed
      }
    }
    return res
  }

  getMinVolumeSpeed (voice_id) {
    let res = 100
    for (let i = 0; i < availableVoices.length; i++) {
      if (availableVoices[i].voice_id == voice_id) {
        res = availableVoices[i].min_speed
      }
    }
    return res
  }

  getMAXWORDLENGTH () {
    return getSetting(MAXWORDLENGTH_TEXT_SETTING_NAME)
  }

  getIsShortcutsShown () {
    return getSetting(IS_SHORTCUTS_SHOWN_PREDICTION_SETTING_NAME)
  }

  getPredictNextWord () {
    return getSetting(PREDICT_NEXT_WORD_PREDICTION_SETTING_NAME)
  }

  getReadFromCursor () {
    return getSetting(READ_FROM_CURSOR) != readingStrategies.sentance
  }

  getLanguage () {
    return getSetting(LANGUAGE_SETTING_NAME)
  }

  getUserLanguage () {
    let lang = getSetting(USER_LANGUAGE_SETTING_NAME)
    switch(lang){
      case 'sw': lang = 'sv'
        break
      case 'no': lang = 'nn'
        break
      case 'ny': lang = 'nn'
        break
      case 'du': lang = 'nl'
        break
    }
    if (lang == 'sw') {
      lang = 'sv'
    } else if (lang == 'no') {
      lang = 'nn'
    }

    if($.inArray(lang, ['da','de','en','es','nb','nl','nn','sv']) < 0) {
      lang = 'en'
    }
    return lang
  }

  getLETTERREADINGSTYLE () {
    return getSetting(LETTERREADINGSTYLE_TEXT_SETTING_NAME)
  }

  getLetterNameTyping () {
    return getSetting(LETTER_NAME_AFTER_TYPING)
  }

  getLetterSoundTyping () {
    return getSetting(LETTER_SOUND_AFTER_TYPING)
  }

  getHIGHLIGHTSTRATEGY () {
    return getSetting(HIGHLIGHTSTRATEGY_TEXT_SETTING_NAME)
  }

  getTopicDictionaries () {
    return $.extend(true, [], topicDictionaries)
  }

  getShowTopicWords () {
    //return true;//change this when create functionality to disable specific dictionaries
    return getSetting(SHOW_TOPIC_WORDS)
  }

  getIsDataLoaded () {
    return isDataLoaded
  }

  getSettingData () {
    return settingsData
  }

  setSetting (settingName, settingValue) {
    settingsData[settingName] = settingValue
  }
}

// singleton
let settingsSingleton = new Settings()

function onloaded () {
  for (let i = 0; i < eventLoaded.length; i++) {
    if (eventLoaded[i]) {
      eventLoaded[i]()
    }
  }
}

function getSetting (settingName) {
  if (settingName == FONTCOLOR_PREDICTION_SETTING_NAME) {
    return fontColorPrediction
  }
  return isDataLoaded ? settingsData[settingName] : null
}

function getPosibleValues (settingName) {
  switch (settingName) {
    case PREDICTION_NUMBER_OF_WORDS_SHOW_NAME:
      return [
        PREDICTION_NUMBER_OF_WORDS_SHOW_LOWER_BOUND,
        PREDICTION_NUMBER_OF_WORDS_SHOW_UPPER_BOUND
      ]
    case VOICETYPE_TEXT_SETTING_NAME:
      return availableVoices
    case MAXWORDLENGTH_TEXT_SETTING_NAME:
      return [3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 99]
  }
  return null
}

function updateSetting (settingName, value) {
  settingsData[settingName] = value
}

function sendDataToServer (callback, settingName) {
  chrome.runtime.sendMessage(
    {
      type: 'IntowordsSettingsService',
      payload: {
        action: 'saveSettings',
        data: {
          settingName,
          settings: settingsData
        }
      }
    },
    result => {
      if (callback) {
        callback(result)
      }
    }
  )
}

function updateAndSaveToServer (settingName, value, callback) {
  // TODO: Delete FONTCOLOR_PREDICTION_SETTING_NAME
  if (settingName == FONTCOLOR_PREDICTION_SETTING_NAME) {
    fontColorPrediction = value
    if (callback) {
      callback()
    }
  } else {
    if (settingsData.hasOwnProperty(settingName)) {
      if (settingsData[settingName] != value) {
        settingsData[settingName] = value
        sendDataToServer(callback, settingName)
      } else {
        if (callback) {
          callback()
        }
      }
    }
  }
}

function getSettings () {
  if (settingsSingleton) {
    return settingsSingleton
  }
  settingsSingleton = new Settings()
  return settingsSingleton
}

function getSymbolRegExp () {
  return  /[A-ZÆØÅÄÖ0-9]/gi
}

function endSentenceMarks () {
  return /\.|\!|\?/
}

function getFullStopRegExp () {
  // return /((\.)\s*([A-ZÆØÅÄÖ]|\n|\")|((\!|\?)\s+))/
  return /((\.)\s*([A-ZÆØÅÄÖ]|\n|")|((!|\?)\s+))/
}

function getBreakLineTagsRegExp () {
  return /^(div|p|br|li|\n|\r|\r\n)$/mgi
}

function setSupportedValues (supportedValues) {
  availableVoices = supportedValues.availableVoices
  // TODO: search for this into master because it's never used
  // availbaleLanguages = supportedValues.value.languages
  availableLangCodes = supportedValues.availableLangCodes
  PREDICTION_NUMBER_OF_WORDS_SHOW_UPPER_BOUND = supportedValues.PREDICTION_NUMBER_OF_WORDS_SHOW_UPPER_BOUND
}

function setSettings (settings) {
  settingsData = settings
}

export {
  onloaded,
  getSetting,
  getSettings,
  setSettings,
  updateSetting,
  getSymbolRegExp,
  endSentenceMarks,
  getFullStopRegExp,
  readingStrategies,
  setSupportedValues,
  highlightStrategies,
  getBreakLineTagsRegExp
}