// Daily leaderboard kept in localStorage, so it works offline. Other windows on the same
// origin (the leaderboard screen) get the browser's `storage` event when it changes.

export interface Entry {
  initials: string
  score: number
  at: number
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const MAX_ENTRIES = 10
const INITIALS = /^[A-Z?]{3}$/

/** One key per local calendar day, which gives the daily reset for free. */
export const dayKey = (d: Date): string =>
  `draft-dash:scores:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Highest score first; on a tie, whoever got there first stays ahead. */
export const insertEntry = (list: readonly Entry[], entry: Entry): Entry[] =>
  [...list, entry].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, MAX_ENTRIES)

const isEntry = (v: unknown): v is Entry => {
  const e = v as Entry
  return typeof e === 'object' && e !== null && INITIALS.test(e.initials) && Number.isFinite(e.score) && Number.isFinite(e.at)
}

export function loadScores(store: KeyValueStore = localStorage, day: Date = new Date()): Entry[] {
  try {
    const raw: unknown = JSON.parse(store.getItem(dayKey(day)) ?? '[]')
    return Array.isArray(raw) ? raw.filter(isEntry) : []
  } catch (err) {
    // A corrupted value must not take the booth down; start the day's board fresh.
    console.warn('Draft Dash: unreadable leaderboard, starting empty', err)
    return []
  }
}

export function saveScore(entry: Entry, store: KeyValueStore = localStorage, day: Date = new Date()): Entry[] {
  if (!isEntry(entry)) throw new Error('Invalid leaderboard entry')
  const next = insertEntry(loadScores(store, day), entry)
  try {
    store.setItem(dayKey(day), JSON.stringify(next))
  } catch (err) {
    // Storage full or blocked: the game keeps running, only this score is not kept.
    console.error('Draft Dash: could not save score', err)
  }
  return next
}
