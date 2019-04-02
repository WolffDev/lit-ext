// https://github.com/bmcmahen/on-select
import isModifier from './is-modifier'
import event from './event'
import raf, { cancel } from './raf'
import debounce from 'debounce'

/**
 * Invoke debounced `fn(e)` when a user selects within `el`.
 */
const onSelect = (el, fn, minDelay = 500, leadingEdge = true) => {
  let debouncedMethod = debounce(fn, minDelay, leadingEdge)
  const callback = e => {
    if (isModifier(e)) return
    let id = raf(() => {
      const sel = window.getSelection()
      const str = sel.toString()
      if (str && el.contains(sel.anchorNode)) {
        debouncedMethod(e, str)
      }
      cancel(id)
    })
  }

  event.bind(window, 'mouseup', callback)
  // event.bind(window, 'touchend', callback)
  event.bind(el, 'keyup', callback)

  return () => {
    event.unbind(window, 'mouseup', callback)
    // event.unbind(window, 'touchend', callback)
    event.unbind(el, 'keyup', callback)
  }
}

export default onSelect