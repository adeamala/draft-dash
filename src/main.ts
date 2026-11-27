import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/chakra-petch/700-italic.css'
import './style.css'
import {
  SESSION_MS,
  answer,
  comboMultiplier,
  isCorrectPick,
  isOver,
  makeRound,
  newSession,
  roundTimeMs,
  type Hero,
  type Round,
  type Session,
} from './game/rules.ts'
import { loadScores, saveScore } from './game/leaderboard.ts'
import { isMuted, sfx, toggleMute } from './game/sound.ts'
import { cycleRow, sigil } from './sigils.ts'

const IDLE_MS = 15_000
const FEEDBACK_MS = 350
const COUNT_UP_MS = 900
const LOW_TIME_RATIO = 0.35
const BURST_PARTICLES = 16
const TILT_DEG = 14
const TAPE_TEXT = "Draft Dash ✦ Pick the counter ✦ 90 seconds ✦ Beat today's top score ✦ "
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const app = document.querySelector<HTMLDivElement>('#app')!
const wipe = document.querySelector<HTMLDivElement>('.wipe')!
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Every screen gets its own AbortController: leaving a screen removes its listeners and
// cancels its pending timers, so each player starts from a clean state.
type ScreenName = 'attract' | 'play' | 'result' | 'board'
let screen = new AbortController()
let current: ScreenName = 'attract'
function enterScreen(name: ScreenName, html: string): AbortSignal {
  screen.abort()
  screen = new AbortController()
  // No wipe into play: it would hide the first round while its timer runs.
  if (name !== current && name !== 'play') pulse(wipe, 'go')
  current = name
  app.innerHTML = html
  return screen.signal
}

function toggleFullscreen() {
  const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
  request.catch((err) => console.warn('Draft Dash: fullscreen not available', err))
}

const muteLabel = () => (isMuted() ? '🔇 Sound off (M)' : '🔊 Sound on (M)')

// Global shortcuts. Skipped on the result screen, where letter keys type initials.
document.addEventListener('keydown', (e) => {
  if (current === 'result' || e.repeat) return
  const key = e.key.toLowerCase()
  if (key === 'f') toggleFullscreen()
  if (key === 'm') {
    toggleMute()
    const btn = app.querySelector('#mute')
    if (btn) btn.textContent = muteLabel()
  }
})

const later = (signal: AbortSignal, ms: number, fn: () => void) => {
  const id = setTimeout(fn, ms)
  signal.addEventListener('abort', () => clearTimeout(id))
}

const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!

/** Restart a one-shot CSS animation class on an element. */
function pulse(el: HTMLElement, cls: string) {
  el.classList.remove(cls)
  void el.offsetWidth // force a reflow so the animation runs again
  el.classList.add(cls)
}

function scoreList(limit: number): string {
  const scores = loadScores().slice(0, limit)
  if (!scores.length) return '<p class="muted">No scores yet today. Be the first!</p>'
  // Initials are validated to A-Z/? by loadScores, so they are safe to inline.
  return `<ol class="scores">${scores
    .map((e, i) => `<li style="--i:${i}"><span>${e.initials}</span><b>${e.score}</b></li>`)
    .join('')}</ol>`
}

const tapes = () =>
  ['tape-a', 'tape-b']
    .map(
      (cls) =>
        `<div class="tape ${cls}" aria-hidden="true"><div class="tape-track"><span>${TAPE_TEXT.repeat(4)}</span><span>${TAPE_TEXT.repeat(4)}</span></div></div>`,
    )
    .join('')

const kineticTitle = (words: string[]) =>
  `<h1 class="title" aria-label="${words.join(' ')}"><span aria-hidden="true">${words
    .map(
      (word, w) =>
        `<span class="word w${w}">${[...word].map((ch, i) => `<span class="ch" style="--i:${w * 5 + i}">${ch}</span>`).join('')}</span>`,
    )
    .join('')}</span></h1>`

/** Spray particles from the centre of an element; the layer removes itself when done. */
function burst(from: HTMLElement) {
  const r = from.getBoundingClientRect()
  const layer = document.createElement('div')
  layer.className = 'burst'
  layer.style.left = `${r.left + r.width / 2}px`
  layer.style.top = `${r.top + r.height / 2}px`
  layer.innerHTML = Array.from({ length: BURST_PARTICLES }, (_, i) => `<i style="--a:${(360 / BURST_PARTICLES) * i}deg"></i>`).join('')
  layer.addEventListener('animationend', () => layer.remove(), { once: true })
  app.append(layer)
}

const heroCard = (h: Hero) =>
  `<span class="icon">${sigil(h.element)}</span><span class="name">${h.name}</span><span class="el">${h.element}</span>`

function showAttract() {
  const signal = enterScreen(
    'attract',
    `
    ${tapes()}
    <main class="screen attract">
      <p class="kicker sticker">Booth challenge</p>
      ${kineticTitle(['Draft', 'Dash'])}
      <p class="tagline">${SESSION_MS / 1000} seconds to out-draft the enemy coach.</p>
      ${cycleRow()}
      <button class="primary" id="start">Click to play</button>
      <section class="top">
        <h2>Today's top 5</h2>
        ${scoreList(5)}
      </section>
      <nav class="toggles">
        <button id="fullscreen">⛶ Fullscreen (F)</button>
        <button id="mute">${muteLabel()}</button>
      </nav>
    </main>`,
  )
  $('#start').addEventListener(
    'click',
    () => {
      sfx.click()
      startGame()
    },
    { signal },
  )
  $('#fullscreen').addEventListener('click', toggleFullscreen, { signal })
  $('#mute').addEventListener(
    'click',
    () => {
      toggleMute()
      $('#mute').textContent = muteLabel()
      sfx.click()
    },
    { signal },
  )
  $('#start').focus()
}

function startGame() {
  const signal = enterScreen(
    'play',
    `
    <main class="screen play">
      <header class="hud">
        <div class="hud-cell"><small>Time</small><b id="time"></b></div>
        <div class="hud-cell"><small>Score</small><b id="score">0</b></div>
        <div class="hud-cell"><small>Combo</small><b id="combo">x1</b></div>
        <div class="hud-cell"><small>Lives</small><b id="lives" aria-label="Lives"></b></div>
      </header>
      <p class="label">Enemy locks in</p>
      <div id="enemy-slot"></div>
      <div class="bar"><div id="bar"></div></div>
      ${cycleRow().replace('class="cycle"', 'class="cycle small"')}
      <p class="label">Your counter-pick <small>(click or press 1, 2, 3)</small></p>
      <div id="options" class="options"></div>
      <div id="callout" class="callout" aria-live="polite"></div>
    </main>`,
  )

  let session: Session = newSession(performance.now())
  let round: Round
  let roundStart = 0
  let locked = false

  const updateHud = () => {
    $('#score').textContent = String(session.score)
    $('#combo').textContent = `x${comboMultiplier(session.streak)}`
    $('#lives').textContent = '♥'.repeat(Math.max(0, session.lives))
  }

  const callout = (text: string, kind: 'good' | 'combo' | 'bad') => {
    const el = $('#callout')
    el.textContent = text
    el.className = `callout ${kind}`
    pulse(el, 'show')
  }

  const nextRound = () => {
    round = makeRound()
    roundStart = performance.now()
    locked = false
    // New elements each round, so the lock-in and deal-in animations replay.
    $('#enemy-slot').innerHTML = `<div id="enemy" class="card enemy el-${round.enemy.element}">${heroCard(round.enemy)}</div>`
    $('#options').innerHTML = round.options
      .map((h, i) => `<button class="card el-${h.element}" data-i="${i}"><kbd>${i + 1}</kbd>${heroCard(h)}</button>`)
      .join('')
    updateHud()
  }

  const resolve = (pickIndex: number | null) => {
    if (locked) return
    locked = true
    const before = session
    const msLeft = roundTimeMs(session.round) - (performance.now() - roundStart)
    const correct = pickIndex !== null && isCorrectPick(round.enemy, round.options[pickIndex])
    session = answer(session, correct, msLeft)

    const buttons = app.querySelectorAll<HTMLButtonElement>('#options button')
    round.options.forEach((h, i) => {
      if (isCorrectPick(round.enemy, h)) buttons[i].classList.add('right')
      else if (i === pickIndex) buttons[i].classList.add('wrong')
    })
    updateHud()
    pulse($('.play'), correct ? 'hit' : 'miss')

    if (correct) {
      sfx.right()
      burst(buttons[pickIndex!])
      pulse($('#score'), 'bump')
      const multiplier = comboMultiplier(session.streak)
      if (multiplier > comboMultiplier(before.streak)) {
        callout(`Combo x${multiplier}!`, 'combo')
        pulse($('#combo'), 'bump')
      } else {
        callout(`+${session.score - before.score}`, 'good')
      }
    } else {
      sfx.wrong()
      pulse($('#lives'), 'bump')
      callout(pickIndex === null ? 'Too slow' : 'Miss', 'bad')
    }
    later(signal, FEEDBACK_MS, () => (isOver(session, performance.now()) ? showResult(session.score) : nextRound()))
  }

  $('#options').addEventListener(
    'click',
    (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]')
      if (btn) resolve(Number(btn.dataset.i))
    },
    { signal },
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (['1', '2', '3'].includes(e.key)) resolve(Number(e.key) - 1)
    },
    { signal },
  )
  // 3D tilt: the hovered card leans toward the mouse.
  $('#options').addEventListener(
    'pointermove',
    (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.card')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -TILT_DEG}deg`)
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * TILT_DEG}deg`)
    },
    { signal },
  )

  const tick = (now: number) => {
    if (signal.aborted) return
    const timeLeft = SESSION_MS - (now - session.startedAt)
    if (timeLeft <= 0) return showResult(session.score)
    $('#time').textContent = String(Math.ceil(timeLeft / 1000))
    if (!locked) {
      const limit = roundTimeMs(session.round)
      const elapsed = now - roundStart
      const ratio = Math.max(0, 1 - elapsed / limit)
      const bar = $('#bar')
      bar.style.width = `${ratio * 100}%`
      bar.classList.toggle('low', ratio < LOW_TIME_RATIO)
      if (elapsed >= limit) resolve(null)
    }
    requestAnimationFrame(tick)
  }

  nextRound()
  requestAnimationFrame(tick)
}

/** Animate a number from 0 up to `to`, unless the player prefers reduced motion. */
function countUp(el: HTMLElement, to: number, signal: AbortSignal) {
  if (reducedMotion.matches) {
    el.textContent = String(to)
    return
  }
  const start = performance.now()
  const step = (now: number) => {
    if (signal.aborted) return
    const p = Math.min(1, (now - start) / COUNT_UP_MS)
    el.textContent = String(Math.round(to * (1 - (1 - p) ** 3)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function showResult(score: number) {
  const letters = ['A', 'A', 'A']
  let cursor = 0
  sfx.gameOver()
  const signal = enterScreen(
    'result',
    `
    <div class="watermark" aria-hidden="true">GG</div>
    <main class="screen result">
      <p class="kicker">Final score</p>
      <h1 class="score-big" id="final">0</h1>
      <p class="label">Enter your initials</p>
      <div class="initials">
        ${letters
          .map(
            (l, i) => `<div class="slot">
              <button data-i="${i}" data-d="-1" aria-label="Previous letter">▲</button>
              <b id="l${i}">${l}</b>
              <button data-i="${i}" data-d="1" aria-label="Next letter">▼</button>
            </div>`,
          )
          .join('')}
      </div>
      <button class="primary" id="save">Save score</button>
    </main>`,
  )
  countUp($('#final'), score, signal)

  const setLetter = (i: number, letter: string) => {
    letters[i] = letter
    const el = $(`#l${i}`)
    el.textContent = letter
    pulse(el, 'bump')
  }
  const finish = (initials: string) => {
    saveScore({ initials, score, at: Date.now() })
    showAttract()
  }

  // Booth mode: if the player walks away, keep their score and reset for the next fan.
  let idleId = 0
  const armIdle = () => {
    clearTimeout(idleId)
    idleId = setTimeout(() => finish('???'), IDLE_MS)
  }
  signal.addEventListener('abort', () => clearTimeout(idleId))
  armIdle()
  app.addEventListener('pointerdown', armIdle, { signal })

  $('.initials').addEventListener(
    'click',
    (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]')
      if (!btn) return
      const i = Number(btn.dataset.i)
      const next = (LETTERS.indexOf(letters[i]) + Number(btn.dataset.d) + LETTERS.length) % LETTERS.length
      setLetter(i, LETTERS[next])
      sfx.click()
    },
    { signal },
  )
  $('#save').addEventListener('click', () => finish(letters.join('')), { signal })
  document.addEventListener(
    'keydown',
    (e) => {
      armIdle()
      if (/^[a-z]$/i.test(e.key)) {
        setLetter(cursor, e.key.toUpperCase())
        cursor = Math.min(cursor + 1, letters.length - 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        finish(letters.join(''))
      }
    },
    { signal },
  )
}

// Second screen for the booth: open <url>#leaderboard on another monitor.
function showLeaderboard() {
  enterScreen(
    'board',
    `${tapes()}
    <main class="screen board">
      <p class="kicker sticker">Draft Dash</p>
      <h1 class="title">Today's Top 10</h1>
      ${scoreList(10)}
    </main>`,
  )
}

if (location.hash === '#leaderboard') {
  showLeaderboard()
  window.addEventListener('storage', showLeaderboard)
  setInterval(showLeaderboard, 60_000) // picks up the midnight reset
} else {
  showAttract()
}
