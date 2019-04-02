function hasOggSupport () {
  let hasSupport = false
  const test_audio = document.createElement('audio')
  if (test_audio.play) {
    const audio = new Audio()
    hasSupport = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"') != ''
  }
  return hasSupport
}

export default hasOggSupport