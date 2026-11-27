import { describe, expect, it } from 'vitest'
import { summarize } from './stats.ts'

describe('summarize', () => {
  it('handles a run with no picks', () => {
    expect(summarize([])).toEqual({ avgPickMs: null, accuracy: 0, bestStreak: 0 })
  })

  it('handles a run of only timeouts', () => {
    const timeout = { ms: null, correct: false }
    expect(summarize([timeout, timeout, timeout])).toEqual({ avgPickMs: null, accuracy: 0, bestStreak: 0 })
  })

  it('averages only answered rounds and counts timeouts against accuracy', () => {
    const s = summarize([
      { ms: 600, correct: true },
      { ms: null, correct: false },
      { ms: 1000, correct: true },
    ])
    expect(s.avgPickMs).toBe(800)
    expect(s.accuracy).toBe(67)
  })

  it('finds the best streak in the middle of a run', () => {
    const c = (correct: boolean) => ({ ms: 500, correct })
    const picks = [c(true), c(false), c(true), c(true), c(true), c(false), c(true)]
    expect(summarize(picks).bestStreak).toBe(3)
  })
})
