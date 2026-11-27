import { describe, expect, it } from 'vitest'
import {
  HEROES,
  SESSION_MS,
  answer,
  beats,
  comboMultiplier,
  isCorrectPick,
  isOver,
  makeRound,
  newSession,
  roundPoints,
  roundTimeMs,
} from './rules.ts'

describe('session', () => {
  it('scores a correct answer, grows the streak and advances the round', () => {
    const s = answer(newSession(0), true, 1500)
    expect(s).toMatchObject({ round: 2, score: 250, streak: 1, lives: 3 })
  })

  it('applies the combo from the 4th correct answer in a row', () => {
    let s = newSession(0)
    for (let i = 0; i < 4; i++) s = answer(s, true, 0)
    expect(s.score).toBe(100 + 100 + 100 + 200)
  })

  it('a wrong answer or timeout costs a life and resets the streak, not the score', () => {
    const s = answer(answer(newSession(0), true, 0), false, 0)
    expect(s).toMatchObject({ score: 100, streak: 0, lives: 2, round: 3 })
  })

  it('ends when lives run out or time is up', () => {
    let s = newSession(0)
    expect(isOver(s, SESSION_MS - 1)).toBe(false)
    expect(isOver(s, SESSION_MS)).toBe(true)
    for (let i = 0; i < 3; i++) s = answer(s, false, 0)
    expect(isOver(s, 0)).toBe(true)
  })
})

describe('beats', () => {
  it('follows the Blaze > Frost > Volt > Blaze cycle', () => {
    expect(beats('blaze', 'frost')).toBe(true)
    expect(beats('frost', 'volt')).toBe(true)
    expect(beats('volt', 'blaze')).toBe(true)
  })

  it('is false for the reverse direction and for the same element', () => {
    expect(beats('frost', 'blaze')).toBe(false)
    expect(beats('blaze', 'blaze')).toBe(false)
  })
})

describe('scoring', () => {
  it('speeds up from round 9', () => {
    expect(roundTimeMs(1)).toBe(3000)
    expect(roundTimeMs(8)).toBe(3000)
    expect(roundTimeMs(9)).toBe(2000)
  })

  it('raises the combo at 3 and 6 previous correct picks', () => {
    expect([0, 2, 3, 5, 6, 20].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('adds a speed bonus and never goes below base points', () => {
    expect(roundPoints(1500, 0)).toBe(250)
    expect(roundPoints(1500, 3)).toBe(500)
    expect(roundPoints(-50, 0)).toBe(100)
  })
})

describe('makeRound', () => {
  it('always offers exactly one correct pick, across many random rounds', () => {
    for (let i = 0; i < 500; i++) {
      const { enemy, options } = makeRound()
      expect(options.filter((o) => isCorrectPick(enemy, o))).toHaveLength(1)
      expect(new Set(options.map((o) => o.element)).size).toBe(3)
    }
  })

  it('is deterministic with an injected random source', () => {
    const seeded = () => 0
    expect(makeRound(seeded)).toEqual(makeRound(seeded))
    expect(makeRound(seeded).enemy).toBe(HEROES[0])
  })
})
