# Spec: Dragon Quest slime motion for pixel-hud

Status: ready for agent · 2026-10-18 · shaped with `/impeccable shape`

ADR 0015 enlarged the stage to 16 pixels (8 text rows). The dimensions and
motion below describe the current 11-column kin on that stage; the original
7-pixel drafts have been superseded.

The faces were later redrawn closer to Dragon Quest: round white eyes around a
centred pupil, looking straight ahead, and a wide crescent grin with a salmon
mouth. The King is 22 pixels wide under a crown of gold, purple and green. The
merge crowns a King Slime, a Gold King Slime or a Metal King Slime, picked at
random each time; each has its own body colours, and the Gold King's crown band is
silver. The replies below name whichever King it is.

Each kin was then modelled on its Dragon Quest counterpart and narrowed to 11
pixels. The slime, she-slime and metal slime share one onion-shaped sprite set,
a thin tip flaring into a round bulb; the bubble slime has its own puddle set, a
low dome over a melted skirt with bubbles above. The fifth kin, the liquid metal
slime, has a flowing silver mound sprite set.
All five poses exist in all three sets. Each kin has its own palette: mouths
are salmon, dark purple and red for the onion kin, with dark grins for both
puddle-shaped kin. The merged blob stays 17 wide and all Kings stay 22 wide.
The Gold and Metal Kings wear a plated sprite with banded metal shading; the
blue King Slime keeps its own. A clean `main` heading uses 32 columns, so the
55-column family fits from 87 columns. The README family showcase uses that
minimum width; at 84 columns only four kin fit under the branch-first fit rule.

## Problem Statement

The original baseline before these changes was as follows.

The slime family beside the branch in the pixel-hud mod reads as generic pixel
blobs, not Dragon Quest slimes, and it moves stiffly. A hop is ten 140 ms
ticks drawn from only two poses (stand and squash) with a two-pixel lift, so it
jerks rather than bounces. By default the slimes do not move at all, and the
King Slime show's leaps (two in, a mid-air collision, two home) are drawn from
the same two poses, and the show ends without a payoff. The
faces have black dot eyes and no mouth, so the one thing that makes a slime
recognisably a Dragon Quest slime (white eyes, a wide grin, the pointed tip)
is missing.

## Solution

Redraw the slimes with the classic Dragon Quest face and give them motion
built on animation principles: anticipation, squash and stretch, overshoot,
and offset timing. Specifically:

- The frame rate rises from 140 ms to 80 ms, and a frame is only repainted
  when it differs from the last one.
- At rest the slimes breathe by default, with the side-to-side squish that
  Dragon Quest enemies make while they wait in battle, plus an occasional
  blink.
- With `slimesHop` on they hop with a full crouch, launch, hang, land and
  rebound cycle.
- The King Slime show is restaged the Dragon Quest way.
- Three small Dragon Quest moments are added: the encounter when a session
  starts, the damage flicker when a tool fails, and the level-up when the
  conversation is compacted.
- The `/slime-king` replies are rewritten in Dragon Quest battle-message
  style.

The HUD's numbers stay first. Motion marks moments; it never narrates.

## User Stories

1. As a developer, I want the slimes to have Dragon Quest faces (white eyes
   with dark pupils, a wide open grin, a pointed tip), so that I recognise
   them as Dragon Quest slimes at a glance.
2. As a developer, I want the five kin (slime, she-slime, metal slime, bubble
   slime, liquid metal slime) to keep their colours, so that the family I know
   stays the same.
3. As a developer, I want each kin's lower edge drawn in a darker shade of its
   body, so that the slimes look round rather than flat.
4. As a developer, I want each kin to use an 11-column slot on the 8-text-row
   stage, giving up slots before shortening the branch name, so that the
   branch name keeps its room.
5. As a developer, I want the slimes to breathe at rest by default with a
   gentle squish every few seconds, so that the HUD feels alive without
   pulling my eye.
6. As a developer, I want each slime to breathe on its own period, so that
   they never move in lockstep.
7. As a developer, I want a slime to blink now and then, so that it reads as
   a character rather than a sprite.
8. As a developer who finds any motion distracting, I want to turn the resting
   motion off with a `slimesIdle` option, so that the slimes sit perfectly
   still.
9. As a developer with `slimesHop` on, I want each hop to crouch before it
   leaves the floor, so that the jump has weight.
10. As a developer with `slimesHop` on, I want the slime to stretch as it
    launches and falls and squash as it lands, so that the motion looks
    elastic.
11. As a developer with `slimesHop` on, I want a small rebound after each
    landing, so that the slime settles instead of stopping dead.
12. As a developer with `slimesHop` on, I want the pause between hops to vary
    per slime, so that the family has no visible beat.
13. As a developer, I want motion at 80 ms per frame, so that it looks smooth.
14. As a developer, I want the mod to skip repainting when a frame is
    unchanged, so that a smoother frame rate costs nothing while the slimes
    are still.
15. As a developer starting a session, I want the slimes to drop onto the
    stage one by one, so that it feels like a Dragon Quest encounter.
16. As a developer, I want the encounter to play once per session start and
    not on every redraw, so that it stays special.
17. As a developer, I want a slime to flicker the way a Dragon Quest enemy
    does when hit whenever a tool call fails, so that a failure registers
    without a message.
18. As a developer, I want a tool call I interrupted myself not to count as a
    failure, so that pressing Escape does not hurt a slime.
19. As a developer, I want damage flickers to be rate-limited, so that a burst
    of failing tools does not strobe.
20. As a developer, I want the slimes to hop together with a gold flash when
    the conversation is compacted, so that compaction reads as a level-up.
21. As a developer, I want the King Slime show to keep playing after a long
    task, so that a finished long task is still celebrated.
22. As a developer watching the King Slime show, I want the slimes to keep
    leaping toward the middle and colliding in mid-air, now with the new hop's
    squash and stretch, so that the gathering looks alive.
23. As a developer, I want the King Slime to drop in from above and land with
    a heavy squash and rebound, so that its arrival has weight.
24. As a developer, I want the king to keep its blink and gold/white twinkles
    while it reigns, so that the familiar show is still there.
25. As a developer, I want the king to flicker as if defeated and then burst
    back into its slimes, each arcing home from where it collided, so that the
    show ends with a payoff and no slime pops out of nowhere.
26. As a developer, I want the whole King Slime show to last about as long as
    it does today (6.5 to 7 seconds), so that the faster frame rate does not
    rush it.
27. As a developer, I want a King Slime show to take priority over any other
    moment, and moments to take priority over the resting motion, so that two
    animations never fight over the stage.
28. As a developer, I want the slimes to return to their exact resting frame
    after any moment ends, so that nothing is left mid-pose.
29. As a developer running `/slime-king`, I want the reply written as a
    Dragon Quest battle message, so that the command has the same flavour as
    the art.
30. As a developer on the desktop surface or anywhere without a Raster, I want
    one resting frame of the new slimes as text, so that the fallback matches
    the new look.
31. As a developer on a narrow terminal, I want slimes to keep giving up their
    room before the branch name does, so that nothing about the layout rules
    changes.
32. As a developer whose terminal is too narrow for the king, I want the show
    to stay refused, so that the king is never clipped.
33. As a developer, I want the showcase images in the README to show the new
    slimes, so that the documentation matches what I install.

## Implementation Decisions

### Modules

- **The slime module** owns all pixel art, timing tables and the rendering of
  a frame. It stays pure: given the slime count, the current tick and the
  active moment, it returns the same Raster cells every time. The engine never
  runs inside it.
- **The mod's register module** owns the clock, the choice of moment, the
  engine events that start moments, the repaint-on-change check, the options,
  and the `/slime-king` copy.
- **The plugin manifest** gains a `slimesIdle` user option and updated
  descriptions.

### Frame rate and repainting

- Frames run every 80 ms (up from 140 ms).
- The register module remembers the last cells it blitted and blits only
  when the new cells differ. This replaces today's "is still" special case,
  which can go.
- A blit that comes back denied still un-seats the stage, as it does today.

### Sprites

Palette letters extend B (body), H (highlight), Y (crown band), J (red
jewel), P (purple crown fabric) and G (green crown fabric):

- **W**: eye white
- **K**: pupil, mouth corners and outlines
- **M**: mouth interior, in each kin's own colour
- **D**: shade, a darker version of each kin's body colour, added to each
  kin's entry

Each kin has 11-pixel-wide stand, blink, squash, wide and stretch sprites,
with its feet on the floor of the 16-pixel stage. Stand heights are 10 pixels
for the onion kin, 9 for the bubble slime and 8 for the liquid metal slime;
stretch heights are 12, 12 and 10 respectively. Airborne stand poses lift by
the unused stage height (6, 7 and 8 pixels), keeping each tip at the top.
The authoritative pixel rows are the `ONION`, `PUDDLE` and `LIQUID` sprite
sets in the slime module.

A blink replaces eye whites with body colour and draws a closed lid across
each eye's pupil row: `.BWWWB.` / `.BWKWB.` becomes `.BBBBB.` / `.BKKKB.`.

All three Kings are 22 pixels wide and 16 pixels tall, with white eyes,
pupils, a grin and a shaded lower edge. Their blink uses the same closed-lid
pattern, derived from the standing sprite. The Gold King's crown band is
silver; its jewels retain their colours. The landing squash is generated
from the sprite: drop the first row and extend each remaining row by one
pixel on each side.

### Timing tables (in 80 ms ticks)

These are data tables in the slime module, not logic.

**Breath** (resting motion, on by default, turned off by
`slimesIdle: false`):

- STAND for most of the cycle, then WIDE for 2 ticks, then back to STAND.
- Each slime has its own period: 36, 44, 50, 40 and 46 ticks, so from about 2.9
  to 4 seconds.
- A BLINK of 1 tick plays roughly every third cycle, at a different offset
  for each slime.
- With `slimesIdle: false`, rest is the plain STAND frame and nothing is
  repainted.

**Hop** (with `slimesHop: true`, which replaces breath):

| Phase | Pose | Lift (pixels) | Ticks |
|---|---|---|---|
| Crouch | SQUASH | 0 | 2 |
| Launch | STRETCH | 0 | 1 |
| Rise | STAND | stage height − stand height | 1 |
| Hang | STAND | stage height − stand height | 2 |
| Fall | STRETCH | 0 | 1 |
| Land | SQUASH | 0 | 2 |
| Rebound | STRETCH | 0 | 1 |
| Settle | STAND | 0 | 1 |
| Rest | STAND | 0 | 6 to 14 |

- The rest length differs per slime and per cycle. It comes from a fixed,
  deterministic sequence so that tests are stable. No `Math.random`.
- A blink may fall inside the rest.

### Moments and priority

A single `Moment` value describes which one-off animation, if any, owns the
stage. It records its kind, the tick it began on and, for damage, which slime
it targets. Only one moment can hold the stage at a time, in this order of
priority:

**King > level-up > encounter > damage > resting motion (breath or hop).**

- A new moment of lower priority than the active one is dropped, not queued.
- A King trigger during another moment replaces that moment, as long as the
  king has room.

**Encounter** (on `session.start`, the first time the stage is seated after
it):

- Slimes drop in from above one at a time, 3 ticks apart.
- Each one falls through the clipped top of the stage in 3 ticks, lands in
  SQUASH for 2 ticks, rebounds in STRETCH for 1 tick, then joins its resting
  motion.
- The last of five kin reaches its resting endpoint after 18 ticks (1.44
  seconds); fewer kin finish sooner.
- It does not replay on later redraws, polls or `/clear` refreshes within the
  same session.

**Damage** (on `classic.PostToolUseFailure` when `is_interrupt` is not true):

- One slime flickers: hidden and shown in turn, 6 ticks, 3 blinks.
- The targeted slime rotates through the family on each failure.
- A new damage moment is ignored if one started within the last 25 ticks (2
  seconds).
- It is ignored while a higher-priority moment holds the stage.

**Level-up** (on `classic.PostCompact`, whether manual or automatic):

- All slimes play one hop in unison, with no rest phase. This is the only
  time they move in step, which is what makes it read as an event.
- For the 2 ticks at the top of the hop, the body and highlight are drawn in
  GOLD and WHITE.

**King Slime show** (the trigger rules are unchanged: a main-loop answer
after a task of 20 seconds or more, or `/slime-king`; and it needs two
slimes' worth of room, 22 columns; the 24-column landing squash is clipped
to those slots at the minimum under the existing stage-clipping policy):

| Phase | Ticks (about) | What happens |
|---|---|---|
| Gather | 18 | Two leaps toward the middle, as shipped in pixel-hud 0.6.1 but with the new hop's poses: the first lands halfway, the second is cut on its fall where the slimes collide in mid-air (`COLLIDE`, further in than halfway). Horizontal progress happens only while a slime is airborne. |
| Merge | 6 | The existing merged frames, 3 ticks each: the splat on the floor, as wide as the king, then the blob bouncing up. |
| Crown drop | 6 | The king falls in from above the stage, lands in a squash (one pixel shorter, one wider per side, clipped to the stage), then rebounds. |
| Flash | 2 | All-white king, then the poof, as today. |
| Reign | 40 | The existing blink and gold/white twinkles. |
| Defeat | 6 | The king flickers hidden and shown, like the damage moment. |
| Poof | 2 | The existing poof. |
| Scatter | 6 | The slimes burst out in one arc each, from where they collided (`COLLIDE`) to their home positions, landing in SQUASH. This replaces 0.6.1's two hops home. |

- The total is about 86 ticks (6.9 seconds) and stays exported as
  `KING_SHOW_TICKS`.
- The show ends on the exact resting frame.
- Keep pixel-hud 0.6.1's fix (PR #3): in every leap and in the Scatter arc,
  each slime's position rounds away from the middle (floor left of it, ceil
  right of it), so where they press together every slime still shows. With 2,
  3, 4 and 5 slimes, every body is drawn at the collide frame and the first
  Scatter frame.

### Copy (Dragon Quest battle-message style)

| Situation | Reply |
|---|---|
| Crowned | `The slimes band together... A King Slime appears!` (or `A Gold King Slime`, `A Metal King Slime`) |
| Already reigning | `The King Slime is already here!`, naming the King that reigns |
| No room | `But there was no room for a King Slime! Widen the terminal.` |
| `/slime-king` command description | `Call the slimes together to form a King Slime` |

### Options

- New `slimesIdle` boolean, default `true`, titled "Slimes breathe", described
  as: "Let the slimes squish and blink at rest. Off: they sit perfectly still
  until a moment moves them."
- `slimesHop` keeps its meaning. When it is on it supersedes breath.
- Moments play regardless of either option, as the King Slime show already
  does today.
- Turning breath on by default reverses the "sit still by default" decision
  in commit c266c88. Record this as a new ADR, the next number after 0011.
  The cost argument that justified sitting still is answered by
  repaint-on-change.
- ADR 0005 governs the status-line Narration, which is driven by the
  payload. These mod moments are animations driven by engine events, and
  carry no text. Note this distinction in the new ADR.

### Text fallback

- The text fallback draws the new STAND frame, each slime in its body colour.
- Eyes and mouth collapse into the half-block glyphs. That is acceptable.

## Testing Decisions

- Test external behaviour only:
  - the cells the slime module returns for a given count, tick and moment;
  - what the mod blits, and when;
  - the reply text.
- Derive timing and kin selection from the exported tables rather than
  copying them into tests. Pixel and motion expectations must still be
  independent of the rendering helpers they exercise.
- **Seam 1, the slime module (pure).** This is the prior art in the "slime
  family" and "King Slime" describe blocks. Cover:
  - The rest frame has every slime grounded.
  - A hop leaves the floor at some tick and lands again.
  - A hop shows at least three distinct silhouettes (squash, stretch, stand).
  - Breath differs from rest at some tick and returns to it.
  - Two slimes are never in the same pose at every tick of a cycle.
  - The King Slime show starts with the slimes at home, contains gold, and
    ends on the exact resting frame.
  - Keep the 0.6.1 show tests, rescaled to the new ticks: the slimes move only
    in the air; they collide airborne, further in than halfway, with every body
    showing; the next frame is one grounded splat as wide as the king in the
    selected King's body colours; for 2, 3, 4 and 5 slimes every body shows at the
    collide frame and the first Scatter frame.
  - Replace the 0.6.1 "leap home in two hops" test: Scatter starts where the
    slimes collided, is airborne at some tick, and ends at home in SQUASH
    before the resting frame.
  - Replace the `KING_SHOW_TICKS` is 50 test with one that pins the total to
    6.5 to 7 seconds at the frame constant.
  - Level-up contains gold and has every slime airborne on the same tick.
  - Damage hides the targeted slime on some tick and leaves the others drawn.
  - Encounter starts with the stage empty or clipped and ends on the resting
    frame.
- **Seam 2, the mod driven through `claude-code/testing`.** This is the prior
  art in the tests that use `mock.clock(on)`, record `ui.blit` calls and mount
  the band. Cover:
  - Breath blits by default.
  - With `slimesIdle: false` nothing is blitted at rest, and the King Slime
    still plays.
  - No blit repeats the previous cells.
  - Firing `classic.PostToolUseFailure` blits a damage flicker.
  - A failure with `is_interrupt: true` does not.
  - Firing `classic.PostCompact` blits gold.
  - The encounter plays once after `session.start`, and not again after a
    later remount within the session.
  - The new `/slime-king` replies, including the "no room" case.
- Update the existing tests that hard-code 140 ms to the new frame constant.
- Update the tests that assert "sits still by default" to the new default.
- `npm test` must pass, and the plugin must type-check against its bundled
  types.
- Visual check: regenerate `docs/showcase/pixel-hud.png`,
  `pixel-hud-king.png` and the README's `pixel-hud-king.gif` with the showcase
  renderer (`render_mod.py`, `--king`, `--gif`) and inspect them once. The
  renderer derives the `--king` catch-up, GIF clock advances and frame
  durations from `FRAME_MS`; keep `--king` catching the king mid-reign and
  the GIF's single shared palette.

## Out of Scope

- Changes to hudline's stdout status line, its themes or its Narration.
- The branch glyphs, the meter, the HUD's layout and the rules for when
  slimes give up their room.
- Additional kin beyond the five documented here, or further changes to the
  11-column slots and 16-pixel stage height.
- Sound, and any on-screen text message for moments other than the
  `/slime-king` replies.
- Moments for other events, such as turn start, subagents or permission
  prompts.
- Releasing the plugin (the version bump). That is done separately after
  merge.

## Further Notes

- Fidelity target: Dragon Quest I–V era 8-bit and 16-bit slime language,
  meaning the face and the battle-idle squish. Do not copy Square Enix sprite
  pixels. Draw original pixel art in that idiom.
- Reference design brief: the shaping session of 2026-10-18 recorded in
  `PRODUCT.md`. Product principle 3 ("cheap at rest") is why
  repaint-on-change ships with the frame-rate increase.
- If an engine event named here turns out not to fire in practice, drop that
  moment and say so in the PR rather than inventing a substitute trigger.
