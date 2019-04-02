export default {
  MIVO_DA_AI: process.env['MIVO_DA_AI'],
  MIVO_SV_AI: process.env['MIVO_SV_AI'],
  MIVO_NB_AI: process.env['MIVO_NB_AI'],
  MIVO_EN_AI: process.env['MIVO_EN_AI'],
  isProduction: process.env['NODE_ENV'] === 'development',
  PDFVIEWER_URL: process.env['PDFVIEWER_URL'],
  MV_SERVICES_URL: process.env['MV_SERVICES_URL'],
  GRAMMATEKET_DA_AI: process.env['GRAMMATEKET_DA_AI'],
  MV_LOGIN_MV_NORDIC: process.env['MV_LOGIN_MV_NORDIC'],
  SPECIFIC_PREDICTIONS: process.env['SPECIFIC_PREDICTIONS'],
  PERM_DESCRIPTION_URL: process.env['PERM_DESCRIPTION_URL'],
  DICT_DESCRIPTION_URL: process.env['DICT_DESCRIPTION_URL'],
  COMMA_SUGGESTIONS_AI: process.env['COMMA_SUGGESTIONS_AI'],
  SPEECH_DESCRIPTION_URL: process.env['SPEECH_DESCRIPTION_URL'],
  SETTINGS_DESCRIPTION_URL: process.env['SETTINGS_DESCRIPTION_URL'],
  PREDICTION_DESCRIPTION_URL: process.env['PREDICTION_DESCRIPTION_URL'],
  DICT_SPEECH_DESCRIPTION_URL: process.env['DICT_SPEECH_DESCRIPTION_URL'],
  SIGNON_KEEPALIVE_SCRIPT_URL: process.env['SIGNON_KEEPALIVE_SCRIPT_URL']
}