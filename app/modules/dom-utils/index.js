
// http://youmightnotneedjquery.com/#ready
function onDocumentReady(fn) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

function isTopFrame() {
  // return (window !== window.top)
  return window.top === window.self
}

export { isTopFrame, onDocumentReady }