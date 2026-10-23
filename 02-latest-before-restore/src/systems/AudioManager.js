import { GameState } from '../core/GameState.js';

// 不依赖外部音频文件的轻量声音系统。以后加入 mp3 后可以在这里替换成正式音乐。
class AudioManagerClass {
  constructor() {
    this.context = null;
    this.musicTimer = null;
    this.noteIndex = 0;
    this.notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392];
  }

  ensureContext() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume();
  }

  beep(frequency, duration = 0.09, volume = 0.12) {
    this.ensureContext();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.frequency.value = frequency;
    oscillator.type = 'triangle';
    gain.gain.setValueAtTime(volume * GameState.settings.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  startMusic() {
    this.ensureContext();
    if (this.musicTimer) return;
    this.musicTimer = window.setInterval(() => {
      this.beep(this.notes[this.noteIndex++ % this.notes.length], 0.55, 0.035 * GameState.settings.musicVolume);
    }, 680);
  }

  toggleMusic(enabled) {
    if (enabled) this.startMusic();
    else if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const AudioManager = new AudioManagerClass();
