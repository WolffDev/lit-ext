import {
  INCREMENT,
  SET_SESSION_ID,
  SET_ACTIVE_TAB,
  TOGGLE_EXTENSION,
  SET_ACTIVE_SELECTION,
  SET_DESCRIPTIONS_LOADED
} from '../actions/types'

const initialState = {
  counter: 0,
  session_id: null,
  extEnabled: false,
  activeTabId: null,
  application: 'intowords', // extension-services.js -> settingServiceApplicationName
  activeSelection: '',
  descriptionsLoaded: false
}

function globalStateReducer(state = initialState, action) {
  switch (action.type) {
    case SET_ACTIVE_SELECTION:
      return {
        ...state,
        lastAction: action.type,
        activeSelection: action.payload
      }
    break
    case INCREMENT:
      return {
        ...state,
        lastAction: action.type,
        counter: state.counter + 1
      }
    break
    case SET_DESCRIPTIONS_LOADED:
      return {
        ...state,
        lastAction: action.type,
        descriptionsLoaded: action.payload.data
      }
      break
    case SET_SESSION_ID:
      return {
        ...state,
        lastAction: action.type,
        session_id: action.payload.data
      }
      break
    case TOGGLE_EXTENSION:
      let value = !state.extEnabled
      if (action.payload && action.payload.data && action.payload.data.value) {
        value = action.payload.data.value
      }
      return {
        ...state,
        lastAction: action.type,
        extEnabled: value
      }
      break
    case SET_ACTIVE_TAB:
      return {
        ...state,
        lastAction: action.type,
        activeTabId: action.payload.data
      }
      break
    default:
      // return state
      return {
        ...state,
        lastAction: action.type
      }
  }
}

export default globalStateReducer