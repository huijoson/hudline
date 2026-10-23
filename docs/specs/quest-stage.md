# Spec: Quest stage theme for pixel-hud

Status: ready for agent · 2026-10-23 · shaped with `/grilling`

Sizes follow ADR 0015: both stages are 16 pixels tall (8 text rows).

## Problem Statement

The stage beside the branch in the pixel-hud mod has one theme: the Dragon
Quest slime family. A developer who wants a different companion has no
choice, and nothing on the stage marks the most common event of a session,
an ordinary finished task. The King Slime only answers tasks of 20 seconds
or more.

## Solution

Add a second stage theme, **quest**, chosen in `/config`. A small hero walks
in place while the ground scrolls under its feet. Each time the main agent
finishes a task, a random monster scrolls in. The hero stops, casts a random
skill, the monster flickers and bursts, and the hero walks on. The existing
session-start, tool-failure and compaction moments get quest versions. The
slime theme stays the default and does not change.

## User Stories

1. As a developer, I want to pick the stage theme from a list in `/config`,
   so that I can choose slimes or a questing hero without editing files.
2. As a developer who never touches the option, I want the slimes to stay
   exactly as they are, so that upgrading changes nothing for me.
3. As a developer on the quest stage, I want a hero who walks in place while
   the ground scrolls left, so that it reads as a journey in an 8-row band.
4. As a developer, I want a monster to appear each time a task finishes, so
   that every finished task gets a small payoff.
5. As a developer, I want the monster and the skill to be random each time,
   so that the battles do not feel canned.
6. As a developer, I want the hero to always win in one hit and walk on
   within about 3 seconds, so that the battle marks the moment and gets out of
   the way.
7. As a developer, I want a subagent's turns, interrupted turns and errors
   not to start a battle, so that only my finished tasks count.
8. As a developer who finishes tasks quickly, I want a battle that is still
   playing to swallow the next one, so that battles never pile up.
9. As a developer starting a session, I want the hero to walk onto the
   stage, so that the quest stage has its own encounter.
10. As a developer, I want the hero to flicker when a tool fails, so that a
    failure registers the same way it does with slimes.
11. As a developer, I want the hero to level up with a gold flash when the
    conversation is compacted.
12. As a developer who finds motion distracting, I want `slimesIdle: false`
    to stop the walking and scrolling on the quest stage too, while battles
    still play.
13. As a developer on a narrow terminal, I want the quest stage to disappear
    rather than be clipped, so that the branch name keeps its room.
14. As a developer on the desktop surface, I want one still hero drawn as
    text, so that the fallback matches the theme.
15. As a developer running `/slime-king` on the quest stage, I want a reply
    that says there are no slimes here, so that the command does not lie.

## Implementation Decisions

### The option

- `plugin.json` `userConfig` gains `stage`: type `string`, title
  "Stage theme", `options: ["slimes", "quest"]`, default `"slimes"`,
  description "What walks beside the branch: the slime family, or a hero who
  fights a monster each time a task finishes." `/config` draws it as a
  picker. A stored value outside the options counts as unset.
- `slimesIdle` keeps its name. On the quest stage `false` means the hero
  stands and the ground does not scroll. Moments still play.
- `slimesHop` has no effect on the quest stage.

### Modules

- **A stage seam.** Today `register.tsx` imports slime functions directly
  (`slimeCells`, `slimeColumns`, `slimeText`, `canCrown`, `nextMoment`,
  `momentEndTick`). Ticket 01 puts these behind one `Stage` interface that a
  theme implements: its row count, its columns for a given room, its cells
  for a tick and a moment, its text fallback, its moment endpoints and priority. `register`
  picks the implementation from `options.stage` once and never branches on
  the theme again. The slime module implements it with no behaviour change;
  the existing tests are the proof.
- **The quest module** (`hooks/quest.ts`) is pure like `slime.ts`: given the
  room, the tick, the active moment and the rest mode, it returns the same
  pixels every time. It may reuse the slime module's pixel helpers (paint,
  half-block encoding, POOF) through shared exports. It does not import the
  engine.
- **`register.tsx`** keeps the clock, the events, repaint-on-change and the
  copy. It gains the `turn.complete` battle trigger.

### Room

- The quest stage is one fixed width, `QUEST_MIN_COLUMNS = 46`. Its room is
  0 or 1, and room 1 always means 46 columns. Slime slots do not size it.
- When `fitBranch` cannot fit those 46 columns beside the branch there is no
  quest stage: no Raster, no text fallback, and battles are not admitted. The
  branch layout reserves eight quest rows plus two meter rows. The width is
  computed from the hero's left offset, attack width, two-column gap and
  widest monster (16 columns).

### Sprites

Original pixel art in the NES palette the slimes use. Do not copy any
published game's sprites. The quest stage is 16 pixels tall (8 text rows),
like the slime stage.

- **Hero**: 20 wide by 16 tall (26 wide when attacking), after the horned SFC
  hero: a blue helmet with red horns, a gold crest and a red jewel, gold-trimmed
  blue armour, a red cape, a round blue shield with a red jewel, and a sword.
  Poses: WALK_A and WALK_B (legs apart, legs together), STAND, ATTACK (sword
  forward), HURT (for flicker), CHEER (sword up, for level-up). The hero
  stands near the left of the stage, about column 2.
- **Ground**: the bottom pixel row is a dotted ground line that scrolls left
  one pixel every 2 ticks while the hero walks. No other background.
- **Monsters**, up to 16 wide and 11 to 16 tall: `slime` (a green
  quest-slime, not one of the slime family's kin), `bat` (purple, wings
  flapping between two frames), `skeleton` (bone white), `ghost` (pale blue,
  bobbing two pixels). Twelve more join them, after the Dragon Quest II
  monster sheet: `metalSlime`, `healslime`, `eyeball`, `mage`, `gremlin`,
  `mummy`, `cobra`, `flame`, `treeface`, `cyclops`, `gargoyle` and
  `maneater`. Each has a display name for battle messages.
- **Skills**:
  - `slash`: the hero steps forward one pixel in ATTACK, and a white
    diagonal streak appears over the monster for 2 ticks.
  - `fireball`: an orange 6×6 pixel ball with a lighter centre travels from
    the hero's sword at the attack blade row to the monster, about 1 pixel
    every tick, at most 6 ticks.
  - `thunder`: a yellow zigzag bolt drops from the top of the stage onto the
    monster for 3 ticks, growing from 4 to 8 to all 16 pixel rows.
- The builder finalises the pixels by rendering them with the showcase
  renderer. The silhouettes and colours are the decision, not the exact
  pixels.

### Timing (80 ms ticks, the shared `FRAME_MS`)

- **Walk** (rest mode `breathe`, the default): WALK_A and WALK_B alternate
  every 4 ticks, and the ground scrolls 1 pixel every 2 ticks. Repaint-on-
  change still applies. The walk repaints every second tick, which is the
  cost of this theme; it is recorded in ADR 0014.
- **Still** (`slimesIdle: false`): STAND, ground fixed, nothing repainted at
  rest.
- **Battle**, about 30 to 38 ticks (2.4 to 3 seconds):

| Phase | Ticks | What happens |
|---|---|---|
| Approach | 8 | The monster scrolls in from the right edge with the ground and stops about 4 columns in front of the hero. The hero keeps walking. |
| Face-off | 4 | The hero stands. The ground stops. |
| Skill | 4–8 | The chosen skill plays; its length depends on the skill. |
| Hit | 6 | The monster flickers hidden and shown, 3 times. |
| Burst | 2 | The monster becomes the slime module's POOF. |
| Resume | 4 | The empty spot scrolls away and the hero walks on. |

  The battle's endpoint is the end of Resume. It hands back the walk on its
  next frame, with no jump in the ground's scroll (the scroll offset is a
  function of the tick, and the battle accounts for the ticks the ground was
  stopped).

### Randomness

- Each battle picks one of 4 monsters and one of 3 skills when it is
  admitted, and stores both in the `Moment`. The pixels are then a pure
  function of the Moment and the tick.
- `register` takes the picker from an injectable `random: () => number`
  (default `Math.random`). Tests pass a fixed sequence. The pure module never
  calls `Math.random`.

### Moments and priority

`Moment` gains `{ kind: 'battle'; startTick; monster; skill }`. Priority:

**king > level-up > battle > encounter > damage > rest.**

- King exists only on the slime stage. Battle exists only on the quest
  stage. Each theme declares which kinds it accepts.
- A lower or equal priority newcomer is dropped, never queued (ADR 0013). A
  task that finishes during a battle gets no battle.
- **Battle trigger**: `turn.complete` with no `agentId` and
  `reason === 'answer'`, any duration, when a quest stage is seated. On the
  slime stage `turn.complete` keeps today's King rule unchanged.
- **Command**: `/quest-battle [monster] [skill]` starts the same battle immediately; either roster key (or a monster display name with spaces/hyphens removed) can be fixed, in either order and case-insensitively, with omitted parts random and the same room and priority rules. Unknown or repeated picks list the current roster and start nothing.
- **Encounter (quest)**: on the first seated frame after `session.start`, the
  hero walks in from the left edge to its spot over about 12 ticks.
- **Damage (quest)**: on `classic.PostToolUseFailure` without
  `is_interrupt`, the hero flickers (HURT, hidden and shown, 6 ticks), with
  the same 25-tick cooldown.
- **Level-up (quest)**: on `classic.PostCompact`, the hero jumps 2 pixels in
  CHEER and is drawn in GOLD and WHITE for 2 ticks at the top. About 8 ticks.

### Copy

| Situation | Reply |
|---|---|
| `/slime-king` on the quest stage | `But there are no slimes here. The hero walks on.` |

The command stays registered on both stages, so switching the option never
leaves a stale command behind.

### Text fallback

One STAND hero, drawn in half blocks in the armour colour, followed by the
ground line. No monster.

## Testing Decisions

- Test external behaviour only: the cells a stage returns for a room, tick
  and moment, what the mod blits and when, and the reply text. No assertions
  on internal tables.
- **Seam 1, the quest module (pure)**:
  - At rest the hero stands at its spot, grounded.
  - Walking shows two different hero frames and a ground that shifts
    within a cycle, and returns to the same frame after the cycle.
  - With rest `still` every tick yields the same cells.
  - A battle for each of the 4 monsters and each of the 3 skills shows the
    monster, shows the skill's colour at some tick, hides the monster on
    some tick of Hit, and ends with no monster pixel left.
  - The frame after a battle's end equals the plain walk frame at that tick.
  - The battle lasts 2.4 to 3 seconds at `FRAME_MS`.
  - With no room there is no stage, and any room is exactly 46 columns.
  - Quest and slime Rasters and text fallbacks use 8 rows.
  - Encounter starts with the hero off its spot and ends on the rest frame.
  - Level-up contains gold.
- **Seam 2, the mod through `claude-code/testing`**:
  - With no `stage` option the slimes render exactly as before (the existing
    suite passes unchanged).
  - With `stage: 'quest'` a main-agent `turn.complete` with
    `reason: 'answer'` blits a battle, with the fixed random sequence choosing
    the monster.
  - A subagent `turn.complete`, or a reason other than `answer`, does not.
  - A second `turn.complete` during a battle does not restart it.
  - When the quest stage does not fit, `turn.complete` blits nothing.
  - Tool failure and compaction blit the quest damage and level-up.
  - `/slime-king` on the quest stage returns the quest reply.
  - With `slimesIdle: false` nothing blits at rest on the quest stage.
- `npm run check` passes (tests, plugin validate, plugin test, typecheck).
- Visual check: add a `--stage quest` option to `docs/showcase/render_mod.py`.
  Render one still, one contact sheet (`--sheet`) of a battle per skill, and
  a GIF. Inspect them once. Add the quest still to the README beside the
  slimes, with one line on how to pick it in `/config`.

## Out of Scope

- More monsters, skills, heroes, a boss for long tasks, HP, EXP or any
  counter. Planned for later; the tables should make adding a monster or a
  skill a new row, not new logic.
- Changes to hudline's stdout status line, its themes or its Narration.
- A slash command to switch themes live.
- Sound and any on-screen battle text.
- Releasing the plugin. Bump `plugin.json` to 0.8.0 in the last ticket; the
  release itself follows `docs/RELEASING.md` separately.

## Further Notes

- ADR 0014 records the stage choice and the battle on every finished task.
- If `turn.complete` turns out not to report `reason: 'answer'` for an
  ordinary finished turn, say so in the PR instead of inventing another
  trigger.
