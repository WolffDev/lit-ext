import {
  INIT,
  REMOVE_TAB
} from '../actions/types'

const initialState = {
  // disabled: true
}

function tabsReducer(state = initialState, action) {
  let tabId
  switch (action.type) {
    case INIT:
      return {
        ...state,
        [action.payload.data]: {
          init: true
        }
      }
      break
    case REMOVE_TAB:
      tabId = action.payload.data
      let cState = state
      delete cState[tabId]
      return {
        ...cState
      }
      break
    default:
      return state
  }
}

export default tabsReducer