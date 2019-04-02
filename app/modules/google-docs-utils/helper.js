(function (w) {
  const KEYDOWN_EVENTTYPE = 'keydown'
  const KEYPRESS_EVENTTYPE = 'keypress'

  const getEventListener = (closure, evType) => {
    let func = ''
    for(let i = 0; i<Object.getOwnPropertyNames(closure).length; i++) {
      func = Object.getOwnPropertyNames(closure)[i]
      for(let j = 0; j<Object.getOwnPropertyNames(closure[func]).length; j++){
        if(Object.getOwnPropertyNames(closure[func])[j] == evType) {
          return closure[func][evType]
        }
      }
    }
    return null
  }

  /**
   * TODO:
   * make it side effects free
   *  - pass dependencies like documentContent from outside
   * return googClosureKeyDownHandler and googClosureKeyPressHandler instead
   * rewrite for loops using maps or something similar
   */
  const initHandlers = () => {
    let docstexteventtargetiframe = document.getElementsByClassName('docs-texteventtarget-iframe')[0]
    if (!docstexteventtargetiframe || !docstexteventtargetiframe.contentDocument) {
      return
    }

    const googClosureKeyDownHandler = []
    const googClosureKeyPressHandler = []
    const documentContent = docstexteventtargetiframe.contentDocument

    for (let prop in documentContent) {
      if (prop.indexOf('closure') == 0) {
        const closure = documentContent[prop]

        let keydownListeners = getEventListener(closure, KEYDOWN_EVENTTYPE)
        if (keydownListeners) {
          for (let i = 0; i<keydownListeners.length; i++) {
            for(property in keydownListeners[i]) {
              if(keydownListeners[i][property].src == documentContent) {
                googClosureKeyDownHandler.push(keydownListeners[i][property])
                break
              }
            }
          }
        }

        let keydownListeners = getEventListener(closure, KEYPRESS_EVENTTYPE);
        if(keydownListeners){
          for (let i = 0; i<keydownListeners.length; i++) {
            for(property in keydownListeners[i]) {
              if(keydownListeners[i][property].src == documentContent) {
                googClosureKeyPressHandler.push(keydownListeners[i][property]);
                break
              }
            }
          }
        }
        break
      }
    }
  }

  // init handlers -> next tick
  setTimeout(initHandlers, 0)
})(window)