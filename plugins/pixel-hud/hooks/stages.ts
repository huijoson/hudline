import { QUEST_STAGE } from './quest'
import { SLIME_STAGE } from './slime'
import type { Stage } from './stage'

export function selectStage(option: unknown): Stage {
  return option === 'quest' ? QUEST_STAGE : SLIME_STAGE
}
