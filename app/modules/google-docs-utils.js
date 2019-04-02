/**
 * Google Docs like to add \u200B and non breaking spaces to make sure the browser shows the text correct.
 * When getting the text, we would prefer to get clean text.
 */
function cleanDocumentText(text) {
  const nonBreakingSpaces = String.fromCharCode(160)
  const regex = new RegExp(nonBreakingSpaces, 'g')
  return text.replace(/\u200B/g, '').replace(regex, ' ')
}

function getValidCharactersRegex() {
  // return '\\wæøåÆØÅéáÉÁöÖ'
  return '\\wæøåÆØÅéáÉÁöÖșȘțȚîÎâÂăĂ'
}

function isWordBoundary(character) {
  return character.match('[' + getValidCharactersRegex() + ']') == null
}

// The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
function getCursorCaretDom() {
  const carets = document.getElementsByClassName('kix-cursor')
  for (let i = 0; i < carets.length; i++) {

    // get cursor for user
    const nameDom = carets[i].getElementsByClassName('kix-cursor-name')

    // get name from cursor
    const name = nameDom[0].innerText

    // if no name -> get cursor caret
    if (!name) {
      return carets[i].getElementsByClassName('kix-cursor-caret')[0]
    }
  }

  throw 'Could not find the users cursor'
}

// http://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
function doRectsOverlap(rectA, rectB) {
  return (
    rectA.left <= rectB.right &&
    rectA.right >= rectB.left &&
    rectA.top <= rectB.bottom &&
    rectA.bottom >= rectB.top
  )
}

/**
 * Gets the caret index on the innerText of the element.
 * caretX: The x coordinate on where the element the caret is located (0 <= caretX < )
 * element: The element on which contains the text where in the caret position is
 * simulatedElement: Doing the calculation of the caret position, we need to create a temporary DOM, the DOM will be created as a child to the simulatedElement.
 */
function getLocalCaretIndex(caretX, textBlock, lineView) {
  const text = cleanDocumentText(textBlock.innerText)

  const letterSpans = []
  const container = document.createElement('div')

  // Creates a span DOM for each letter
  for (let i = 0; i < text.length; i++) {
    const letterNode = document.createElement('span')

    // append letter into the span element
    letterNode.innerText = text[i]

    // update style
    // "pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
    letterNode.style.cssText = textBlock.style.cssText
    letterNode.style.whiteSpace = 'pre'

    // save span element
    letterSpans.push(letterNode)

    // insert span element into div container
    container.appendChild(letterNode)
  }

  // temporarily inject container into lineView
  lineView.appendChild(container)

  // get container rect
  const containerRect = container.getBoundingClientRect()

  let index = 0

  /* let maxDistance = containerRect.left + caretX
  let distance = containerRect.left
  // loop through letter spans to find out at what index our caret can be found
  for (; index < letterSpans.length; index++) {
    if (distance >= maxDistance) {

      // Clean up
      container.remove()

      return index
    }
    const letterRect = letterSpans[index].getBoundingClientRect()
    distance += letterRect.width
  } */

  // The caret is usually at the edge of the letter, we find the edge we are closest to.
  let currentMinimumDistance = -1
  for (let i = 0; i < letterSpans.length; i++) {
    const rect = letterSpans[i].getBoundingClientRect()
    const left = rect.left - containerRect.left
    const right = left + rect.width
    if (currentMinimumDistance == -1) {
      currentMinimumDistance = Math.abs(caretX - left)
    }
    const leftDistance = Math.abs(caretX - left)
    const rightDistance = Math.abs(caretX - right)

    if (leftDistance <= currentMinimumDistance) {
      index = i
      currentMinimumDistance = leftDistance
    }

    if (rightDistance <= currentMinimumDistance) {
      index = i + 1
      currentMinimumDistance = rightDistance
    }
  }

  // Clean up
  container.remove()
  return index
}

/**
 * Finds all the text and the caret position in the google docs document.
 * GoogleDocs Documents have a special structure.
 * A google document root node is a div with a class name of `kix-appview-editor`.
 * Below root node are paragraph renderers (`kix-paragraphrenderer`) which contains one lineview (`kix-lineview`).
 * Below line views are overlays (`kix-selection-overlay`)
 * Lineviews have one ore more line blocks (`kix-wordhtmlgenerator-word-node`) which contain the actual text nodes
 */
function getGoogleDocument(appRootEl) {
  let caret, caretRect
  let caretIndex = 0
  let caretLineIndex = 0
  let caretLine = 0
  let text = []
  let nodes = []
  let lineCount = 0
  let globalIndex = 0
  let selectedText = ''

  // app view editor root
  appRootEl = appRootEl || document.getElementsByClassName('kix-appview-editor') ? document.getElementsByClassName('kix-appview-editor')[0] : null
  if (!appRootEl) {
    // return console.error('no element with class name = "kix-appview-editor"!')
    return
  }

  // get paragraph renderers
  const paragraphrenderers = appRootEl.getElementsByClassName('kix-paragraphrenderer') // document.getElementsByClassName('kix-paragraphrenderer')

  if (!containsUserCaretDom()) {
    caret = getCursorCaretDom()
    caretRect = caret.getBoundingClientRect()
  }

  // loop through paragraph renderers
  for (let i = 0; i < paragraphrenderers.length; i++) {
    const lineviews = paragraphrenderers[i].getElementsByClassName('kix-lineview')
    for (let j = 0; j < lineviews.length; j++) {
      let lineText = ''
      const textBlocks = lineviews[j].getElementsByClassName('kix-wordhtmlgenerator-word-node')
      for (let k = 0; k < textBlocks.length; k++) {
        const textBlock = textBlocks[k]
        const textBlockRect = textBlock.getBoundingClientRect()

        // get caret info
        if (caretRect) {
          if (doRectsOverlap(textBlockRect, caretRect)) {
            /**
             * caretXStart
             * = 0 if caret is at the start of the text block
             * > 0 if the caret is in the middle or at the end of the text block
             */
            let caretXStart = caretRect.left - textBlockRect.left
            const localCaretIndex = getLocalCaretIndex(caretXStart, textBlock, lineviews[j])
            caretIndex = globalIndex + localCaretIndex
            caretLineIndex = lineText.length + localCaretIndex
            caretLine = lineCount
          }
        }

        const nodeText = cleanDocumentText(textBlock.innerText)

        /**
         * index - the start index of the node
         * line - the line the node is on
         * lineIndex - the start index of the node on the line
         * node - a reference to the "kix-wordhtmlgenerator-word-node" containing the actual text
         * lineElement - a reference to the "kix-lineview" which contains the node element
         * text - the text the node contains
         */
        let currentNode = {
          index: globalIndex,
          line: lineCount,
          lineIndex: lineText.length,
          node: textBlock,
          lineElement: lineviews[j],
          text: nodeText
        }

        if (nodeText.trim()) {
          currentNode.nodeRect = textBlockRect
        }

        // add node to nodes collection
        nodes.push(currentNode)

        // get all selection overlays ("native" google docs selection)
        const selectionOverlays = lineviews[j].getElementsByClassName('kix-selection-overlay')

        // update selected text
        for (let l = 0; l < selectionOverlays.length; l++) {
          const selectionOverlay = selectionOverlays[l]
          const selectionRect = selectionOverlay.getBoundingClientRect()
          if (doRectsOverlap(textBlockRect, selectionRect)) {
            const selectionStartIndex = getLocalCaretIndex(selectionRect.left - textBlockRect.left, textBlock, lineviews[j])
            const selectionEndIndex = getLocalCaretIndex(selectionRect.left + selectionRect.width - textBlockRect.left, textBlock, lineviews[j])
            let selectedTextBlock = nodeText.substring(selectionStartIndex, selectionEndIndex)
            selectedText += selectedTextBlock
          }
        }

        globalIndex += nodeText.length
        lineText += nodeText
      }

      text.push(lineText)
      lineCount++
    }
  }

  /**
   * nodes - google docs have all its text in span elements of class "kix-wordhtmlgenerator-word-node", the nodes is a list of metadata about each node
   * text - an array of strings, each string is a line in the document. Means the number of strings is the number of lines in the document
   * selectedText - contains the selected text, if no text is selected it is an empty string
   *
   */
  return {
    nodes,
    text,
    selectedText,
    caret: {
      index: caretIndex,          //index of the caret in the document
      lineIndex: caretLineIndex,  // index of the caret on the current line
      line: caretLine             // the line the caret is on
    }
  }
}

function doesRangesOverlap(x1, x2, y1, y2) {
    return x1 <= y2 && y1 <= x2;
}

// http://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
function doesRectsOverlap(RectA, RectB) {
    return RectA.left <= RectB.right && RectA.right >= RectB.left &&
        RectA.top <= RectB.bottom && RectA.bottom >= RectB.top;
}

// The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
function containsUserCaretDom() {
    var carets = document.getElementsByClassName("kix-cursor");
    for (var i = 0; i < carets.length; i++) {

        var nameDom = carets[i].getElementsByClassName("kix-cursor-name");
        var name = nameDom[0].innerText;
        if (!name) return true;
    }
    return false;
}

// The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
function getUserCaretDom() {
    var carets = document.getElementsByClassName("kix-cursor");
    for (var i = 0; i < carets.length; i++) {
        var nameDom = carets[i].getElementsByClassName("kix-cursor-name");
        var name = nameDom[0].innerText;
        if (!name) return carets[i].getElementsByClassName("kix-cursor-caret")[0];
    }

    throw 'Could not find the users cursor';
}


// Gets the caret index on the innerText of the element.
// caretX: The x coordinate on where the element the caret is located
// element: The element on which contains the text where in the caret position is
// simulatedElement: Doing the calculation of the caret position, we need to create a temporary DOM, the DOM will be created as a child to the simulatedElement.
function getLocalCaretIndex(caretX, element, simulateElement) {

    //Creates a span DOM for each letter
    var text = cleanDocumentText(element.innerText);
    var container = document.createElement("div");
    var letterSpans = [];
    for (var i = 0; i < text.length; i++) {
        var textNode = document.createElement("span");
        textNode.innerText = text[i];
        textNode.style.cssText = element.style.cssText;
        //"pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
        textNode.style.whiteSpace = "pre";
        letterSpans.push(textNode);
        container.appendChild(textNode);
    }
    simulateElement.appendChild(container);

    //The caret is usually at the edge of the letter, we find the edge we are closest to.
    var index = 0;
    var currentMinimumDistance = -1;
    var containerRect = container.getBoundingClientRect();
    for (var i = 0; i < letterSpans.length; i++) {
        var rect = letterSpans[i].getBoundingClientRect();
        var left = rect.left - containerRect.left;
        var right = left + rect.width;
        if (currentMinimumDistance == -1) {
            currentMinimumDistance = Math.abs(caretX - left);
        }
        var leftDistance = Math.abs(caretX - left);
        var rightDistance = Math.abs(caretX - right);

        if (leftDistance <= currentMinimumDistance) {
            index = i;
            currentMinimumDistance = leftDistance;
        }

        if (rightDistance <= currentMinimumDistance) {
            index = i + 1;
            currentMinimumDistance = rightDistance;
        }
    }

    //Clean up
    container.remove();
    return index;
}

function findWordAtCaret(googleDocument) {

    var line = googleDocument.text[googleDocument.caret.line];
    if (line.length == 0) return {
        word: "",
        startIndex: googleDocument.caret.index,
        endIndex: googleDocument.caret.index
    };

    var startIndex = googleDocument.caret.lineIndex;
    var endIndex = googleDocument.caret.lineIndex;

    //We are at the end of the line
    if (googleDocument.caret.lineIndex >= line.length) {
        startIndex = line.length - 1;
        endIndex = line.length - 1;
    }

    //Finds the start of the word
    var character = line[startIndex];
    //If we are at the end of the word, the startIndex will result in a word boundary character.
    if (isWordBoundary(character) && startIndex > 0) {
        startIndex--;
        character = line[startIndex];
    }
    while (!isWordBoundary(character) && startIndex > 0) {
        startIndex--;
        character = line[startIndex];
    }

    //Finds the end of the word
    character = line[endIndex];
    while (!isWordBoundary(character) && endIndex < line.length - 1) {
        endIndex++;
        character = line[endIndex];
    }

    var globalStartIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + startIndex;
    var globalEndIndex = googleDocument.caret.index - googleDocument.caret.lineIndex + endIndex;
    return {
        word: line.substring(startIndex, endIndex).trim(),
        startIndex: globalStartIndex,
        endIndex: globalEndIndex
    }
    //return line.substring(startIndex, endIndex).trim();
}

function highlight(startIndex, endIndex, googleDocument) {

    for (var i = 0; i < googleDocument.nodes.length; i++) {

        //Highlight node if its index overlap with the provided index
        if (doesRangesOverlap(startIndex, endIndex, googleDocument.nodes[i].index, googleDocument.nodes[i].index + googleDocument.nodes[i].text.length)) {

            //Only draw highlight if there is text to highlight
            var textToHighlight = getTextInNode(startIndex, endIndex, googleDocument.nodes[i]);
            if (!textToHighlight.trim()) continue;

            var parentRect = googleDocument.nodes[i].lineElement.getBoundingClientRect();
            var nodeRect = googleDocument.nodes[i].node.getBoundingClientRect();
            var leftPosOffset = 0;
            var rightPosOffset = nodeRect.width;
            if (startIndex > googleDocument.nodes[i].index) {
                var localIndex = startIndex - googleDocument.nodes[i].index;
                leftPosOffset = getPositionOfIndex(localIndex, googleDocument.nodes[i].node, googleDocument.nodes[i].lineElement);
            }

            if (endIndex < googleDocument.nodes[i].index + googleDocument.nodes[i].text.length) {
                rightPosOffset = getPositionOfIndex(endIndex - googleDocument.nodes[i].index, googleDocument.nodes[i].node, googleDocument.nodes[i].lineElement);
            }
            createHighlightNode(nodeRect.left - parentRect.left + leftPosOffset, nodeRect.top - parentRect.top, rightPosOffset - leftPosOffset, nodeRect.height, googleDocument.nodes[i].lineElement);
        }
    }
}

function getText(startIndex, endIndex, googleDocument) {

    var text = "";
    for (var i = 0; i < googleDocument.nodes.length; i++) {
        if (doesRangesOverlap(startIndex, endIndex, googleDocument.nodes[i].index, googleDocument.nodes[i].index + googleDocument.nodes[i].text.length)) {
            var textInNode = getTextInNode(startIndex, endIndex, googleDocument.nodes[i]);
            text += textInNode;
        }
    }

    return text;
}

function getTextInNode(startIndex, endIndex, node) {
    var start = 0;
    var end = node.text.length;
    if (startIndex > node.index) {
        start = startIndex - node.index;
    }
    if (endIndex < node.index + node.text.length) {
        end = endIndex - node.index;
    }
    return node.text.substring(start, end);

}

function createHighlightNode(left, top, width, height, parentElement) {

    var highlightNode = document.createElement("div");
    highlightNode.setAttribute("class", "dictus_highlight_node");
    highlightNode.style.position = 'absolute';
    highlightNode.style.left = left + "px";
    highlightNode.style.top = top + "px";
    highlightNode.style.width = width + "px";
    highlightNode.style.height = height + "px";
    highlightNode.style.backgroundColor = "#D1E3FF";
    highlightNode.style.color = "#D1E3FF";
    //Fuzzy edges on the highlight
    highlightNode.style.boxShadow = "0px 0px 1px 1px #D1E3FF";

    parentElement.appendChild(highlightNode);

}

function removeHighlight() {
    var highlightNodes = document.getElementsByClassName("dictus_highlight_node");
    while (highlightNodes.length > 0) highlightNodes[0].remove();
}

//Index: The index on the local element
function getPositionOfIndex(index, element, simulateElement) {

    //If index is 0 it is always the left most position of the element
    if (index == 0) {
        return 0;
    }

    //Creates a span DOM for each letter
    var text = cleanDocumentText(element.innerText);
    var container = document.createElement("div");
    var letterSpans = [];
    for (var i = 0; i < index; i++) {
        var textNode = document.createElement("span");
        textNode.innerText = text[i];
        textNode.style.cssText = element.style.cssText;
        //"pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
        textNode.style.whiteSpace = "pre";
        letterSpans.push(textNode);
        container.appendChild(textNode);
    }
    simulateElement.appendChild(container);

    var containerRect = container.getBoundingClientRect();
    var rect = letterSpans[index - 1].getBoundingClientRect();
    var leftPosition = rect.left + rect.width - containerRect.left;

    //Clean up
    container.remove();
    return leftPosition;
}

export default {
  getText,
  highlight,
  removeHighlight,
  findWordAtCaret,
  getGoogleDocument,
  cleanDocumentText
}