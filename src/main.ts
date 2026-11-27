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
  type Element,
  type Hero,
  type Round,
  type Session,
} from './game/rules.ts'
import { loadScores, saveScore } from './game/leaderboard.ts'
import { isMuted, sfx, toggleMute } from './game/sound.ts'

const IDLE_MS = 15_000
const FEEDBACK_MS = 350
const ICON: Record<Element, string> = { blaze: '🔥', frost: '❄️', volt: '⚡' }
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const app = document.querySelector<HTMLDivElement>('#app')!
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Every screen gets its own AbortController: leaving a screen removes its listeners and
// cancels its pending timers, so each player starts from a clean state.
type ScreenName = 'attract' | 'play' | 'result' | 'board'
let screen = new AbortController()
let current: ScreenName = 'attract'
function enterScreen(name: ScreenName, html: string): AbortSignal {
  screen.abort()
  screen = new AbortController()
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

function scoreList(limit: number): string {
  const scores = loadScores().slice(0, limit)
  if (!scores.length) return '<p class="muted">No scores yet today. Be the first!</p>'
  // Initials are validated to A-Z/? by loadScores, so they are safe to inline.
  return `<ol class="scores">${scores.map((e) => `<li><span>${e.initials}</span><b>${e.score}</b></li>`).join('')}</ol>`
}

const heroCard = (h: Hero) =>
  `<span class="icon" aria-hidden="true">${ICON[h.element]}</span><span class="name">${h.name}</span><span class="el">${h.element}</span>`

function showAttract() {
  const signal = enterScreen(
    'attract',
    `
    <main class="screen attract">
      <h1>Draft Dash</h1>
      <p class="tagline">${SESSION_MS / 1000} seconds to out-draft the enemy coach.</p>
      <p class="cycle">🔥 Blaze beats ❄️ Frost beats ⚡ Volt beats 🔥 Blaze</p>
      <button class="primary" id="start">Click to play</button>
      <h2>Today's top 5</h2>
      ${scoreList(5)}
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
        <span>⏱ <b id="time"></b>s</span>
        <span>Score <b id="score">0</b></span>
        <span>Combo <b id="combo">x1</b></span>
        <span id="lives" aria-label="Lives"></span>
      </header>
      <p class="label">Enemy locks in</p>
      <div id="enemy" class="card enemy"></div>
      <div class="bar"><div id="bar"></div></div>
      <p class="cycle">🔥 beats ❄️ · ❄️ beats ⚡ · ⚡ beats 🔥</p>
      <p class="label">Your counter-pick <small>(click or press 1, 2, 3)</small></p>
      <div id="options" class="options"></div>
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

  const nextRound = () => {
    round = makeRound()
    roundStart = performance.now()
    locked = false
    const enemy = $('#enemy')
    enemy.className = `card enemy el-${round.enemy.element}`
    enemy.innerHTML = heroCard(round.enemy)
    $('#options').innerHTML = round.options
      .map((h, i) => `<button class="card el-${h.element}" data-i="${i}"><kbd>${i + 1}</kbd>${heroCard(h)}</button>`)
      .join('')
    updateHud()
  }

  const resolve = (pickIndex: number | null) => {
    if (locked) return
    locked = true
    const msLeft = roundTimeMs(session.round) - (performance.now() - roundStart)
    const correct = pickIndex !== null && isCorrectPick(round.enemy, round.options[pickIndex])
    session = answer(session, correct, msLeft)
    if (correct) sfx.right()
    else sfx.wrong()
    const buttons = app.querySelectorAll<HTMLButtonElement>('#options button')
    round.options.forEach((h, i) => {
      if (isCorrectPick(round.enemy, h)) buttons[i].classList.add('right')
      else if (i === pickIndex) buttons[i].classList.add('wrong')
    })
    updateHud()
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

  const tick = (now: number) => {
    if (signal.aborted) return
    const timeLeft = SESSION_MS - (now - session.startedAt)
    if (timeLeft <= 0) return showResult(session.score)
    $('#time').textContent = String(Math.ceil(timeLeft / 1000))
    if (!locked) {
      const limit = roundTimeMs(session.round)
      const elapsed = now - roundStart
      $('#bar').style.width = `${Math.max(0, 1 - elapsed / limit) * 100}%`
      if (elapsed >= limit) resolve(null)
    }
    requestAnimationFrame(tick)
  }

  nextRound()
  requestAnimationFrame(tick)
}

function showResult(score: number) {
  const letters = ['A', 'A', 'A']
  let cursor = 0
  sfx.gameOver()
  const signal = enterScreen(
    'result',
    `
    <main class="screen result">
      <p class="label">Final score</p>
      <h1>${score}</h1>
      <p>Enter your initials</p>
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

  const setLetter = (i: number, letter: string) => {
    letters[i] = letter
    $(`#l${i}`).textContent = letter
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
  enterScreen('board', `<main class="screen board"><h1>Draft Dash · Today's Top 10</h1>${scoreList(10)}</main>`)
}

if (location.hash === '#leaderboard') {
  showLeaderboard()
  window.addEventListener('storage', showLeaderboard)
  setInterval(showLeaderboard, 60_000) // picks up the midnight reset
} else {
  showAttract()
}
