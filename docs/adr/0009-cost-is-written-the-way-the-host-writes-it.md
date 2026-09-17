# 9. Cost is written the way the Host writes it

Date: 2026-09-17

## Status

Accepted.

## Context

Someone reported that the cost on their status line disagreed with `/cost`. It
did, and only in the last two places. `/cost` prints four decimals at or below
$0.50 and two above it, rounding through `Math.round(e * 100) / 100` before the
two-decimal form; the Field printed two decimals unconditionally. For a session
that had cost $0.2303675, the official surface said `$0.2304` and the Bar said
`$0.23`.

That is not an error, but it is indistinguishable from one. Most sessions cost
under fifty cents, so the two surfaces disagreed nearly always, on the one
number a reader is most likely to hold up against another. A status line that
has to be explained is worth less than one that agrees.

The rule itself is arbitrary — why four decimals at all? — and that is exactly
the argument against copying it into the Field. Precision is appearance, and
appearance belongs to the Theme, not to the Field. But which appearance is the
*default* is a product decision ([ADR-0006](0006-the-designed-theme-is-the-default.md)),
and this product's default is a line that people compare against the official
one.

## Decision

`cost` declares two Representations: **compact**, two decimals, which is what
the Field printed before; and **exact**, which reproduces the Host's own
rendering rule — four decimals at or below $0.50, two above, with the Host's
rounding. The default Theme draws the exact one. `plain` keeps compact, and with
it byte-identity to what shipped before Themes existed.

## Alternatives

**Change the Field's single format to the Host's rule.** Rejected: it takes two
cells from every Theme in the common case, and it puts a display decision inside
a Field. It is also the smaller change, which is why it is worth recording that
it was not the one taken.

**Keep two decimals and document the difference.** Rejected. The reader it
misled is the reader who reported it.

**Print four decimals always.** Rejected: above $0.50 it would disagree with the
Host in the other direction — `$8.7043` where `/cost` says `$8.70`.

## Consequences

- The designed default line is two cells wider whenever a session is under fifty
  cents. Width is a real cost, and `--format` remains the answer to it.
- The exact Representation is defined by agreement with another program, so it
  is a promise about that program. If that formatter moves, this rule is what
  has to move — and a Host with no such formatter needs an answer of its own
  rather than a borrowed one.
