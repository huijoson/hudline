// Token flow in hudline's two layers: input + cache read + cache write is Input,
// out is Output; cacheRead and thinking are breakdowns, never peers.
export type Flow = {
  input: number
  cacheRead: number
  cacheWrite: number
  out: number
  thinking: number
}

export type Branch = { name: string; isDirty: boolean }

export type Usage = {
  model: string
  ctxPercent: number | null
  // Quota windows as hudline reads them: percent remaining, not used.
  fiveHourLeft: { percent: number; resetsAt?: string } | null
  sevenDayLeft: { percent: number; resetsAt?: string } | null
  usd: number | null
}

// Token flow over the Conversation: the last transcript reading plus what the
// main loop has reported since. Thinking is only known from the transcript.
export type Tally = {
  effort: string | null
  transcript: string | null
  base: Flow | null
  since: Flow
  isThinkingKnown: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-hud': { branch: Branch | null; usage: Usage | null; tally: Tally }
  }
}
