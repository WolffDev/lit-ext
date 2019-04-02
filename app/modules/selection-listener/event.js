// https://github.com/component/event
let bind, unbind, prefix;

function detect () {
  bind = window.addEventListener ? 'addEventListener' : 'attachEvent';
  unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent';
  prefix = bind !== 'addEventListener' ? 'on' : '';
}

export default {

  /**
   * Bind `el` event `type` to `fn`.
   *
   * @param {Element} el
   * @param {String} type
   * @param {Function} fn
   * @param {Boolean} capture
   * @return {Function}
   * @api public
   */
  bind: (el, type, fn, capture) => {
    if (!bind) detect();
    el[bind](prefix + type, fn, capture || false);
    return fn;
  },


  /**
   * Unbind `el` event `type`'s callback `fn`.
   *
   * @param {Element} el
   * @param {String} type
   * @param {Function} fn
   * @param {Boolean} capture
   * @return {Function}
   * @api public
   */
  unbind: (el, type, fn, capture) => {
    if (!unbind) detect();
    el[unbind](prefix + type, fn, capture || false);
    return fn;
  }
}