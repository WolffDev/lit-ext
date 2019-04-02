/**
 * Expose `requestAnimationFrame()`.
 */
export default window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame

/**
 * Cancel.
 */
const _cancel = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame

export const cancel = id => {
  _cancel.call(window, id)
}