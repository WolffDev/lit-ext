import { createUIStore } from 'redux-webext'
import initSubscriber from 'redux-subscriber'
import { INCREMENT } from '../modules/store/actions/types'

let store = null

const btns = document.getElementsByTagName('button')
Array.from(btns).forEach(btn => {
  btn.addEventListener('click', ev => {
    switch (ev.target.name) {
      case 'increment':
        if (store) {
          store.dispatch({
            type: INCREMENT
          })
        }
      break
      case 'login':
        browser.runtime
          .sendMessage({
            type: 'LOG_IN'
          })
          .then(console.log)
          .catch(console.log)
      break
      case 'get-info':
        browser.runtime
          .sendMessage({
            type: 'GET_INFO'
          })
          .then(console.log)
          .catch(console.log)
      break
      case 'start-highlight':
        browser.runtime
          .sendMessage({
            type: 'START_HIGHLIGHT'
          })
          .then(console.log)
          .catch(console.log)
      break
      case 'highlight-word-at-caret':
        browser.runtime
          .sendMessage({
            type: 'HIGHLIGHT_WORD_CARET'
          })
          .then(console.log)
          .catch(console.log)
      break
      case 'remove-highlights':
        browser.runtime
          .sendMessage({
            type: 'REMOVE_HIGHLIGHTS'
          })
          .then(console.log)
          .catch(console.log)
      break
    }
  })
})

async function initApp() {
  store = await createUIStore()
  const subscribe = initSubscriber(store)
  subscribe('global.counter', state => {
    document.getElementById('counter').textContent = state.global.counter
  })
}

initApp()

