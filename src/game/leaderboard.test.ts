import { describe, expect, it, vi } from 'vitest'
import { dayKey, insertEntry, loadScores, saveScore, type Entry } from './leaderboard.ts'

const memoryStore = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

const day = new Date(2026, 11, 5)
const entry = (initials: string, score: number, at = 0): Entry => ({ initials, score, at })

describe('leaderboard', () => {
  it('uses one key per local day', () => {
    expect(dayKey(day)).toBe('draft-dash:scores:2026-12-05')
  })

  it('keeps the top 10, highest first, earlier entry wins a tie', () => {
    let list: Entry[] = []
    for (let i = 0; i < 12; i++) list = insertEntry(list, entry('AAA', i * 10, i))
    expect(list).toHaveLength(10)
    expect(list[0].score).toBe(110)
    expect(insertEntry([entry('OLD', 50, 1)], entry('NEW', 50, 2))[0].initials).toBe('OLD')
  })

  it('saves and reloads scores for the same day only', () => {
    const store = memoryStore()
    saveScore(entry('ADE', 900), store, day)
    saveScore(entry('???', 300), store, day)
    expect(loadScores(store, day).map((e) => e.initials)).toEqual(['ADE', '???'])
    expect(loadScores(store, new Date(2026, 11, 6))).toEqual([])
  })

  it('drops corrupted or tampered data instead of crashing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = memoryStore()
    store.setItem(dayKey(day), '{not json')
    expect(loadScores(store, day)).toEqual([])
    store.setItem(dayKey(day), JSON.stringify([entry('<b>', 1), entry('OK!', 2), entry('YES', 3)]))
    expect(loadScores(store, day).map((e) => e.initials)).toEqual(['YES'])
  })

  it('rejects invalid initials on save', () => {
    expect(() => saveScore(entry('abcd', 1), memoryStore(), day)).toThrow()
  })
})
