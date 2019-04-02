import $ from '../vendor/jquery-3.3.1-custom.min'
import Player from './player'
import rangy from './rangy'
import { isTopFrame } from './dom-utils'
import {
  isTextNode,
  getActiveRange,
  getNextTextNode,
  getActiveElement,
  setCursorPosition,
  isTextualTypeEditableInput
} from './google-docs-utils'

const endSentenceMarks = /\.|\!|\?/
const getSymbolRegExp = /[A-ZÆØÅÄÖ0-9]/gi
const getFullStopRegExp = /((\.)\s*([A-ZÆØÅÄÖ]|\n|\")|((\!|\?)\s+))/
const getBreakLineTagsRegExp = /^(div|p|br|li|\n|\r|\r\n)$/mgi

function moveToNextWordInPresentation(prevWord) {
  var curNode = getPresentationCurrentTextNode();
  var i = 0;
  while (curNode && curNode == prevWord && i < 3 && $.inArray(curNode, presentationWordsList) >= 0) {
    var customEvent = new CustomEvent('moveCursorToWordStart');
    document.getElementById("itw_predictionsmain").dispatchEvent(customEvent);

    curNode = getPresentationCurrentTextNode();
    i++;
  }
  return curNode;
}

function getPresentationCurrentTextNode() {
  var predictionText = ''
  if ($('.sketchy-text-selection-overlay').length == 0) {
    var cursorRect = null
    if ($('path[stroke-opacity="0.6"]').length > 0 && $('path[stroke-opacity="0.6"]').parent().parent().find('rect').length > 1) {
      cursorRect = $('path[stroke-opacity="0.6"]').parent().parent().find('rect')[$('path[stroke-opacity="0.6"]').parent().parent().find('rect').length - 2]
    }
    if (!cursorRect) {
      return '';
    }
    isCollapsedOnClickPlay = true;
    var svg = $(cursorRect).parents('svg')[0];
    var textContainer = cursorRect.parentElement;
    var cursorX = cursorRect.getAttributeNS(null, "x") == null ? null : parseFloat(cursorRect.getAttributeNS(null, "x"));
    var cursorY = cursorRect.getAttributeNS(null, "y") == null ? null : Math.round(parseFloat(cursorRect.getAttributeNS(null, "y")));
    var cursorClientRect = cursorRect.getBoundingClientRect();
    //cursorY = cursorY - (cursorRect.parentElement.getBoundingClientRect().top - cursorRect.parentElement.parentElement.getBoundingClientRect().top);

    for (j = 0; j < $(textContainer).find("text").length; j++) {
      var val = $(textContainer).find("text")[j];
      var x = parseFloat($(val).attr("x"));
      var y = parseFloat($(val).attr("y"));
      var matrix =  getTransformToElement(val.parentElement.parentElement,cursorRect.parentElement);//val.parentElement.parentElement.getTransformToElement(cursorRect.parentElement);
      var position = svg.createSVGPoint();
      position.x = 0;
      position.y = 0;
      position = position.matrixTransform(matrix);

      x += position.x;
      y += position.y;

      if (cursorY == null || y > cursorY + 5) {
      } else {
        if (y > cursorY - val.getBBox().height / 2) {
          if (Math.round(x + parseFloat(val.getBBox().width)) >= Math.round(cursorX)) {
            return val;
          }
        }
      }
    }
  }
  return null;
}

function moveCursorToStartPositionBeforePlaying(node) {
  let _node = currentSentenceNode
  if (!isTextNode(currentSentenceNode)) {
    while (_node != null) {
      let child = $(_node).get(0).firstChild
      if (child != null) {
        _node = child
        if (isTextNode(_node)) {
          break
        }
      } else {
        _node = getNextTextNode(_node)
        break
      }
    }
  }
  let text = $(_node).text()
  let symbolFound = false

  for (let i = currentSentanseIndex; i < text.length; i++) {
    if (text[i].match(getSymbolRegExp)) {
      symbolFound = true
      break
    }
    currentSentanseIndex++
  }
  currentSentenceNode = _node
  if (symbolFound) {
    setCursorPosition($(_node).get(0), currentSentanseIndex)
  } else {
    if (_node != null) {
      setCursorPosition(_node, text.length)
    }
  }
}

function ifItsSymbolBeforeWord(symbol) {
  //return symbol == " " || symbol == "\n";
  return symbol && (symbol.charCodeAt(0) === 160 || symbol.charCodeAt(0) === 32 || symbol === '\n')
}

function firstSpacePostition(text, startIndex, isStart) {
  if (ifItsSymbolBeforeWord(text[startIndex - 1])) {
    return startIndex
  }
  if (isStart) {
    for (let i = startIndex; i < text.length; i++) {
      if (ifItsSymbolBeforeWord(text[i])) {
        return i
      }
    }
    return text.length
  }
  for (let i = startIndex; i > 0; i--) {
    if (ifItsSymbolBeforeWord(text[i])) {
      return i + 1
    }
  }
  return 0
}

function fixCursorPositionTostartWithWord(fixLeftAndRight) {
  const oldRange = getActiveRange()
  const startTextNode = oldRange.getStartNode()
  let until = null
  let untilIndex = null
  let startIndex = firstSpacePostition($(startTextNode).text(), oldRange.getStartOffset(), false)

  if (fixLeftAndRight) {
    until = oldRange.getEndNode()
    untilIndex = firstSpacePostition($(until).text(), oldRange.getEndOffset(), true)
  }

  const moveLeftCount = oldRange.getStartOffset() - startIndex + (wasTextSelelected ? 1 : 0)

  const customEvent = new CustomEvent('moveCursorLeft', {
    'detail': {
      count: moveLeftCount
    }
  })

  // TODO: fixthis soup
  document.getElementById('itw_predictionsmain').dispatchEvent(customEvent)

  setCursorPosition(startTextNode, startIndex, until, untilIndex)
}

function setCursorVisibilityForGoogleDocs(value) {
  $('.kix-cursor-caret').css('visibility', value)
}

function playIndecies(indices, json) {
  wordIndex = 0;
  isLoadNewFileInProgress = false;
  if (isPlaying || player.getIsPaused()) {
    mappingItemIndex = 0;
    sentanceSymbolIndex = 0;
    serverResponse = { fileinfo: json, Mapping: indices };
    if (serverResponse.Mapping.length > 0 && (!isGoogle || (isGoogle && isGoogleDocs) || (isGoogle && isGooglePresentation) || (isGoogle && isGoogleDrawing))) {
      toggleHighlightCss(true);
      player.stop();
      highlightNextWord(serverResponse.Mapping[mappingItemIndex]);
    }
    if (!player.getIsPaused()) {
      player.play(json);
    } else {
      player.setmedia(json);
    }
  }
};

function loadIndecies (text, callback) {
  // ClientManager.getInstance().speach.speak(text, true, function (json) {
  //   if (callback) {
  //     callback(json.indices, json)
  //   }
  // })
}

if (isTopFrame()) {
  console.log(rangy)
}
export default class SpeechManager {
  constructor (onPlayStateChanged) {
    console.log('new speech manager')
    rangy.init()
    this.cssApplier = rangy.createCssClassApplier('itw_sentence_highlight', {
      normalize: true,
      ignoreWhiteSpace: true
    })
    this.player = new Player()
    this.player.bindTimeUpdateEvent(event => {
      // const sec = event.target.currentTime
      // if (serverResponse && serverResponse.Mapping != null) {
      //   if (serverResponse.Mapping[mappingItemIndex] != null && sec >= serverResponse.Mapping[mappingItemIndex].wav_start && serverResponse.Mapping.length >= mappingItemIndex + 1) {
      //     highlightNextWord()
      //   }
      // }
      console.log('highlight next word')
    })
    this.player.bindEndPlayingEvent(event => {
      this.loadFileAndPlay(false)
      this.player.unbindTimeUpdateEvent()
    });

    this.isPlaying = false
    this.sentenceHighlighRange = null
    this.currentSentenceNode = null
    this.currentSentenceIndex = null
    this.inputTextReadingData = null
    this.isLoadNewFileInProgress = false
    this.readBysentence = true
    this.savedRange = null
    this.isCollapsedOnClickPlay = false
    this.mustStopPlaying = false
    this.selectedRangeWhenUserPressPlay = null
    this.wasTextSelelected = false
    this.startNode = null
    this.startRange = null
    this.textNodeSymbolIndex = 0
    this.onPlayStateChanged = onPlayStateChanged
  }

  get isPlaying() {
    return this.isPlaying
  }
  set isPlaying(status) {
    this.isPlaying = status
    if (typeof this.onPlayStateChanged === 'function') {
      this.onPlayStateChanged(status)
    }
  }

  onInputReadingStop () {
    if (this.inputTextReadingData.selStart != this.inputTextReadingData.selEnd) {
      this.inputTextReadingData.element.selectionStart = this.inputTextReadingData.selStart
      this.inputTextReadingData.element.selectionEnd = this.inputTextReadingData.selEnd
    } else {
      this.inputTextReadingData.element.selectionStart = this.inputTextReadingData.element.selectionEnd
      // PubSub.publish(Events.loadWords, null)
      console.log('PubSub.publish(Events.loadWords, null)')
    }
    this.inputTextReadingData = null;
  }

  getTextFromInputTextArea(element, newCycle) {
    if (newCycle || (this.inputTextReadingData && this.inputTextReadingData.endSentanceIndex < element.value.length)) {
      let text = element.value + ' '
      if (element.selectionStart >= text.length && text.slice(element.selectionStart, text.length).trim() === '') {
        element.select()
      }

      const selStart = this.inputTextReadingData ? this.inputTextReadingData.selStart : element.selectionStart
      const selEnd = this.inputTextReadingData ? this.inputTextReadingData.selEnd : element.selectionEnd
      let wordStart = selStart
      let wordEnd = text.length

      if (this.inputTextReadingData) {
        // selStart = this.inputTextReadingData.endSentanceIndex
        wordStart = this.inputTextReadingData.endSentanceIndex
      }

      // find word start when selection starts with space
      while (wordStart < text.length && !text[wordStart].match(getSymbolRegExp)) {
        wordStart++
      }

      const spaceBeforeSelStartIndex = text.substring(0, wordStart).replace(/(\r\n|\n|\r)/gm, ' ').lastIndexOf(' ')
      // update start selection to start with word
      if (spaceBeforeSelStartIndex != -1) {
        wordStart = spaceBeforeSelStartIndex + 1
      }

      if (selStart != selEnd) {
        wordEnd = selEnd;
        while (text[wordEnd - 1] == ' ') {
          wordEnd--
        }

        let spaceAfterSelEndIndex = text.substring(wordEnd, text.length).replace(/(\r\n|\n|\r)/gm, ' ').indexOf(' ')

        if (spaceAfterSelEndIndex != -1) {
          wordEnd = spaceAfterSelEndIndex + wordEnd
        }
      }

      text = text.substring(wordStart, wordEnd)
      if (!this.inputTextReadingData) {
        this.inputTextReadingData = {
          element: element,
          endSentanceIndex: 0,
          selStart: selStart,
          selEnd: selEnd
        }
      }
      this.inputTextReadingData.endSentanceIndex += wordStart - this.inputTextReadingData.endSentanceIndex
      this.inputTextReadingData.wordStart = wordStart
      const match = text.match(getFullStopRegExp)

      if (match) {
        text = text.substring(0, match.index + 1)
        this.inputTextReadingData.endSentanceIndex += match.index + 1
      } else {
        this.inputTextReadingData.endSentanceIndex += wordEnd - wordStart
      }

      return text
    } else {
      // this.inputTextReadingData = null;
      return ''
    }
  }

  getTextForPlay(newCycle) {
    const activeElement = getActiveElement()
    if (isTextualTypeEditableInput(activeElement) || activeElement.nodeName === 'TEXTAREA') {
      return this.getTextFromInputTextArea(activeElement, newCycle)
    }

    if (this.sentenceHighlighRange) {
      if (this.sentenceHighlighRange.isValid()) {
        cssApplier.undoToRange(this.sentenceHighlighRange);
      }
      this.sentenceHighlighRange = null
    }
    let text = ''
    let wordOnlineRangeModified = false
    let savedSentenceNode
    let savedSentenceIndex
    // var startContainer, startPosition
    if (newCycle) {
      // if (MainViewModel.isSentenceFromCursor()) {
      //   fixCursorPositionToStartWithSentence()
      // } else
      if (MainViewModel.isSentenceFromCursor() && isGoogleDocs && wasTextSelelected && !readBysentence) {
        moveCursorToStartPositionBeforePlaying()
      } else if (isGoogle || (activeElement.hasAttribute('contenteditable') && !wasTextSelelected)) {
        fixCursorPositionTostartWithWord(false)
      }
    } else {
      if (isGoogleDocs && isNextNewParagraph && navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        customEvent = new CustomEvent('moveCursorToWordStart', {
          'detail': {
            isNextNewParagraph: true
          }
        })
        // document.getElementById("itw_predictionsmain").dispatchEvent(customEvent)
        isNextNewParagraph = false
      }
      moveCursorToStartPositionBeforePlaying()
    }
    var oldRange = getActiveRange()
    // normalize should be false if we are on elev test tasks site. ITWC-787 NationalTest + Klik - flyt - klik exercise: doubleclick on box breaks the style
    cssApplier.normalize = !($(oldRange.getStartNode()).parents('.draggable').length && isElevTestTasks);

    if(event && event.type == 'dblclick' && oldRange.getText() == '') {
      return ''
    }

    this.currentSentenceNode = oldRange.getStartNode()
    this.currentSentenceIndex = oldRange.getStartOffset()
    var wordIsMoved = false
    while (this.currentSentenceNode && !text.match(getFullStopRegExp) && $(this.currentSentenceNode).length > 0) {
      var textToAdd = ''

      if (this.currentSentenceIndex > 0) {
        textToAdd = $(this.currentSentenceNode).text().substr(this.currentSentenceIndex, $(this.currentSentenceNode).text().length)
        text = textToAdd
      } else {
        // TODO: Remove wordIsMoved property
        if (wordIsMoved) {
          textToAdd = text.substr(0, text.length - 1) //.replace(/\s+/g, ' ')
          text = textToAdd
        }

        // ITWC-749 ExampleTests: 'highlight word' and 'highlight word and sentence' not correct marking on some texts
        if(this.currentSentenceNode.parentNode && this.currentSentenceNode.parentNode.className === 'note-container' && $(this.currentSentenceNode).text() === '×') {
          textToAdd = ' '
          text += textToAdd
        } else {
          textToAdd = $(this.currentSentenceNode).text() //.replace(/\s+/g, ' ')
          text += textToAdd
        }
      }

      wordIsMoved = false

      // clean text
      if(isGoogleDocs) {
        text = text.replace(/\u200B/g, ' ')
      }

      let textMatch = text.match(getFullStopRegExp)

      let lineBreak = ''
      // // TODO: check for side effect
      // if (MainViewModel.isSentenceFromCursor()) {
      //   // lineBreak = text.indexOf("\n");
      // }

      // ITWC-1026
      let selectedRangeWhenUserPressPlayEndOffset = (this.currentSentenscNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING) ? 0 : selectedRangeWhenUserPressPlay.getEndOffset()

      if ((textMatch || (lineBreak != -1 && lineBreak != "")) && (textMatch && (selectedRangeWhenUserPressPlay && selectedRangeWhenUserPressPlayEndOffset > textMatch.index + this.currentSentenceIndex || !wasTextSelelected))) {

        if (!textMatch || textMatch.index < lineBreak) {
          textMatch = {};
          textMatch.index = lineBreak;
        }

        var diff = text.indexOf($(this.currentSentenscNode).text().replace(/\u200B/g, ' '));
        var sentenseSeparator = text[textMatch.index];
        text = text.substr(0, textMatch.index);
        if (isWordOnline && wordOnlineSelectedNodesNumber > 0) {
          wordOnlineSelectedNodesCounter--;
        }
        if (diff > textMatch.index) {
          currentSentanseIndex = 0;
        } else {
          currentSentanseIndex = currentSentanseIndex + (textMatch.index - diff) + 1;
        }
        var separators = ".!?";
        if (separators.indexOf(sentenseSeparator) >= 0) {
          text += sentenseSeparator;
        }
        if ($.trim(text) != "") {
          break;
        } else {
          text = "";
        }
      } else if (wasTextSelelected && (currentSentanseNode == selectedRangeWhenUserPressPlay.getEndNode() || currentSentanseNode == selectedRangeWhenUserPressPlay.getEndNode().firstChild || currentSentanseNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING)) {

        // ITWC-1026
        currentSentanseIndex = (currentSentanseNode.compareDocumentPosition(selectedRangeWhenUserPressPlay.getEndNode()) === Node.DOCUMENT_POSITION_PRECEDING) ? 0 : selectedRangeWhenUserPressPlay.getEndOffset();

        var nodeOffset = $(currentSentanseNode).text().length - text.length;
        text = text.substr(0, currentSentanseIndex - nodeOffset); //.replace(/\s+/g, ' ');
        prevNode = currentSentanseNode;
        break;
      } else if (wasTextSelelected && (textMatch || (lineBreak != -1 && lineBreak != ""))) {
        if (!textMatch || textMatch.index < lineBreak) {
          textMatch = {};
          textMatch.index = lineBreak;
        }

        var diff = text.lastIndexOf($(currentSentanseNode).text().replace(/\u200B/g, ' '));
        var sentenseSeparator = text[textMatch.index];
        var cuttedText = text.substring(textMatch.index, text.length);
        text = text.substr(0, textMatch.index);//.replace(/\s+/g, ' ');
        if (isWordOnline && wordOnlineSelectedNodesNumber > 0 /* && cuttedText.match(Settings.getSymbolRegExp())*/) {
          wordOnlineSelectedNodesCounter--;
        }
        if (diff > textMatch.index) {
          currentSentanseIndex = 0;
        } else {
          currentSentanseIndex = currentSentanseIndex + (textMatch.index - diff) + 1;
        }
        var separators = ".!?";
        if (separators.indexOf(sentenseSeparator) >= 0) {
          text += sentenseSeparator;
        }
        if ($.trim(text) != "") {
          break;
        } else {
          text = "";
        }
      } else {
        currentSentanseIndex = $(currentSentanseNode).text().length;
      }

      // We need to save latest parsed node.
      prevNode = currentSentanseNode;
      var selectionEndNode = null;

      var isNewParagraph = false;
      if (isGoogleDocs && $.trim(text) != "") {
        var nextSentanseNode = TextManager.getNextTextNodeIfParagraph(currentSentanseNode);
        if (nextSentanseNode == null) {
          isNewParagraph = true;
          isNextNewParagraph = true;
        }
      }

      currentSentanseNode = TextManager.getNextTextNode(currentSentanseNode, function (node) {  // 1

          if (wasTextSelelected && node == selectedRangeWhenUserPressPlay.getEndNode()) {
            selectionEndNode = node;
          }

          if ($(node).get(0).nodeName.match(Settings.getBreakLineTagsRegExp())) {
            //if (text.substr(text.length - 1) == "-") {
            //    wordIsMoved = true;
            //} else {
            text += "\n";
            //}
          } else if((node.nodeName === 'SPAN' && $(node).css('display') === 'inline-block' && node.previousSibling && node.previousSibling.nodeName === 'SPAN' && $(node.previousSibling).css('display') === 'inline-block') || node.nodeName === 'TD') {
            text += ' ';
          }

          // fix for justify in google docs
          if ((isGoogleDocs || isWordOnline) && $.trim($(node).text()) == "") {
            text += " ";
          }
      });

      if (isWordOnline && /*!wasTextSelelected && */ currentSentanseNode && currentSentanseNode.className == "EOP") {
        //currentSentanseIndex = 0;
        break;
      }

      if (selectionEndNode) {
        currentSentanseNode = selectionEndNode;
      }

      if (isNewParagraph) {
        isNewParagraph = false;
        if (currentSentanseNode) {
          currentSentanseIndex = 0;
          if (isGoogleDocs) {
            text += " ";
          }
        } else {
          currentSentanseNode = prevNode;
        }
        break;
      }

      if (currentSentanseNode) {
        currentSentanseIndex = 0;
        //if (isGoogleDocs)//fix for justify in google docs
        //text += " ";
      } else {
        isNewParagraph = false;
        currentSentanseNode = prevNode;
        break;
      }
    }

    if (text.replace(/\n/g, ' ') != '' && (Settings.getInstance().getHIGHLIGHTSTRATEGY() == Settings.highlightStrategies.sentance || Settings.getInstance().getHIGHLIGHTSTRATEGY() == Settings.highlightStrategies.doublehighlight) && !(CursorUtils.isTextualTypeEditableInput(getActiveElement()) || getActiveElement().nodeName == "TEXTAREA")) {
      if (wordOnlineRangeModified) { // fix for Word Online range has taken place

        sentenceHighlighRange = rangy.createRange();
        sentanceHighlighRange.setStart(savedSentenceNode, savedSentenceIndex);

        try {
          sentanceHighlighRange.setEnd(currentSentanseNode, currentSentanseIndex);
        } catch (e) {
          if (e.code == 1) {
            sentanceHighlighRange.setEnd(currentSentanseNode, 0);
          }
        }
        cssApplier.applyToRange(sentanceHighlighRange);
        wordOnlineRangeModified = false;
      } else {
        sentanceHighlighRange = rangy.createRange();
        var oldRange = CursorUtils.GetCursorPosition();
        sentanceHighlighRange.setStart(oldRange.getStartNode(), oldRange.getStartOffset());

        try {
          sentanceHighlighRange.setEnd(currentSentanseNode, currentSentanseIndex);
        } catch (e) {
          if (e.code == 1) {
            sentanceHighlighRange.setEnd(currentSentanseNode, 0);
          }
        }
        cssApplier.applyToRange(sentanceHighlighRange);
        CursorUtils.SetCursorPosition(oldRange.getStartNode(), oldRange.getStartOffset());
      }
    }

    //return text.replace(/\n/g, " ").trim();

    //.replace(/\u00a0/g, " ") - replace &nbsp; with space
    //.replace(/\u200B/g, '') - remove ZERO WIDTH SPACE (unicode 8203) from string
    return text.replace(/\n/g, " ").replace(/\s+$/, '').replace(/\u00a0/g, ' ').replace(/\u200B/g, '');
  }

  loadFileAndPlay(newCycle) {
    let text
    // if (isLoadNewFileInProgress) {
    //   return;
    // }
    // isLoadNewFileInProgress = true;
    this.player.unbindEndPlayingEvent()

    // // we use it for feature which we need highlight latest played word
    // setTimeout(() => {
    //   player.bindEndPlayingEvent(() => {
    //     this.loadFileAndPlay(false)
    //   })
    // }, 200)

    // this.player.bindTimeUpdateEvent(timeupdate)
    this.player.bindTimeUpdateEvent(event => {
      const sec = event.target.currentTime
      // if (serverResponse && serverResponse.Mapping != null) {
      //   if (serverResponse.Mapping[mappingItemIndex] != null && sec >= serverResponse.Mapping[mappingItemIndex].wav_start && serverResponse.Mapping.length >= mappingItemIndex + 1) {
      //     highlightNextWord();
      //   }
      // }
    })

    this.savedRange = getActiveRange()
    if (newCycle) {
      // isCollapsedOnClickPlay = CursorUtils.GetCursorPosition().isCollapsed()
      this.isCollapsedOnClickPlay = savedRange.isCollapsed()
      text = this.getTextForPlay(newCycle)
      this.readBysentence = true
    } else if (!newCycle && MainViewModel.isSentenceFromCursor() && mustStopPlaying && !wasTextSelelected) {
      this.mustStopPlaying = false;
      this.isPlaying = false
      this.isLoadNewFileInProgress = false
      setCursorVisibilityForGoogleDocs('visible');
      if (this.sentenceHighlighRange) {
        if (this.sentenceHighlighRange.isValid()) {
          cssApplier.undoToRange(this.sentenceHighlighRange)
        }
        this.sentenceHighlighRange = null
      }

      if (!this.inputTextReadingData) {
        moveCursorToStartPositionBeforePlaying();
        this.readBysentence = prevNode == selectedRangeWhenUserPressPlay.getEndNode()
        // if (prevNode == selectedRangeWhenUserPressPlay.getEndNode()) {
        //   this.readBysentence = true;
        // } else {
        //   this.readBysentence = false;
        // }
      }
    } else {
      text = this.getTextForPlay(newCycle);
      this.readBysentence = true;
      // if (text == '') { // think about this? check.
      //   wordOnlineSelectedNodesCounter = 0
      // }
    }
    if (this.readBysentence) {
      this.startRange = getActiveRange()
      this.startNode = this.startRange.getStartNode()
      this.textNodeSymbolIndex = this.startRange.getStartOffset()
      if ($.trim(text) != '') {
        // if ($.trim(text).slice(-1).match(endSentenceMarks) && MainViewModel.isSentenceFromCursor()) {
        // TODO: test for isSentenceFromCursor()
        if ($.trim(text).slice(-1).match(endSentenceMarks)) {
          this.mustStopPlaying = true
        }
        this.isPlaying = true
        setCursorVisibilityForGoogleDocs('hidden')
        loadIndecies(text, playIndecies)
      } else {
        this.isPlaying = false
        this.isLoadNewFileInProgress = false;
        setCursorVisibilityForGoogleDocs('visible')

        if (this.inputTextReadingData) {
          this.onInputReadingStop();
        } else {
          if (this.sentenceHighlighRange) {
            if (this.sentenceHighlighRange.isValid()) {
              cssApplier.undoToRange(this.sentenceHighlighRange)
            }
            this.sentenceHighlighRange = null
          }
          toggleHighlightCss(false)
          if (this.wasTextSelelected || this.readBysentence) {
            this.savedRange = this.selectedRangeWhenUserPressPlay
          }
        }
      }
    }
  }

  playPause() {
    console.log('play pause')
    // this.readBysentence = false
    if (!this.isPlaying) {
      let range = getActiveRange()
      if (range && !this.player.getIsPaused()) {
        // if (this.readBysentence) {
        //   let activeElement = getActiveElement()
        //   if (isTextualTypeEditableInput(activeElement) || activeElement.nodeName == 'TEXTAREA') {
        //     this.wasTextSelelected = activeElement.selectionEnd > 0
        //   } else {
        //     this.wasTextSelelected = !range.isCollapsed()
        //   }
        //   // this.selectedRangeWhenUserPressPlay = getActiveRange()
        //   // this.selectedRangeWhenUserPressPlay = range
        // }
        // wordOnlineSelectedNodesCounter = 0
        this.loadFileAndPlay(true)
      }
    } else {
      // setIsPlaying(false);
      // player.pause();
      // setCursorVisibilityForGoogleDocs("visible");
      // setTimeout(function () {
      //   currentNode = CursorUtils.GetCursorPosition();
      // }, 15);
    }
  }

  // canBePlayed: function (startIndex) {
  // var start = CursorUtils.GetCursorPosition().getStartNode();

  //   while (start != null) {
  //     var text = $(start).text();
  //     if ($.trim(text.substr(startIndex, text.length - 1)) != "") {
  //       return true;
  //     }
  //     start = TextManager.getNextTextNode($(start));
  //     startIndex = 0;
  //   }
  //   return false;
  // },
  // indexForReadingPdfBySentance: function (value) {
  //   if ($.isNumeric(value)) {
  //     indexForReadingPdfBySentance = value;
  //   } else {
  //     return indexForReadingPdfBySentance;
  //   }
  // },
  // stop: function () {
  //   runStop();
  // },
  // isPlaying: function () {
  //   return isPlaying;
  // },
  // isPaused: function () {
  //   return player.getIsPaused();
  // },
  // getPlayer: function () {
  //   return player;
  // },
  // setWasTextSelected: function (val) {
  //   wasTextSelelected = val;
  // }
}