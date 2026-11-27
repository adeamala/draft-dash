// Skill stats shown on the result screen: how fast and how accurately the player decided.

export interface Pick {
  /** Decision time in ms, or null when the round timed out. */
  ms: number | null
  correct: boolean
}

export interface Summary {
  /** Average decision time over answered rounds; null when nothing was answered. */
  avgPickMs: number | null
  /** Correct picks as a whole percentage of all rounds. */
  accuracy: number
  bestStreak: number
}

export function summarize(picks: readonly Pick[]): Summary {
  const answered = picks.flatMap((p) => (p.ms === null ? [] : [p.ms]))
  let streak = 0
  let bestStreak = 0
  for (const p of picks) {
    streak = p.correct ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
  }
  return {
    avgPickMs: answered.length ? answered.reduce((a, b) => a + b, 0) / answered.length : null,
    accuracy: picks.length ? Math.round((picks.filter((p) => p.correct).length / picks.length) * 100) : 0,
    bestStreak,
  }
}
