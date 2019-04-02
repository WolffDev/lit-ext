/**
 * module inspired by: https://github.com/JensPLarsen/ChromeExtension-GoogleDocsUtil
 * and old extension
 */
import RangeAtIndex from 'range-at-index'
import $ from '../../vendor/jquery-position-relative'
import env from '../env'
import rangy from '../rangy'
import Player from '../player'
import clientManager from '../client-manager'

const player = new Player()

const getFullStopRegExp = /((\.)\s*([A-ZÆØÅÄÖ]|\n|\")|((\!|\?)\s+))/
const getBreakLineTagsRegExp = /^(div|p|br|li|\n|\r|\r\n)$/mgi
const endSentenceMarks = /\.|\!|\?/

let prevNode
let startNode
let sentenceHighlighRange
let selectedRangeWhenUserPressPlay

let _range = null
let wordIndex = 0
let startRange = null
let serverResponse = null
let mappingItemIndex = 0
let textNodeSymbolIndex = 0
let sentanceSymbolIndex = 0

const readingStrategies = {
  page: 1,
  sentence: 2
}
const highlightStrategies = {
  word: 1,
  sentence: 2,
  doublehighlight: 3
}
const strategy = highlightStrategies.word

// const cssApplier = rangy.createCssClassApplier('itw_sentence_highlight', {
const cssApplier = rangy.createClassApplier('itw_sentence_highlight', {
  normalize: true,
  ignoreWhiteSpace: true
})

var SelectionRange = function (startNode, startOffset, endNode, endOffset, text) {
  var self = this;

  if(!isTextNode(startNode)) {
    var nodeIterator = document.createNodeIterator(startNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

    var currentNode;
    var i = 0;

    while (i <= startOffset) {
      currentNode = nodeIterator.nextNode();
      i++;
    }

    if(currentNode && isTextNode(currentNode)) {
      startNode = currentNode;
      startOffset = 0;
    }
  }

  var _startNode;
  var _startOffset;
  var _endNode;
  var _endOffset;
  var _text;

  self.isCollapsed = function () {
    return ((self.getEndNode() === self.getStartNode()) && (self.getEndOffset() === self.getStartOffset()));
  };

  self.toString = function () {
    return (_startNode.nodeName.toString() + ":" + _startOffset.toString() + ";" + _endNode.nodeName.toString() + ":" + _endOffset.toString());
  };

  self.getStartNode = function () {
    return _startNode;
  };

  self.getStartOffset = function () {
    return _startOffset;
  };

  self.getEndNode = function () {
    return _endNode;
  };

  self.getEndOffset = function () {
    return _endOffset;
  };

  self.getText = function() {
    return _text;
  };

  var setStart = function (node, offset) {
    _startNode = isTextNode(node) ? node : document.createNodeIterator(node, NodeFilter.SHOW_TEXT).nextNode();

    if(_startNode == null) {
      _startNode = getNextTextNode(node);
    }

    _startOffset = offset;
  };

  var setEnd = function (node, offset) {
    _endNode = node;
    _endOffset = offset;
  };

  setStart(startNode, startOffset);

  if(startNode === endNode) {
    endNode = isTextNode(endNode) ? endNode : document.createNodeIterator(endNode, NodeFilter.SHOW_TEXT).nextNode();
  }

  setEnd(endNode, endOffset);
  _text = text;
};

function doRangesOverlap(x1, x2, y1, y2) {
  return x1 <= y2 && y1 <= x2
}

// The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
function containsUserCaretDom() {
  const carets = document.getElementsByClassName('kix-cursor')
  for (let i = 0; i < carets.length; i++) {

    // get cursor for user
    const nameDom = carets[i].getElementsByClassName('kix-cursor-name')

    // get name from cursor
    const name = nameDom[0].innerText

    // has no name cursor -> it means it has regular cursor
    if (name) {
      return true
    }
  }
  return false
}

function getTextInNode(startIndex, endIndex, node) {
  let start = 0
  let end = node.text.length
  if (startIndex > node.index) {
    start = startIndex - node.index
  }
  if (endIndex < node.index + node.text.length) {
    end = endIndex - node.index
  }
  return node.text.substring(start, end)
}

function createHighlightNode(left, top, width, height, highlightClass = 'dictus_highlight_node', color = '#D1E3FF') {
  const highlightNode = document.createElement('div')

  highlightNode.setAttribute('class', highlightClass)
  highlightNode.style.position = 'absolute'
  highlightNode.style.left = left + 'px'
  highlightNode.style.top = top + 'px'
  highlightNode.style.width = width + 'px'
  highlightNode.style.height = height + 'px'
  highlightNode.style.backgroundColor = color
  highlightNode.style.color = color
  // Fuzzy edges on the highlight
  highlightNode.style.boxShadow = `0px 0px 1px 1px ${color}`

  return highlightNode
}

// Index: The index on the local element
function getPositionOfIndex(index, textBlock, lineView) {

  // If index is 0 it is always the left most position of the element
  if (index === 0) {
    return 0
  }

  const text = cleanDocumentText(textBlock.innerText)
  const container = document.createElement('div')
  const letterSpans = []
  // Creates a span DOM for each letter
  for (let i = 0; i < index; i++) {
    const letterNode = document.createElement('span')
    letterNode.innerText = text[i]
    letterNode.style.cssText = textBlock.style.cssText
    // 'pre' = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
    letterNode.style.whiteSpace = 'pre'
    letterSpans.push(letterNode)
    container.appendChild(letterNode)
  }
  lineView.appendChild(container)

  const containerRect = container.getBoundingClientRect()
  const rect = letterSpans[index - 1].getBoundingClientRect()
  const leftPosition = rect.left + rect.width - containerRect.left

  // Clean up
  container.remove()
  return leftPosition
}

function getText(startIndex, endIndex, googleDocument) {
  let text = ''
  for (let i = 0; i < googleDocument.nodes.length; i++) {
    if (doRangesOverlap(startIndex, endIndex, googleDocument.nodes[i].index, googleDocument.nodes[i].index + googleDocument.nodes[i].text.length)) {
      text = text + getTextInNode(startIndex, endIndex, googleDocument.nodes[i])
    }
  }
  return text
}

function findWordAtCaret(googleDocument) {
  const line = googleDocument.text[googleDocument.caret.line]
  if (line.length === 0) {
    return {
      word: '',
      startIndex: googleDocument.caret.index,
      endIndex: googleDocument.caret.index
    }
  }

  // index of the caret on the current line
  let startIndex = googleDocument.caret.lineIndex
  let endIndex = googleDocument.caret.lineIndex

  // We are at the end of the line
  if (googleDocument.caret.lineIndex >= line.length) {
    startIndex = line.length - 1
    endIndex = line.length - 1
  }

  // Finds the start of the word
  let character = line[startIndex]

  // If we are at the end of the word, the startIndex will result in a word boundary character.
  if (isWordBoundary(character) && startIndex > 0) {
    startIndex--
    character = line[startIndex]
  }
  while (!isWordBoundary(character) && startIndex > 0) {
    startIndex--
    character = line[startIndex]
  }

  // Finds the end of the word
  character = line[endIndex]
  while (!isWordBoundary(character) && endIndex < line.length - 1) {
    endIndex++
    character = line[endIndex]
  }

  const globalStartIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + startIndex
  const globalEndIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + endIndex
  return {
    word: line.substring(startIndex, endIndex).trim(),
    startIndex: globalStartIndex,
    endIndex: globalEndIndex
  }
  // return line.substring(startIndex, endIndex).trim()
}

// check this for inspiration: https://stackoverflow.com/questions/12064972/can-i-color-certain-words-in-google-document-using-google-apps-script
function highlight(startIndex, endIndex, googleDocument) {
  for (let i = 0; i < googleDocument.nodes.length; i++) {
    let currentNode = googleDocument.nodes[i]

    // Highlight node if its index overlap with the provided index, otherwise don't
    if (!doRangesOverlap(startIndex, endIndex, currentNode.index, currentNode.index + currentNode.text.length)) {
      continue
    }

    // Only draw highlight if there is text to highlight
    const textToHighlight = getTextInNode(startIndex, endIndex, currentNode)
    if (!textToHighlight.trim()) {
      continue
    }

    const parentRect = currentNode.lineElement.getBoundingClientRect()
    const nodeRect = currentNode.node.getBoundingClientRect()
    let leftPosOffset = 0
    let rightPosOffset = nodeRect.width

    if (startIndex > currentNode.index) {
      let localIndex = startIndex - currentNode.index
      leftPosOffset = getPositionOfIndex(localIndex, currentNode.node, currentNode.lineElement)
    }

    if (endIndex < currentNode.index + currentNode.text.length) {
      rightPosOffset = getPositionOfIndex(endIndex - currentNode.index, currentNode.node, currentNode.lineElement)
    }

    const highlightNode = createHighlightNode(nodeRect.left - parentRect.left + leftPosOffset, nodeRect.top - parentRect.top, rightPosOffset - leftPosOffset, nodeRect.height)

    // insert highlight
    currentNode.lineElement.parentElement.appendChild(highlightNode)
  }
}

function highlightWordInNode(currentNode, startIndex, endIndex) {
  const parentRect = currentNode.lineElement.getBoundingClientRect()
  const nodeRect = currentNode.node.getBoundingClientRect()

  // let skip = true
  // if (skip) {
  //   return
  // }

  let leftPosOffset = 0
  let rightPosOffset = nodeRect.width

  if (startIndex > currentNode.index) {
    let localIndex = startIndex - currentNode.index
    leftPosOffset = getPositionOfIndex(localIndex, currentNode.node, currentNode.lineElement)
  }

  if (endIndex < currentNode.index + currentNode.text.length) {
    rightPosOffset = getPositionOfIndex(endIndex - currentNode.index, currentNode.node, currentNode.lineElement)
  }

  const highlightNode = createHighlightNode(nodeRect.left - parentRect.left + leftPosOffset, nodeRect.top - parentRect.top, rightPosOffset - leftPosOffset, nodeRect.height)

  // insert highlight
  currentNode.lineElement.parentElement.appendChild(highlightNode)
}

function removeHighlightNodes(root = document, className = 'dictus_highlight_node') {
  const highlightNodes = root.getElementsByClassName(className)
  let len = highlightNodes.length
  while (len > 0) {
    highlightNodes[0].parentNode.removeChild(highlightNodes[0])
    len --
  }
}

function getEvTargetIframeContentDocument (doc) {
  const docsTextEventTargetIframe = doc.getElementsByClassName('docs-texteventtarget-iframe')[0]
  if (docsTextEventTargetIframe && docsTextEventTargetIframe.contentDocument) {
    return docsTextEventTargetIframe.contentDocument
  }
}

function delayMethod (method, delay) {
  return setTimeout(method, delay)
}

function runHighlighter (_googleDoc, startLineIndex = 0, endLineIdx) {
  const googleDoc = _googleDoc || getGoogleDocument()
  console.log(googleDoc)

  if (typeof startLineIndex === 'undefined') {
    startLineIndex = 0
  }
  if (typeof endLineIdx === 'undefined') {
    endLineIdx = googleDoc.nodes.length
  }

  // remove all highlights
  removeHighlightNodes()

  for(let i=startLineIndex; i<endLineIdx; i++) {
    let currentNode = googleDoc.nodes[i]
    if (currentNode.text.trim()) {
      let startIndex = 0

      // split each line into words and highlight each word
      currentNode.text.trim().split(' ').forEach(word => {
        console.log(`word to be highlighted: ${word}`)
        // highlightWordInNode(currentNode, startIndex, startIndex + word.length)
        let range = RangeAtIndex(currentNode.node, startIndex, startIndex + word.length)
        // console.log(range)

        (function() {
          const s = window.getSelection()
          if(s.rangeCount > 0) {
            s.removeAllRanges()
          }
          range.selectNode(currentNode.node)
          s.addRange(range)
          setTimeout(() => {
            s.removeAllRanges()
          }, 1000)
        })()

        startIndex += word.length + 1
        // setTimeout(() => {
        //   console.log(`word to be highlighted: ${word}`)
        // }, 1000)
      })
    }
  }

  console.log('highlighter finished')
}

// C:\development\extra\itw-extension-chrome-home\src\js\Manager\TextManager.js
// Method will always return next text node in DOM
// Second parameter is used to fix proper position when we highlight word check AudioManager.highlightNextWord
function getNextTextNode (runFrom, nodeProcessDelegate) {
  if($(runFrom).parents('div.kix-paginateddocumentplugin').length <= 0 || runFrom == null) {
    return null
  }

  if($(runFrom).parents('body').length <= 0 || runFrom == null) {
    return null
  }

  var node = $(runFrom).get(0).nextSibling
  if (node && (node.id == 'itw_panel' || node.nodeName == 'image' ||(node.className && node.className.indexOf("HiddenParagraph") > -1))) {
    node = node.parentNode.nextSibling
  }

  // ITWC-755 ExampleTests: 'highlight word' and 'highlight word and sentence' issue when selecting text
  if(node && node.nodeType === Node.COMMENT_NODE) {
    node = node.nextSibling
  }

  if (node == null) {
    return getNextTextNode($(runFrom).parent(), nodeProcessDelegate)
  }

  if(node.className == 'EOP') {
    return node
  }

  if (!isTextNode(node)) {
    if (nodeProcessDelegate != null) {
      nodeProcessDelegate(node)
    }
  }

  if (node != null) {
    while (!isTextNode(node)) {
      if (node.childNodes.length > 0 && node.nodeName != 'SCRIPT') {
        node = node.firstChild
      } else {
        return getNextTextNode(node, nodeProcessDelegate)
      }
    }
    return node
  }
  return null
}

// C:\development\extra\itw-extension-chrome-home\src\js\Manager\TextManager.js
function isTextNode(node) {
  return node != null && $(node).parents('image').length <= 0 && $(node).get(0).nodeName == '#text'
}

function getNextTextNodeIfParagraph (runFrom, nodeProcessDelegate) {
  if ($(runFrom).parents('div.kix-paginateddocumentplugin').length <= 0 || runFrom == null) {
    return null
  }

  var node = $(runFrom).get(0).nextSibling
  if (node == null) {
    return getNextTextNodeIfParagraph($(runFrom).parent(), nodeProcessDelegate)
  }

  if ($(node).hasClass('kix-paragraphrenderer')) {
    return null
  }

  if (!isTextNode(node)) {
    if (nodeProcessDelegate != null) {
      nodeProcessDelegate(node)
    }
  }

  if ($(node).text().trim() === '') {
    return getNextTextNodeIfParagraph(node, nodeProcessDelegate)
  }

  if (node != null) {
    while (!isTextNode(node)) {
      if (node.childNodes.length > 0) {
        node = node.firstChild
      } else {
        return getNextTextNode(node, nodeProcessDelegate)
      }
    }
    return node
  }
  return null
}

// inspired from C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
class SelectionRangeWrong {
  constructor(startNode, startOffset, endNode, endOffset, text) {
    this.startNode = null
    this.startOffset = null
    this.endNode = null
    this.endOffset = null
    this.text = null

    if(!isTextNode(startNode)) {
      let nodeIterator = document.createNodeIterator(startNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)

      let currentNode
      let i = 0

      while (i <= startOffset) {
        currentNode = nodeIterator.nextNode()
        i++
      }

      if(currentNode && isTextNode(currentNode)) {
        startNode = currentNode
        startOffset = 0
      }
    }

    this.startNode = isTextNode(startNode) ? startNode : document.createNodeIterator(startNode, NodeFilter.SHOW_TEXT).nextNode()
    if(this.startNode == null) {
      this.startNode = getNextTextNode(startNode)
    }
    this.startOffset = startOffset

    if(startNode === endNode) {
      this.endNode = isTextNode(endNode) ? endNode : document.createNodeIterator(endNode, NodeFilter.SHOW_TEXT).nextNode()
    }

    this.text = text
    this.endNode = endNode
    this.endOffset = endOffset
  }

  isCollapsed() {
    return (this.endNode === this.startNode) && (this.endOffset === this.startOffset)
  }

  toString() {
    return this.startNode.nodeName.toString() + ':' + this.startOffset.toString() + ';' + this.endNode.nodeName.toString() + ':' + this.endOffset.toString()
  }

  getStartNode() {
    return this.startNode
  }

  getStartOffset() {
    return this.startOffset
  }

  getEndNode() {
    return this.endNode
  }

  getEndOffset() {
    return this.endOffset
  }

  getText() {
    return this.text
  }
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function setSelection(startNode, startOffset, endNode, endOffset, dontAddRange) {
  const selection = window.getSelection()
  selection.removeAllRanges()
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  if (endNode) {
    range.setEnd(endNode, endNode.length < endOffset ? endNode.length : endOffset)
  } else {
    endNode = startNode
    endOffset = startOffset
    range.setEnd(startNode, startOffset)
  }

  if(dontAddRange == null) {
    selection.addRange(range)
  }

  return new SelectionRange(startNode, startOffset, endNode, endOffset)
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function isEqualRanges (range1, range2) {
  var res = false
  if (range1 && range2) {
    res = (range1.getStartNode() == range2.getStartNode()) && (range1.getEndNode() == range2.getEndNode()) && (range1.getStartOffset() == range2.getStartOffset()) && (range1.getEndOffset() == range2.getEndOffset())
  }
  return res
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function setCursorPosition(startTextNode, startIndex, endTextNode, endIndex, dontAddRange) {
  const currentRange = setSelection(startTextNode, startIndex, endTextNode, endIndex, dontAddRange)
  if (currentRange && !isEqualRanges(currentRange, _range)) {
    _range = currentRange
    if (_range.isCollapsed()) {
      console.log('PubSub.publish(Events.loadWords, null);')
    } else {
      console.log('PubSub.publish(Events.removeWords, null);')
    }
  }
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function getNodeIndex(element, right) {
  if(element && element.length <= 0) {
    return
  }

  let node = null
  let offset = null

  // TODO: replace with https://github.com/timoxley/offset
  const cursorOffset = element.offset()
  // var offsetX = (right) ? cursorOffset.left + element.width() : cursorOffset.left
  const offsetX = right ? cursorOffset.left + element[0].getBoundingClientRect().width : cursorOffset.left

  const lineviews = $('.kix-lineview')

  const currentLineView = lineviews.filter(function() {
    const lineView = $(this)
    const lineViewOffset = lineView.offset()
    const lineViewTextBlock = lineView.find('.kix-lineview-content .kix-lineview-text-block')
    return cursorOffset.top + 1 >= lineViewOffset.top && cursorOffset.top <= (lineViewTextBlock.offset().top + lineViewTextBlock.height())
  })

  const textblocks = currentLineView.find('span.kix-lineview-text-block span')

  if(textblocks.length <= 0) {
    node = currentLineView[0]
    offset = charOffset
  } else {
    const kixWordNodes = textblocks.filter(function() {
      const textblock = $(this)
      return textblock.hasClass('kix-wordhtmlgenerator-word-node')
    })
    let currentTextBlock = kixWordNodes

    if(currentTextBlock.length <= 0 || currentTextBlock.length > 1) {
      currentTextBlock = textblocks.filter(function() {
        const textblock = $(this)
        const textblockOffset = textblock.offset()
        return offsetX >= textblockOffset.left && offsetX <= textblockOffset.left + textblock.width()
      })
    }

    if(currentTextBlock.length > 1) {
      currentTextBlock = currentTextBlock.last().width(0).removeClass('goog-inline-block')
    }

    if(currentTextBlock.length > 0) {
      const currentTextBlockCopy = currentTextBlock.clone().empty()
      currentTextBlock.parent().append(currentTextBlockCopy)

      let charOffset = 0
      let n = currentTextBlock[0].childNodes[0]

      let selectionWidth = 0
      if ($('.kix-selection-overlay').length > 0) {
        selectionWidth = 1
      }

      while(Math.ceil(currentTextBlockCopy[0].getBoundingClientRect().width + currentTextBlock.offset().left + selectionWidth) < Math.ceil(offsetX)) {
        if(n.length <= charOffset && n.nextSibling != null) {
          n = n.nextSibling
        }
        if(isTextNode(n)) {
          currentTextBlockCopy[0].innerHTML = currentTextBlockCopy[0].innerHTML + n.nodeValue[charOffset]
          charOffset++
        } else {
          currentTextBlockCopy[0].innerHTML = currentTextBlockCopy[0].innerHTML + n.outerHTML
          if (n.nextSibling != null) {
            n = n.nextSibling
          }
          charOffset = 0
        }
      }

      currentTextBlockCopy.remove()
      node = n
      offset = charOffset
    } else {
      currentTextBlock = kixWordNodes.last()
      node = currentTextBlock[0].childNodes[0]
      offset = currentTextBlock.text().length

      if(!isTextNode(node)) {
        offset = 0
      }
    }
  }

  while(node && node.length < offset) {
    offset = offset - node.length
    node = node.nextSibling

    if(!isTextNode(node)) {
      offset--
      node = node.nextSibling
    }
  }

  return { node, offset }
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function convertSelectiontoSelectionRange (selection) {
  if (selection.getRangeAt && selection.rangeCount > 0) {
    var range = selection.getRangeAt(0)
    return new SelectionRange(range.startContainer, range.startOffset, range.endContainer, range.endOffset, range.toString())
  }
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function isTextualTypeEditableInput(domNode) {
  return domNode.nodeName === 'INPUT' && ['input', 'search'].indexOf(domNode.type) !== -1;
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
// TODO: change name because it actually returns a range (selection range or current range, or getActiveRange)
// function getCursorPosition() {
function getActiveRange() {
  if (_range == null || _range.isCollapsed()) {
    return convertSelectiontoSelectionRange(window.getSelection())
  }
  return _range
}

function getCurrentRange() {
  return _range
}

// C:\development\extra\itw-extension-chrome-home\src\js\Utils\CursorUtils.js
function setGoogleDocsCursor() {
  console.log('setGoogleDocsCursor')
  const cursor = $('.kix-cursor-caret').parent()
  const nodeOffset = getNodeIndex(cursor)

  const selection = $('.kix-selection-overlay')

  if(selection.length > 0) {
    const _first = selection.first()
    const _last = selection.last()
    // console.log(_first, _last)
    const selectionStartNodeOffset = getNodeIndex(_first)
    const selectionEndNodeOffset = getNodeIndex(_last, true)
    console.log(selectionStartNodeOffset, selectionEndNodeOffset)
    setCursorPosition(selectionStartNodeOffset.node, selectionStartNodeOffset.offset, selectionEndNodeOffset.node, selectionEndNodeOffset.offset, true)
  } else if (nodeOffset.node) {
    setCursorPosition(nodeOffset.node, nodeOffset.offset)
  }
}

function getActiveElement() {
  return document.activeElement
}

// inspired from C:\development\extra\itw-extension-chrome-home\src\js\Manager\TextManager.js
function isCursorPositionInTheEnd(currentRange) {
  if (!currentRange) {
    currentRange = getActiveRange()
  }
  if (currentRange) {
    let currentNode = currentRange.getEndNode();

    while (currentNode != null) {
      if(currentNode.nextSibling == null && isGoogleDocs && $(currentNode.parentElement).parents('.kix-paragraphrenderer').next().hasClass('kix-paragraphrenderer')) {
        currentNode = $(currentNode.parentElement).parents('.kix-paragraphrenderer').next()[0].childNodes[0]
      } else if(currentNode.parentElement && isGoogleDocs && currentNode.parentElement.nextElementSibling && currentNode.parentElement.nextElementSibling.childNodes.length > 0) {
        currentNode = currentNode.parentElement.nextElementSibling.childNodes[0]
      } else {
        currentNode = currentNode.nextSibling
      }

      if ($(currentNode).text().trim() != '') {
        return false
      }
    }

    // currentPosition = getActiveRange().getEndNode()
    // var currentPosition = getActiveRange().getEndOffset()
    // var curentNodeLength = $(getActiveRange().getEndNode()).text().replace(/\s+$/, '').length
    const currentPosition = currentRange.getEndOffset()
    const curentNodeLength = $(currentRange.getEndNode()).text().replace(/\s+$/, '').length
    if (currentPosition >= curentNodeLength) {
      return true
    }
  }
  return false
}

function showCursorCaret () {
  $('.kix-cursor-caret').css('visibility', 'visible')
}

function hideCursorCaret () {
  $('.kix-cursor-caret').css('visibility', 'hidden')
}

function toggleHighlightCss (enable) {
  if (enable) {
    $('body').addClass('itw_word_highlight');
  } else {
    $('body').removeClass('itw_word_highlight');
  }
}

function highlightNextWord () {
  var googPagesContainer = $('div.kix-appview-editor');
  if (googPagesContainer.length > 0) {
    if ($(startNode.parentElement).positionRelative(googPagesContainer).top + $(startNode.parentElement).height() >= googPagesContainer.height()) {
      var textTopOffset = $(startNode.parentElement).positionRelative(googPagesContainer).top + googPagesContainer.scrollTop();
      googPagesContainer.scrollTop(textTopOffset);
    }
  }

  var mapping = serverResponse.Mapping[mappingItemIndex];
  var textNode = null;
  var isWordMode = true;
  var startContainer = startNode;
  var startPosition = textNodeSymbolIndex;
  var textMatch = null;
  var currentText = '';
  var previoustextNodeSymbolIndex = null;
  var previousTextNode = null;
  var woMoveRight = 0;

  while (startNode && (isWordMode && sentanceSymbolIndex < mapping.text_length + mapping.text_index)) {
    if (sentanceSymbolIndex == mapping.text_index) {
      startPosition = textNodeSymbolIndex;
      startContainer = startNode;
    }

    var nodeText = $(startNode).text();

    if (nodeText.length > textNodeSymbolIndex) {
      if($.trim($(startNode).text()[textNodeSymbolIndex]) != ''){
        woMoveRight++;
      }
      currentText += $(startNode).text()[textNodeSymbolIndex];
      textMatch = (currentText).match(getFullStopRegExp);
      previousTextNode = startNode;
      previoustextNodeSymbolIndex = textNodeSymbolIndex;

      sentanceSymbolIndex++;

      if (startPosition == $(startContainer).text().length && startContainer != startNode) {
        startContainer = startNode;
        startPosition = 0;
      }

      textNodeSymbolIndex++;
    } else {
      startNode = getNextTextNode($(startNode), function (node) {
        var text = $(startContainer).text();

        if ( $(node).get(0).nodeName.match(getBreakLineTagsRegExp) ) {
          currentText += '\n';
          sentanceSymbolIndex++;
        } else if((node.nodeName === 'SPAN' && $(node).css('display') === 'inline-block' && node.previousSibling && node.previousSibling.nodeName === 'SPAN' && $(node.previousSibling).css('display') === 'inline-block') || node.nodeName === 'TD') {
          text += ' ';
          sentanceSymbolIndex++;
        }

        if ($.trim($(node).text()) == '') {
          currentText += ' ';
          sentanceSymbolIndex++;
        }
      });

      previoustextNodeSymbolIndex++;
      textNodeSymbolIndex = 0;
    }
  }

  var userPrev = (textNodeSymbolIndex == 0 && !!previousTextNode) || textMatch;

  // if (Settings.getInstance().getHIGHLIGHTSTRATEGY() == Settings.highlightStrategies.word || Settings.getInstance().getHIGHLIGHTSTRATEGY() == Settings.highlightStrategies.doublehighlight) {
  //   CursorUtils.SetCursorPosition(startContainer, startPosition, userPrev ? previousTextNode : startNode, userPrev ? previoustextNodeSymbolIndex : textNodeSymbolIndex);
  // }
  setCursorPosition(startContainer, startPosition, userPrev ? previousTextNode : startNode, userPrev ? previoustextNodeSymbolIndex : textNodeSymbolIndex)

  // if (!isCollapsedOnClickPlay) {
  //   isCollapsedOnClickPlay = true;
  // };

  mappingItemIndex++;
  if (serverResponse.Mapping.length > mappingItemIndex && player.currentTime() >= serverResponse.Mapping[mappingItemIndex].wav_end) {
    highlightNextWord();
  }
};

// callback(json.indices, json);
function playIndecies (json) {
  wordIndex = 0
  // isLoadNewFileInProgress = false
  // if (isPlaying || player.getIsPaused()) {
    mappingItemIndex = 0
    sentanceSymbolIndex = 0
    serverResponse = {
      fileinfo: json,
      Mapping: json.indices
    }
    if (serverResponse.Mapping.length > 0) {
      toggleHighlightCss(true)
      player.stop()
      highlightNextWord(serverResponse.Mapping[mappingItemIndex])
    }
    if (!player.getIsPaused()) {
      player.play(json)
    } else {
      console.log(env['MV_SERVICES_URL'])
      player.setmedia(env['MV_SERVICES_URL'] + json.ogg_url)
    }
  // }
}

// inspired from C:\development\extra\itw-extension-chrome-home\src\js\ViewModel\MainViewModel.js
function hasTextToPlay(activeRange) {
  const _activeRange = activeRange || getActiveRange()
  if (_activeRange && !_activeRange.isCollapsed()) {
    return true
  }
  return false
}

function getTextForPlay(newCycle, wasTextSelelected) {
  if (sentenceHighlighRange) {
    if (sentenceHighlighRange.isValid()) {
      cssApplier.undoToRange(sentenceHighlighRange)
      // rangy.CssClassApplier.undoToRange (sentenceHighlighRange)
    }
    sentenceHighlighRange = null
  }
  let text = ''
  /* if (newCycle) {
    // // if (MainViewModel.isSentenceFromCursor() && wasTextSelelected && !readBysentence) {
    // if (wasTextSelelected && !readBysentence) {
    //   moveCursorToStartPositionBeforePlaying();
    // } else if (isGoogle || (CursorUtils.getActiveElement().hasAttribute('contenteditable') && !wasTextSelelected)) {
    //   fixCursorPositionTostartWithWord(false);
    // }
  } else {
    if (isNextNewParagraph && navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
      customEvent = new CustomEvent('moveCursorToWordStart', { 'detail': { isNextNewParagraph: true } });
      document.getElementById("itw_predictionsmain").dispatchEvent(customEvent);
      isNextNewParagraph = false;
    }
    moveCursorToStartPositionBeforePlaying();
  } */
  let oldRange = getActiveRange()
  // normalize should be false if we are on eleve test tasks site. ITWC-787 NationalTest + Klik - flyt - klik exercise: doubleclick on box breaks the style
  // cssApplier.normalize = !($(oldRange.getStartNode()).parents('.draggable').length && isElevTestTasks);

  let currentSentenseNode = oldRange.getStartNode()
  let currentSentanseIndex = oldRange.getStartOffset()

  let diff
  let sentenseSeparator

  while (currentSentenseNode && !text.match(getFullStopRegExp) && $(currentSentenseNode).length > 0) {
    let textToAdd = ''

    if (currentSentanseIndex > 0) {
      textToAdd = $(currentSentenseNode).text().substr(currentSentanseIndex, $(currentSentenseNode).text().length)
      text = textToAdd
    } else {

      // ITWC-749 ExampleTests: 'highlight word' and 'highlight word and sentence' not correct marking on some texts
      if(currentSentenseNode.parentNode && currentSentenseNode.parentNode.className === 'note-container' && $(currentSentenseNode).text() === '×') {
        textToAdd = ' '
        text += textToAdd
      } else {
        textToAdd = $(currentSentenseNode).text()
        text += textToAdd
      }
    }

    text = text.replace(/\u200B/g, ' ')

    let textMatch = text.match(getFullStopRegExp)

    let lineBreak = ''

    // ITWC-1026
    const selectedRangeWhenUserPressPlayEndOffset = (currentSentenseNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING) ? 0 : selectedRangeWhenUserPressPlay.getEndOffset();

    if ((textMatch || (lineBreak != -1 && lineBreak != '')) && (textMatch && (selectedRangeWhenUserPressPlay && selectedRangeWhenUserPressPlayEndOffset > textMatch.index + currentSentanseIndex || !wasTextSelelected))) {

      if (!textMatch || textMatch.index < lineBreak) {
        textMatch = {}
        textMatch.index = lineBreak
      }

      diff = text.indexOf($(currentSentenseNode).text().replace(/\u200B/g, ' '))
      sentenseSeparator = text[textMatch.index];
      text = text.substr(0, textMatch.index);
      if (diff > textMatch.index) {
        currentSentanseIndex = 0;
      } else {
        currentSentanseIndex = currentSentanseIndex + (textMatch.index - diff) + 1
      }
      const separators = '.!?';
      if (separators.indexOf(sentenseSeparator) >= 0) {
        text += sentenseSeparator
      }
      if (text.trim() != '') {
        break
      } else {
        text = ''
      }
    } else if (wasTextSelelected && (currentSentenseNode == selectedRangeWhenUserPressPlay.getEndNode() || currentSentenseNode == selectedRangeWhenUserPressPlay.getEndNode().firstChild || currentSentenseNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING)) {

      // ITWC-1026
      currentSentanseIndex = (currentSentenseNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING) ? 0 : selectedRangeWhenUserPressPlay.getEndOffset();

      let nodeOffset = $(currentSentenseNode).text().length - text.length;
      text = text.substr(0, currentSentanseIndex - nodeOffset);
      prevNode = currentSentenseNode;
      break;
    } else if (wasTextSelelected && (textMatch || (lineBreak != -1 && lineBreak != ""))) {
      if (!textMatch || textMatch.index < lineBreak) {
        textMatch = {};
        textMatch.index = lineBreak;
      }

      diff = text.lastIndexOf($(currentSentenseNode).text().replace(/\u200B/g, ' '));
      sentenseSeparator = text[textMatch.index];
      // const cuttedText = text.substring(textMatch.index, text.length)
      text = text.substr(0, textMatch.index)
      if (diff > textMatch.index) {
        currentSentanseIndex = 0
      } else {
        currentSentanseIndex = currentSentanseIndex + (textMatch.index - diff) + 1
      }
      const separators = '.!?'
      if (separators.indexOf(sentenseSeparator) >= 0) {
        text += sentenseSeparator
      }
      if (text.trim() != '') {
        break
      } else {
        text = ''
      }
    } else {
      currentSentanseIndex = $(currentSentenseNode).text().length
    }

    // We need to save latest parsed node.
    prevNode = currentSentenseNode
    var selectionEndNode = null

    let isNewParagraph = false
    if (text.trim() != '') {
      const nextSentanseNode = getNextTextNodeIfParagraph(currentSentenseNode)
      if (nextSentanseNode == null) {
        isNewParagraph = true
        isNextNewParagraph = true
      }
    }

    currentSentenseNode = getNextTextNode(currentSentenseNode, node => {
      if (wasTextSelelected && node == selectedRangeWhenUserPressPlay.getEndNode()) {
        selectionEndNode = node
      }

      if ($(node).get(0).nodeName.match(getBreakLineTagsRegExp)) {
        text += '\n'
      } else if((node.nodeName === 'SPAN' && $(node).css('display') === 'inline-block' && node.previousSibling && node.previousSibling.nodeName === 'SPAN' && $(node.previousSibling).css('display') === 'inline-block') || node.nodeName === 'TD') {
        text += ' '
      }

      // fix for justify in google docs
      if ($(node).text().trim() == '') {
        text += ' '
      }
    })

    if (selectionEndNode) {
      currentSentenseNode = selectionEndNode
    }

    if (isNewParagraph) {
      isNewParagraph = false
      if (currentSentenseNode) {
        currentSentanseIndex = 0
        text += ' '
      } else {
        currentSentenseNode = prevNode
      }
      break
    }

    if (currentSentenseNode) {
      currentSentanseIndex = 0
    } else {
      isNewParagraph = false
      currentSentenseNode = prevNode
      break
    }
  }

  if (text.replace(/\n/g, ' ') != '' && (strategy == highlightStrategies.sentence || strategy == highlightStrategies.doublehighlight) && !(isTextualTypeEditableInput(getActiveElement()) || getActiveElement().nodeName == 'TEXTAREA')) {
    sentenceHighlighRange = rangy.createRange()
    let oldRange = getActiveRange()
    sentenceHighlighRange.setStart(oldRange.getStartNode(), oldRange.getStartOffset())

    try {
      sentenceHighlighRange.setEnd(currentSentenseNode, currentSentanseIndex)
    } catch (e) {
      if (e.code == 1) {
        sentenceHighlighRange.setEnd(currentSentenseNode, 0)
      }
    }
    cssApplier.applyToRange(sentenceHighlighRange)
    setCursorPosition(oldRange.getStartNode(), oldRange.getStartOffset())
  }

  return text.replace(/\n/g, ' ').replace(/\s+$/, '').replace(/\u00a0/g, ' ').replace(/\u200B/g, '')
}

function loadFileAndPlay(newCycle, _range, wasTextSelelected, cb) {
  selectedRangeWhenUserPressPlay = getActiveRange()
  // let range = _range || getActiveRange()
  // if (range && newCycle) {
  if (newCycle) {

    // isCollapsedOnClickPlay = range.isCollapsed()
    const text = getTextForPlay(newCycle, wasTextSelelected)
    // console.log(text)

    if (typeof cb === 'function') {
      cb(text)
    }

    startRange = getActiveRange()
    startNode = startRange.getStartNode()
    // textNodeSymbolIndex = CursorUtils.GetCursorPosition().getStartOffset()
    textNodeSymbolIndex = startRange.getStartOffset()
    if (text.trim() != '') {
      if (text.trim().slice(-1).match(endSentenceMarks)) {
        // mustStopPlaying = true // not defined
      }
      hideCursorCaret()

      clientManager.speach.speak(text, true, json => {
        console.log(json)
        playIndecies(json)
        // if (callback) {
        //   callback(json.indices, json);
        // }
      })
    }
  }
}

export {
  getText,
  highlight,
  isTextNode,
  hasTextToPlay,
  getActiveRange,
  runHighlighter,
  getTextForPlay,
  findWordAtCaret,
  getNextTextNode,
  getCurrentRange,
  loadFileAndPlay,
  getActiveElement,
  setCursorPosition,
  cleanDocumentText,
  getGoogleDocument,
  setGoogleDocsCursor,
  removeHighlightNodes,
  isTextualTypeEditableInput,
  getEvTargetIframeContentDocument as getEditIframeContentDocument
}
