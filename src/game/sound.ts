// Sound effects synthesized with the Web Audio API, so the game ships no audio files.

const MUTE_KEY = 'draft-dash:muted'
const VOLUME = 0.08

let ctx: AudioContext | null = null
let muted = localStorage.getItem(MUTE_KEY) === '1'

function tone(freq: number, ms: number, delayMs = 0, type: OscillatorType = 'square') {
  if (muted) return
  // Browsers only allow audio after a user gesture; the first sound is always triggered by a click or key.
  ctx ??= new AudioContext()
  const start = ctx.currentTime + delayMs / 1000
  const end = start + ms / 1000
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(VOLUME, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(end)
}

export const sfx = {
  click: () => tone(440, 60),
  right: () => {
    tone(660, 90)
    tone(880, 120, 90)
  },
  wrong: () => tone(160, 220, 0, 'sawtooth'),
  gameOver: () => [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 160, i * 140)),
}

export const isMuted = () => muted

export function toggleMute(): boolean {
  muted = !muted
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  return muted
}
