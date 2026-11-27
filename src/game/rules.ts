// Core Draft Dash rules. Pure functions only (no DOM, no timers) so they are easy to test.

export type Element = 'blaze' | 'frost' | 'volt'

/** Blaze beats Frost, Frost beats Volt, Volt beats Blaze. */
const BEATS: Record<Element, Element> = { blaze: 'frost', frost: 'volt', volt: 'blaze' }

export interface Hero {
  id: string
  name: string
  element: Element
}

/** Original heroes (no third-party game IP). */
export const HEROES: readonly Hero[] = [
  { id: 'ember', name: 'Ember', element: 'blaze' },
  { id: 'pyra', name: 'Pyra', element: 'blaze' },
  { id: 'cinder', name: 'Cinder', element: 'blaze' },
  { id: 'rime', name: 'Rime', element: 'frost' },
  { id: 'glacia', name: 'Glacia', element: 'frost' },
  { id: 'flurry', name: 'Flurry', element: 'frost' },
  { id: 'spark', name: 'Spark', element: 'volt' },
  { id: 'arc', name: 'Arc', element: 'volt' },
  { id: 'jolt', name: 'Jolt', element: 'volt' },
]

export const SESSION_MS = 90_000
export const STARTING_LIVES = 3
const BASE_POINTS = 100
const FAST_ROUND_FROM = 9
const BAN_FROM_ROUND = 7
const BAN_EVERY = 4

export const beats = (attacker: Element, defender: Element): boolean => BEATS[attacker] === defender

export const isCorrectPick = (enemy: Hero, pick: Hero): boolean => beats(pick.element, enemy.element)

/** Ban rounds flip the rule, like the pick/ban rhythm of a real draft: rounds 7, 11, 15, ... */
export const isBanRound = (round: number): boolean => round >= BAN_FROM_ROUND && (round - BAN_FROM_ROUND) % BAN_EVERY === 0

/** In a ban round the right answer is the hero the enemy beats; otherwise the hero that beats the enemy. */
export const isCorrectAnswer = (round: number, enemy: Hero, pick: Hero): boolean =>
  isBanRound(round) ? beats(enemy.element, pick.element) : isCorrectPick(enemy, pick)

/** Time allowed to answer a round; round numbers start at 1. */
export const roundTimeMs = (round: number): number => (round < FAST_ROUND_FROM ? 3000 : 2000)

/** `streak` = consecutive correct picks before this one: x2 from the 4th in a row, x3 from the 7th. */
export const comboMultiplier = (streak: number): number => (streak >= 6 ? 3 : streak >= 3 ? 2 : 1)

/** Points for a correct pick: base + 1 point per 10 ms left, times the combo multiplier. */
export const roundPoints = (msLeft: number, streak: number): number =>
  (BASE_POINTS + Math.floor(Math.max(0, msLeft) / 10)) * comboMultiplier(streak)

export interface Session {
  round: number
  score: number
  /** Consecutive correct picks so far. */
  streak: number
  lives: number
  startedAt: number
}

export const newSession = (now: number): Session => ({
  round: 1,
  score: 0,
  streak: 0,
  lives: STARTING_LIVES,
  startedAt: now,
})

/** Apply one answer. A timeout counts as a wrong answer. */
export const answer = (s: Session, correct: boolean, msLeft: number): Session =>
  correct
    ? { ...s, round: s.round + 1, score: s.score + roundPoints(msLeft, s.streak), streak: s.streak + 1 }
    : { ...s, round: s.round + 1, streak: 0, lives: s.lives - 1 }

export const isOver = (s: Session, now: number): boolean => s.lives <= 0 || now - s.startedAt >= SESSION_MS

export interface Round {
  enemy: Hero
  options: [Hero, Hero, Hero]
}

/**
 * One hero per element, so exactly one option beats the enemy.
 * `random` returns a number in [0, 1), like Math.random; inject a seeded one in tests.
 */
export function makeRound(random: () => number = Math.random): Round {
  const pickFrom = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const enemy = pickFrom(HEROES)
  const elements: Element[] = ['blaze', 'frost', 'volt']
  const options = elements.map((element) => pickFrom(HEROES.filter((h) => h.element === element)))
  // Fisher-Yates shuffle so the correct card is not always in the same slot.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { enemy, options: options as [Hero, Hero, Hero] }
}
