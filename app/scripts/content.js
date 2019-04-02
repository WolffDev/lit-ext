import { createUIStore } from 'redux-webext'
import whenDomReady from 'when-dom-ready'
// import initSubscriber from 'redux-subscriber'
import elementReady from 'element-ready'
import env from '../modules/env'
import { isTopFrame, /*onDocumentReady*/ } from '../modules/dom-utils'
import selectionListener from '../modules/selection-listener'
// import SpeechManager from '../modules/speech-manager'
import {
  // runHighlighter,
  hasTextToPlay,
  // getTextForPlay,
  findWordAtCaret,
  getCurrentRange,
  loadFileAndPlay,
  getGoogleDocument,
  setGoogleDocsCursor,
  removeHighlightNodes,
  // getEditIframeContentDocument,
  highlight as googleHighlight
} from '../modules/google-docs-utils'
import initKeyboardEventPolyfill from '../modules/init-keyboard-event'
// import shortcut from '../modules/shortcut'
import {
  SET_ACTIVE_SELECTION
} from '../modules/store/actions/types'
import DemoApp from '../components/demo-app'

let store = null

const appViewEditorClassName = 'kix-appview-editor'

function debounce (fn, ms = 0) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

function throttle (fn, wait) {
  let inThrottle, lastFn, lastTime
  return function() {
    const context = this,
      args = arguments
    if (!inThrottle) {
      fn.apply(context, args)
      lastTime = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFn)
      lastFn = setTimeout(function() {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args)
          lastTime = Date.now()
        }
      }, Math.max(wait - (Date.now() - lastTime), 0))
    }
  }
}

function onSelect(el, str) {
  console.log(el, str)
  if (store && str && str.trim()) {
    store.dispatch({
      type: SET_ACTIVE_SELECTION,
      payload: str
    })
  }
}

function updateSelectionStatus(status) {
  console.log(status ? 'has selection': 'does not have selection')
  hasSelection = status
}

/* function initShortcuts () {
  const shortcutOpt = {
    target: document.getElementsByClassName('docs-texteventtarget-iframe')[0].contentDocument
  }

  shortcut.remove('Ctrl+1')
  shortcut.remove('Alt+2')

  function onShortcutPress(key) {
    console.log(`key ${JSON.stringify(key)} has been pressed down!`)
  }

  shortcut.add('Ctrl+1', onShortcutPress, shortcutOpt)
  shortcut.add('Alt+2', onShortcutPress, shortcutOpt)
} */

// init keyboard event polyfill
initKeyboardEventPolyfill(window)

let hasSelection = false
const debouncedUpdateSelectionStatus = debounce(updateSelectionStatus, 100)

browser.runtime.onMessage.addListener(message => {

  // code not running inside top frame
  if (!isTopFrame()) {
    return
  }

  const googleDoc = getGoogleDocument()
  // console.log(googleDoc)

  if (message && message.type && message.type === 'LOGIN') {
    if (message.hasOwnProperty('payload')) {
      console.log(message.payload ? 'logged in' : 'logged out')
    }

    throw new Error('no message payload')
  }
  if (message && message.type && message.type === 'LOG_IN') {
    const loginUrl = env['MV_LOGIN_MV_NORDIC'] + '/mvid-login/chrome-device-login.php'
    const top = window.screen.availHeight / 2 - 250
    const left = window.screen.availWidth / 2 - 250
    window.open(loginUrl, 'login', 'height=500,width=500,top=' + top + ',left=' + left).focus()
  }
  if (message && message.type && message.type === 'GET_INFO') {
    if (hasSelection && googleDoc.selectedText.trim()) {
      console.log(`selected text: ${googleDoc.selectedText}`)
    } else {
      console.log('no selection!')
    }
    let wordAtCaret = findWordAtCaret(googleDoc)
    console.log(`word at caret ${JSON.stringify(wordAtCaret)}`)
  }
  if (message && message.type && message.type === 'HIGHLIGHT_WORD_CARET') {
    let wordAtCaret = findWordAtCaret(googleDoc)
    console.log(`word at caret ${JSON.stringify(wordAtCaret)}`)
    if (wordAtCaret.startIndex !== wordAtCaret.endIndex) {
      googleHighlight(wordAtCaret.startIndex, wordAtCaret.endIndex, googleDoc)
    }
  }
  if (message && message.type && message.type === 'REMOVE_HIGHLIGHTS') {
    removeHighlightNodes()
  }
  if (message && message.type && message.type === 'START_HIGHLIGHT') {
    // let quarterOfNodes = Math.floor(googleDoc.nodes.length / 4)
    // let startLineIdx = quarterOfNodes
    // let endLineIdx = quarterOfNodes * 3
    // let startLineIdx = 15
    // let endLineIdx = 16
    // runHighlighter(googleDoc, startLineIdx, endLineIdx)
    // runHighlighter(googleDoc)

    // const $appViewEditor = document.getElementsByClassName(`.${appViewEditorClassName}`)[0]
    // if (!$appViewEditor) {
    //   return console.log('no element')
    // }
    // let speechManager = new SpeechManager(isPlaying => {
    //   console.log(`is${isPlaying ? '' : ' not '}playing`, isPlaying)
    // })

    // if (hasTextToPlay()) {
    //   speechManager.playPause()
    // } else {
    //   speechManager.playPause()
    // }
    // speechManager.playPause()
  }
});

whenDomReady()
  .then(() => {
    // code not running inside top frame
    if (!isTopFrame()) {
      // console.log(`not top frame: ${window.location.href.substr(0, 20)} -> resume`)
      return
    }

    const stopSelectionListener = selectionListener(document, onSelect);

    /* const editIframeContentDoc = getEditIframeContentDocument(document)
    if (editIframeContentDoc) {
      editIframeContentDoc.addEventListener('keypress', evt => {
        console.log('iframe keypress: ' + evt.which)
      })
      editIframeContentDoc.addEventListener('keydown', evt => {
        console.log('keydown', keycode(evt))
      })
      editIframeContentDoc.addEventListener('focusin', evt => {
        console.log('iframe focus: ' + evt)
      })
      editIframeContentDoc.addEventListener('focusout', evt => {
        console.log('iframe blur: ' + evt)
      })
      editIframeContentDoc.addEventListener('mouseup', evt => {
        console.log('mouseup: ' + evt)
      })
    } */

    // initShortcuts();

    /* if (document.body != null) {
      let newElement = document.createElement('demo-app')
      // let newElement = document.createElement('to-do-app')
      newElement.style.position = 'fixed'
      newElement.style.left = '50px'
      newElement.style.bottom = '50px'
      newElement.style.bottom = '50px'
      newElement.style.zIndex = 9999
      newElement.setAttribute('click', 10)
      document.body.appendChild(newElement)
    } */

    ;(async () => {
      // Select the node that will be observed for mutations
      // const $targetNode = document.getElementById('some-id')
      // const $targetNode = document.getElementsByClassName('.kix-page-content-wrapper')[0]
      const $targetNode = await elementReady(`.${appViewEditorClassName}`);
      // const $targetNode = document.getElementsByClassName(`.${appViewEditorClassName}`)[0]
      // console.log($targetNode)

      if (!$targetNode) {
        throw new Error(`no element with class '${appViewEditorClassName}'`)
      }

      // `mousedown` vs `click`: https://stackoverflow.com/a/19109828/1597360
      $targetNode.addEventListener('mousedown', function (e) {
        console.log('mouse down -> mouse click')
        let skip = true
        if (skip) {
          return
        }
        setGoogleDocsCursor()
        console.log(getCurrentRange())
      })
      $targetNode.addEventListener('mouseup', function (e) {
        console.log('mouse up')



        let skip = true
        if (skip) {
          return
        }
        setTimeout(() => {
          setGoogleDocsCursor()
          // console.log(getCurrentRange().getText())
          // const activeRange = getCurrentRange()

          // TODO: remove delay. I don't think it's necessary
          setTimeout(function playText() {
            // if (hasTextToPlay(activeRange)) {
            if (hasTextToPlay()) {
              console.log('has text to play')
              loadFileAndPlay(true, null, true, str => {
                if (store && str && str.trim()) {
                  store.dispatch({
                    type: SET_ACTIVE_SELECTION,
                    payload: str
                  })
                }
              })

              // isCollapsedOnClickPlay = range.isCollapsed()
            } else {
              console.log('has no text to play')
            }
          })
        }, 100)
        // setGoogleDocsCursor()
        // console.log(getCurrentRange())
      })
      $targetNode.addEventListener('dblclick', function (e) {
        console.log('doubleclick')
      })

      var $iframe = document.getElementsByClassName('docs-texteventtarget-iframe')[0];

      if ($iframe) {
        //$iframe.contentDocument.addEventListener("keypress", mainViewModel.keyPress, false);
        $iframe.contentDocument.addEventListener('keyup', () => {
          console.log('keyup')
        // }, false);
        }, true);
      }

      // Options for the observer (which mutations to observe)
      const config = {
        // attributes: true, // observe attributes changes
        childList: true, // observe insertions and removing dom nodes
        subtree: true
      }

      // Callback function to execute when mutations are observed
      const onMutation = function(mutationsList, observer) {
        for(let mutation of mutationsList) {
          if (mutation.type == 'childList') {
            if (mutation.addedNodes.length) {

              // no selection yet
              if (!hasSelection) {
                Array.from(mutation.addedNodes).forEach(addedNode => {
                  if (addedNode.nodeName === 'DIV' && addedNode.classList.contains('kix-selection-overlay')) {
                    hasSelection = true
                  }
                })
              }
            }
            if (mutation.removedNodes.length) {
              if (hasSelection) {
                Array.from(mutation.removedNodes).forEach(removedNode => {
                  if (removedNode.nodeName === 'DIV' && removedNode.classList.contains('kix-selection-overlay')) {
                    const kixSelectionOverlayEls = $targetNode.getElementsByClassName('kix-selection-overlay')
                    if (!kixSelectionOverlayEls || kixSelectionOverlayEls.length === 0) {
                      hasSelection = false
                    }
                  }
                })
              }
            }
          }
          // } else if (mutation.type == 'attributes') {
          // cursor visible has class `docs-text-ui-cursor-blink`
          if (mutation.type == 'attributes') {
            // console.log(mutation)
            if (mutation.attributeName === 'class') {
              // if (mutation.target.nodeName === 'DIV' && mutation.target.classList.contains('docs-text-ui-cursor-blink')) {
              if (mutation.target.classList.contains('kix-cursor')) {
                if (mutation.target.classList.contains('docs-text-ui-cursor-blink')) {
                  console.log('cursor is blinking')
                } else {
                  console.log('cursor is not blinking', window.location.href)
                }
              }
              // console.log(mutation.target.classList)
            }
            // console.log('The ' + mutation.attributeName + ' attribute was modified.')
          }
        }

        // update selection status
        debouncedUpdateSelectionStatus(hasSelection)
      }

      // Create an observer instance linked to the callback function
      const observer = new MutationObserver(onMutation)

      // Start observing the target node for configured mutations
      observer.observe($targetNode, config)

      // Later, you can stop observing
      // observer.disconnect()
    })()
  })

;(async () => {
  store = await createUIStore()
  customElements.define('demo-app', DemoApp(store))
})()