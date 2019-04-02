import globals from './globals'
import { $ } from './vendor-and-polyfills'
import {
  isTextNode,
  getNextTextNode
} from './text-manager'

const {
  Events,
  isGoogle,
  isGoogleDocs,
  isWordOnline,
  isElevTestTasks
} = globals

let _Range = null
const hasHtml5Api = !!window.getSelection
const inputTextualTypeArray = ['text', 'search']

function SelectionRange(startNode, startOffset, endNode, endOffset, text) {
  let _text = text
  let _endNode
  let _startNode
  let _endOffset
  let _startOffset

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

  this.isCollapsed = () => {
    return this.getEndNode() === this.getStartNode() && this.getEndOffset() === this.getStartOffset()
  }

  this.toString = () => {
    return _startNode.nodeName.toString() + ':' + _startOffset.toString() + ';' + _endNode.nodeName.toString() + ':' + _endOffset.toString()
  }

  this.getStartNode = () => {
    return _startNode
  }

  this.getStartOffset = () => {
    return _startOffset
  }

  this.getEndNode = () => {
    return _endNode
  }

  this.getEndOffset = () => {
    return _endOffset
  }

  this.getText = () => {
    return _text
  }

  function setStart(node, offset) {
    _startNode = isTextNode(node) ? node : document.createNodeIterator(node, NodeFilter.SHOW_TEXT).nextNode()

    if(_startNode == null) {
      _startNode = getNextTextNode(node)
    }

    _startOffset = offset
  }

  function setEnd(node, offset) {
    _endNode = node
    _endOffset = offset
  }

  setStart(startNode, startOffset)

  if(startNode === endNode) {
    endNode = isTextNode(endNode) ? endNode : document.createNodeIterator(endNode, NodeFilter.SHOW_TEXT).nextNode()
  }

  setEnd(endNode, endOffset)
}

function convertSelectiontoSelectionRange(selection) {
  if (selection.getRangeAt && selection.rangeCount > 0) {
    var range = selection.getRangeAt(0)
    return new SelectionRange(range.startContainer, range.startOffset, range.endContainer, range.endOffset, range.toString())
  }
}

// public api

function SaveRange(areEventsFired) {
  const currentRange = getSelection()
  if (currentRange) {
    _Range = currentRange;
    const activeElement = getActiveElement()
    const isInput = isTextualTypeEditableInput(activeElement) || activeElement.nodeName=="TEXTAREA";
    if (areEventsFired) {
      if (_Range.isCollapsed() || isWordOnline || isInput) {
        PubSub.publish(Events.loadWords, null)
      } else {
        PubSub.publish(Events.removeWords, null)
      }
    }
  }
}

function getSelection() {
  if (hasHtml5Api) {
    return convertSelectiontoSelectionRange(getActiveWindowSelection())
  }
}

function setSelection(startNode, startOffset, endNode, endOffset, dontAddRange) {
  const selection = getActiveWindowSelection()
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

function GetNodeIndex(element, right) {
  if(element.length <= 0) {
    return
  }

  let node = null
  let offset = null

  let cursorOffset = element.offset()
  let offsetX = right ? cursorOffset.left + element[0].getBoundingClientRect().width : cursorOffset.left

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
      let n = currentTextBlock[0].childNodes[0];

      let selectionWidth = 0
      if ($('.kix-selection-overlay').length > 0) {
        selectionWidth = 1
      }

      while(Math.ceil(currentTextBlockCopy[0].getBoundingClientRect().width + currentTextBlock.offset().left + selectionWidth) < Math.ceil(offsetX)) {
        if(n.length <= charOffset && n.nextSibling != null) {
          n = n.nextSibling;
        }

        if(isTextNode(n)) {
          currentTextBlockCopy[0].innerHTML = currentTextBlockCopy[0].innerHTML + n.nodeValue[charOffset];
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

function isEqualRanges(range1, range2) {
  let res = false
  if (range1 && range2) {
    res = (range1.getStartNode() == range2.getStartNode()) && (range1.getEndNode() == range2.getEndNode()) && (range1.getStartOffset() == range2.getStartOffset()) && (range1.getEndOffset() == range2.getEndOffset())
  }
  return res
}

function getActiveElement(){
  if(isGoogleDocs) {
    return document.activeElement
  }

  const activeElement = (document.activeElement.nodeName == 'IFRAME')
  ?   document.activeElement.contentWindow.document.activeElement
  :   (isElevTestTasks && document.activeElement.nodeName == 'LABEL' && document.activeElement.className == 'comma-container')
  ?  document.body
  :  document.activeElement

  return activeElement
}

function GetCursorPosition() {
  return (!isGoogle || _Range == null || _Range.isCollapsed()) && !isWordOnline ? getSelection() : _Range
}

function SetCursorPosition(startTextNode, startIndex, endTextNode, endIndex, dontAddRange) {
  let currentRange = setSelection(startTextNode, startIndex, endTextNode, endIndex, dontAddRange)
  if (currentRange) {
    if (!isEqualRanges(currentRange, _Range)) {
      _Range = currentRange
      if (_Range.isCollapsed()) {
        PubSub.publish(Events.loadWords, null)
      } else {
        PubSub.publish(Events.removeWords, null)
      }
    }
  }
}

function getSelectionRange(startNode, startOffset, endNode, endOffset) {
  return new SelectionRange(startNode, startOffset, endNode, endOffset)
}

function SetGoogleDocsCursor() {
  if(!isGoogleDocs) {
    return
  }

  let cursor = $('.kix-cursor-caret').parent()
  const nodeOffset = GetNodeIndex(cursor)

  const selection = $('.kix-selection-overlay')

  if(selection.length > 0) {
    let selectionStartNodeOffset = GetNodeIndex(selection.first())
    let selectionEndNodeOffset = GetNodeIndex(selection.last(), true)
    SetCursorPosition(selectionStartNodeOffset.node, selectionStartNodeOffset.offset, selectionEndNodeOffset.node, selectionEndNodeOffset.offset, true)
  } else if (nodeOffset.node) {
    SetCursorPosition(nodeOffset.node, nodeOffset.offset)
  }
}

function getActiveElementBody(){
  return (!isGoogleDocs && document.activeElement.nodeName == 'IFRAME') ? document.activeElement.contentWindow.document.body : document.body
}

function IsGoogleDocsCursorAfterSpace() {
  const cursorOffset = $('.kix-cursor-caret').parent().offset()
  const lineviews = $('.kix-lineview')

  const currentLineView = lineviews.filter(function() {
    const lineView = $(this)
    const lineViewOffset = lineView.offset()
    return (cursorOffset.top + 1) >= lineViewOffset.top && cursorOffset.top <= (lineViewOffset.top + lineView.find('.kix-lineview-content .kix-lineview-text-block').height())
  })

  const textblocks = currentLineView.find('span.kix-lineview-text-block span')

  if(textblocks.length > 0) {
    const currentTextBlock = textblocks.filter(function() {
      const textblock = $(this)
      const textblockOffset = textblock.offset()
      return cursorOffset.left >= textblockOffset.left && cursorOffset.left <= (textblockOffset.left + textblock[0].getBoundingClientRect().width)
    })

    if(currentTextBlock.length <= 0) {
      return true
    }
  }

  return false
}

function isTextualTypeEditableInput(activeElement){
  return activeElement.nodeName === 'INPUT' && inputTextualTypeArray.indexOf(activeElement.type) !== -1
}

function getActiveWindowSelection(){
  if(isGoogleDocs) {
    return window.getSelection()
  }

  const selection = (document.activeElement.nodeName == 'IFRAME')
  ? document.activeElement.contentWindow.document.getSelection()
  : window.getSelection()
  return selection
}

function getTextAndBoundingClientRectFromSelectionRange(selectionRange) {
  let text
  let boundingClientRect;

  const selection = getActiveWindowSelection()
  selection.removeAllRanges()
  const range = document.createRange()
  range.setStart(selectionRange.getStartNode(), selectionRange.getStartOffset())
  range.setEnd(selectionRange.getEndNode(), selectionRange.getEndOffset())
  text = range.toString()
  boundingClientRect = range.getBoundingClientRect()

  return { text, boundingClientRect }
}

const CursorUtils = {
  SaveRange,
  getSelection,
  setSelection,
  GetNodeIndex,
  isEqualRanges,
  getActiveElement,
  getSelectionRange,
  GetCursorPosition,
  SetCursorPosition,
  SetGoogleDocsCursor,
  getActiveElementBody,
  getActiveWindowSelection,
  isTextualTypeEditableInput,
  IsGoogleDocsCursorAfterSpace,
  getTextAndBoundingClientRectFromSelectionRange
}

// add getters and setters for `Range` property
Object.defineProperty(CursorUtils, 'Range', {
  get() {
    return _Range
  },
  set(value) {
    _Range = value
  }
})

// named exports
export {
  SaveRange,
  getSelection,
  setSelection,
  GetNodeIndex,
  isEqualRanges,
  getActiveElement,
  getSelectionRange,
  GetCursorPosition,
  SetCursorPosition,
  SetGoogleDocsCursor,
  getActiveElementBody,
  getActiveWindowSelection,
  isTextualTypeEditableInput,
  IsGoogleDocsCursorAfterSpace,
  getTextAndBoundingClientRectFromSelectionRange
}

export default CursorUtils

