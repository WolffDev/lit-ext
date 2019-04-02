import $ from '../vendor/jquery-3.3.1-custom.min'
import env from './env'

class Player {
  constructor() {
    this.audioPlayer = $('<audio src=""></audio>')[0]
    this.isPaused = false
    this.mediaWasSet = false
    this.audio_clock
    this.delegateTimeUpdate = null
    this.prevPause = null

    this.bindEndPlayingEvent(() => {
      clearInterval(this.audio_clock)
      this.isPaused = false
    })
    console.log('new player')
  }

  getIsPaused() {
    return this.isPaused
  }

  getIsPlaying() {
    return this.audioPlayer.currentTime > 0
  }

  getIsMediaSet() {
    return this.audioPlayer.duration > 0
  }

  bindTimeUpdateEvent(delegate) {
    this.delegateTimeUpdate = delegate
    if (delegate) {
      $(this.audioPlayer).on('timeupdate', delegate)
    }
  }

  unbindTimeUpdateEvent() {
    $(this.audioPlayer).off('timeupdate')
  }

  bindEndPlayingEvent = function (delegate) {
    $(this.audioPlayer).on('ended', event => {
      this.audioPlayer.currentTime = 0
      delegate(event)
    })
  }

  unbindEndPlayingEvent() {
    $(this.audioPlayer).off('ended')
  }

  status() {
    return this.audioPlayer.data('jPlayer').status
  }

  currentTime() {
    return this.audioPlayer.currentTime
  }

  play() {
    this.mediaWasSet = true;
    this.isPaused = false
    if (arguments.length == 1) {
      this.setmedia(arguments[0])
      this.audioPlayer.play()
      this.audio_clock = setInterval(() => {
        if(this.delegateTimeUpdate) {
          this.delegateTimeUpdate({
            target: this.audioPlayer
          })
        }
      }, 100)
    } else {
      this.audioPlayer.jPlayer('play', arguments[1])
    }
  }

  // setmedia(sound) {
  setmedia(url) {
    this.mediaWasSet = true
    this.audioPlayer.src = env['MV_SERVICES_URL'] + (typeof url === 'string' ? url : url.ogg_url)
  }

  resume() {
    // this.audioPlayer.currentTime = prevPause;
    this.audioPlayer.play()
    this.isPaused = false
    this.prevPause = null
  }

  pause() {
    clearInterval(this.audio_clock);
    if (this.mediaWasSet) {
      this.prevPause = this.audioPlayer.currentTime
      this.audioPlayer.pause()
      this.isPaused = true
    }
  }

  stop() {
    clearInterval(this.audio_clock)
    if (this.mediaWasSet) {
      this.audioPlayer.pause()
      this.audioPlayer.currentTime = 0
    }
    this.isPaused = false
  }
}

export default Player
