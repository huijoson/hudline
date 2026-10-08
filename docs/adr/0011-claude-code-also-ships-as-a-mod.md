# 11. Claude Code also ships as a mod

Date: 2026-10-09

## Status

Accepted.

## Context

Claude Code gained mods: plugins of function hooks that draw their own UI
inside the CLI. A mod can draw above the prompt, read the session's usage
(`$.session.usage()`: context fill, quota windows, cost) without a Payload,
and keep state across refreshes. A separate mod, `pixel-hud`, had grown in
another repository to show the git branch in 8-bit pixel letters above a copy
of this line, and its copy had drifted: it printed the quota windows as
percent **used**, the reverse of a Quota window here, and estimated thinking
from streamed characters.

Two products answering the same question with opposite numbers under the same
labels is the worst outcome this package can have. One of them had to go, or
they had to be one.

The status line cannot go. It is the only thing that reaches the other Hosts —
Copilot CLI, Antigravity, Qwen Code — and a mod exists only inside Claude Code.

## Decision

The mod moves into this repository, under `plugins/pixel-hud/`, and this
repository becomes a Claude Code marketplace (`.claude-plugin/marketplace.json`).
The npm package does not change shape: `files` still ships `bin` and `src`
alone.

The mod reads every Field the way this package does. Quota windows are
remaining, the ramps and their cut-offs are the same, cost is written the way
the Host writes it, token flow is the two layers summed from the transcript
with rows de-duplicated by message id, and narration reuses the threshold
cut-offs. It draws the neon default line with no Format and no Theme.

The rules are ported, not shared. A mod is TypeScript in a sandbox with no
`require` and no Node; `src/` is CommonJS that reads `fs` and `process`.
Sharing a module would mean a build step in a package whose point is that it
has none. The duplication is the smaller cost, and `plugins/pixel-hud`'s tests
pin the same sample values the README uses so drift shows up as a failure.

## Consequences

- A Claude Code user chooses one surface: the status line (configurable, any
  Host) or the mod (above the prompt, the branch in pixel letters, no Node).
  Running both shows everything twice.
- A change to a Field's meaning now has two places to land. The tests on each
  side are the guard.
- The mod cannot read a file over 4 MiB, so on a long Conversation `TH` goes
  Missing in the mod while the status line still shows it. The other token
  Fields carry on from the responses the mod sees.
- The mod is versioned in its own `plugin.json`, apart from `package.json`.
