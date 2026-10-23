import { SLIME_STAGE } from './slime'
import type { Stage } from './stage'

export function selectStage(option: unknown): Stage {
  // Until the quest stage lands, both choices and unset values use the slimes.
  return SLIME_STAGE
}
