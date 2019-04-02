/**
 * Logs all actions and states after they are dispatched.
 * from: https://redux.js.org/advanced/middleware + added types
 * added types
 */
const logger = store => next => action => {
  let result
  console.group(action.type)
  console.info('payload', action)
  try {
    result = next(action)
  } catch (err) {
    console.error(err)
    console.error('middleware error', action, store.getState())
  }
  console.log('next state', store.getState())
  console.groupEnd()
  return result
}

export default logger
