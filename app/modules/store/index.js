import { createStore, applyMiddleware } from 'redux'
import { createBackgroundStore } from 'redux-webext'
import thunk from 'redux-thunk'
import loggerMiddleware from './middleware/logger'
import rootReducer from './reducers'
import {
  INCREMENT,
  SET_ACTIVE_SELECTION
} from './actions/types'

function increment() {
  return {
    type: INCREMENT
  }
}
function setSelection(payload) {
  return {
    type: SET_ACTIVE_SELECTION,
    payload: payload.payload
  }
}

export default () => {

  // real redux store
  const reduxStore = createStore(
    rootReducer,
    applyMiddleware(
      thunk, // .withExtraArgument({ browser: browserApi }),
      loggerMiddleware,
    )
  )

  // redux webext store
  const webextStore = createBackgroundStore({
    store: reduxStore,
    actions: {
      [INCREMENT]: increment,
      [SET_ACTIVE_SELECTION]: setSelection
    }
  })
  return webextStore
}