# 15. Stages are sixteen pixels tall

Date: 2026-10-23

## Status

Accepted. Changes the stage sizes stated in
[ADR-0013](0013-one-moment-owns-the-stage.md) and in
`docs/specs/quest-stage.md`.

The later [slime art and motion spec](../specs/dq-slime-motion.md) supersedes
the slime widths below: kin are 11 columns wide with 2-column gaps, so four
kin occupy 50 columns. The stage remains 16 pixels tall.

## Context

The slime stage was 6 pixels tall (3 text rows) and the quest stage 8 pixels
tall (4 text rows). The branch title used a 3x5 font. At 8 pixels the quest
hero was a blue blob with a sword. It could not show the helmet, the shield or
the Loto crest, so it did not read as a Dragon Quest hero.

## Decision

- **Both themes are 16 pixels tall.** Each stage is 8 text rows, two pixels
  per cell through half blocks. A slime slot is 14 columns.
- **The quest hero is the Loto hero.** It wears a winged helmet with the gold
  crest, carries a crest shield, and holds a sword with a winged hilt. The
  8-pixel hero had no room for that equipment.
- **The branch title uses a 5x7 font.** Its 4 text rows sit centred against
  the 8-row stage, with 2 empty rows above and below.
- **Half blocks, not octants.** Octant cells (2x4 pixels) were prototyped and
  rejected. A cell holds only two colours, so at 2x4 the faces and the crest
  smear.

## Alternatives

- **Keep the 8-pixel hero:** the user found it too crude. It had no room for
  the equipment.
- **Octant cells:** more pixels per text row, but two colours per cell smear
  the faces and the crest.

## Consequences

The HUD grows from 5 rows (6 with the quest) to 10: 8 stage rows plus 2 meter
rows. A band shorter than 10 rows shows the branch chip instead. Stages are
wider too. The quest stage needs 46 columns, and four slimes need 56, so a
narrow band shows fewer slimes or no quest stage sooner. The quest stage
claims exactly its 46 columns whenever it fits, rather than a multiple of the
slime slot.

## Amendment — 2026-10-24

The quest hero was redrawn after the horned SFC hero, per the user's reference
art. It wears a blue helmet with red horns and a gold crest, a red jewel,
gold-trimmed armour and a red cape, and carries a round shield with a red
jewel. This replaces the Loto hero's winged helmet and winged hilt above. The
hero remains 16 pixels tall.
