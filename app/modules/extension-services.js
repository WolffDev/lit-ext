import env from './env'
import JSONWSPClient from './jsonwsp-client'

const mv_services_url = env['MV_SERVICES_URL']
const speechDescriptionUrl = mv_services_url + env['SPEECH_DESCRIPTION_URL']
const settingDescriptionUrl = mv_services_url + env['SETTINGS_DESCRIPTION_URL']
const predictionDescriptionUrl = env['PREDICTION_DESCRIPTION_URL']
const permissionDescriptionUrl = 'https://mvid-services.mv-nordic.com/v2/UserService/jsonwsp/description'
const dictClientDescriptionUrl = 'https://dictionary.intowords.com/dictservice/DictionaryService/jsonwsp/description'
const itwAccessIdentifier = 'product.web.*.intowords.release'

const _clients = {}
const speechClient = new JSONWSPClient()
const settingsClient = new JSONWSPClient()
const predictionClient = new JSONWSPClient()
const permissionClient = new JSONWSPClient()
const dictionaryClient = new JSONWSPClient()
const dictionarySpeechClient = new JSONWSPClient()

// client names
const tts = 'tts'
const prediction = 'prediction'
const IntoWordsVS = 'IntoWordsVS'
const UserService = 'UserService'
const DictionaryService = 'DictionaryService'
const IntowordsSettingsService = 'IntowordsSettingsService'
const settingsServiceApplicationName = 'intowords'

function saveClients (clients, done) {
  // console.log(desc)
  for (let i = 0; i < clients.length; i++) {
    let currentService = clients[i]

    // save a reference to the service
    if (currentService && currentService.servicename) {
      _clients[currentService.servicename] = currentService
    }
  }
  if (done && typeof done === 'function') {
    done(clients)
  }
}

function loadDescriptions () {
  return Promise.all([
    // speechClient.loadDescription(speechDescriptionUrl),
    // settingsClient.loadDescription(settingDescriptionUrl)
    // dictionaryClient.loadDescription(dictClientDescriptionUrl)
    // predictionClient.loadDescription(predictionDescriptionUrl),
    permissionClient.loadDescription(permissionDescriptionUrl),
    dictionarySpeechClient.loadDescription(env['DICT_SPEECH_DESCRIPTION_URL'])
  ])
    .then(clientsList => {
      saveClients(clientsList)
      return clientsList
    })
}

/**
 * for: `Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod`
 * url: https://docs.google.com/document/d/1y_6jPZEoD8bf3MbRfTMrHKSeYTd9tgibbh8j9L7sFHs/edit
 *
 */
function returnSpeakIndices() {
  return {
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
            "wav_start": 0,
            "wav_end": 0.3626757369614512,
            "text_index": 0,
            "text_length": 5
          },
          {
            "wav_start": 0.3626757369614512,
            "wav_end": 0.7048072562358276,
            "text_index": 6,
            "text_length": 5
          },
          {
            "wav_start": 0.7048072562358276,
            "wav_end": 1.0503401360544218,
            "text_index": 12,
            "text_length": 5
          },
          {
            "wav_start": 1.0503401360544218,
            "wav_end": 1.2789115646258504,
            "text_index": 18,
            "text_length": 3
          },
          {
            "wav_start": 1.2789115646258504,
            "wav_end": 1.7114739229024942,
            "text_index": 22,
            "text_length": 5
          },
          {
            "wav_start": 1.9124716553287981,
            "wav_end": 2.771519274376417,
            "text_index": 28,
            "text_length": 12
          },
          {
            "wav_start": 2.771519274376417,
            "wav_end": 3.4965532879818593,
            "text_index": 41,
            "text_length": 10
          },
          {
            "wav_start": 3.4965532879818593,
            "wav_end": 3.8680725623582766,
            "text_index": 52,
            "text_length": 5
          },
          {
            "wav_start": 4.069070294784581,
            "wav_end": 4.369569160997733,
            "text_index": 58,
            "text_length": 3
          },
          {
            "wav_start": 4.369569160997733,
            "wav_end": 4.641678004535147,
            "text_index": 62,
            "text_length": 4
          },
          {
            "wav_start": 4.641678004535147,
            "wav_end": 4.973151927437642,
            "text_index": 67,
            "text_length": 7
          },
          {
            "wav_start": 4.973151927437642,
            "wav_end": 5.207845804988662,
            "text_index": 75,
            "text_length": 4
          },
          {
            "wav_start": 5.207845804988662,
            "wav_end": 5.7595011337868485,
            "text_index": 80,
            "text_length": 7
          }
        ],
        "ogg_url": "/wav/fb077790106a7605797a296f4f8e28cb6ce380d3.ogg",
        "wav_url": "",
        "id": "",
        "mp3_url": ""
      }
    },
    "type": "jsonwsp/response"
  }
}

function getAllClients () {
  return _clients
}

function getClientByName (name) {
  if (!name || typeof name !== 'string') {
    throw new Error('invalid service name')
  }
  const client =_clients[name]
  if (!client) {
    throw new Error('no client found')
  }
  return client
}

// public api
export {
  tts,
  prediction,
  IntoWordsVS,
  UserService,
  getAllClients,
  getClientByName,
  loadDescriptions,
  DictionaryService,
  itwAccessIdentifier,
  IntowordsSettingsService,
  settingsServiceApplicationName
}
