# hudline

See context usage and remaining quota beneath your Claude Code prompt.
Track cumulative input and output tokens, with cache-read and thinking shares.

![hudline default neon status line: context 42% used, 5-hour quota 61% remaining, weekly quota 83% remaining, 1.2M input tokens with 98% cache reads, and 21.1k output tokens with 24% thinking.](https://raw.githubusercontent.com/huijoson/hudline/main/docs/showcase/hudline.png)

*Sample values, rendered by hudline with its default format and neon theme;
wrapped at 84 columns. Reset times in this image use UTC.*
5-hour and weekly quotas require Claude Pro/Max quota data from the host.
Fields without data disappear automatically. [Reproduce this image](docs/showcase/README.md).

| What to watch | How to read it |
|---|---|
| **Context & quota** — `CTX`, `5H`, `7D` | `CTX 42%` is context **used now**. `5H 61%` and `7D 83%` are quota **remaining**, followed by their reset time or date. The meters measure different things: full context is bad; full remaining quota is good. |
| **Token usage** — `SENT`, `CR`, `OUT`, `TH` | `SENT 1.2M` is cumulative input, including cache reads and writes; `CR 98%` is the cache-read share of that input. `OUT 21.1k` is cumulative output; `TH 24%` is the thinking share of that output. These shares are breakdowns, not additional tokens. |

**Context occupancy is not cumulative token usage.** Compaction can lower `CTX`
while `SENT` and `OUT` continue counting over the conversation. Model, effort
and the host-reported session cost (`$1.23` in the example) also appear when available.

## Quick start

```sh
npx -y hudline init     # pick a starting line, edit it, install it
```

Choose **Claude Code** and the **default** starting line for the full view above.
The menu lets you remove fields if you prefer a shorter line. Requires Node.js 18+.

Run it in a **plain shell**, not inside the CLI you are configuring — a
full-screen editor inside another full-screen editor does not work. If you do,
it detects that and switches to a plain typed flow instead.

Or install by hand:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y hudline"
  }
}
```

Want to change the layout? One [Format string](#the-format) controls what appears;
[themes](#themes) control its look. Also supports
[GitHub Copilot CLI, Antigravity CLI and Qwen Code](#supported-clis), with fields
depending on what each host supplies. Zero npm dependencies.

During rendering, hudline reads the host payload and, for conversation token
totals, its transcript. No network calls, hooks or persistent state files.

> Renamed from `cc-token-statusline`. Existing `--show` / `--hide` commands keep
> working unchanged.

## Reading the default line

That is one line; here it is in pieces.

The line shows **how much context is occupied, how much quota remains, and how
many tokens have moved over the conversation**. Token totals are cumulative;
they do not measure a spending rate or predict when quota will run out.

| piece | exact meaning |
|---|---|
| ` Opus ` | the model, drawn as a filled **chip**. |
| `:high` | reasoning effort, when the model has one. Higher effort buys more thinking tokens, which are billed as output. |
| `CTX ▰▰▱▱▱ 42%` | how full the context window is **right now**. **Full is bad.** Occupancy can drop when the conversation compacts. |
| `5H ▰▰▰▱▱ 61% (18:30)` | 5-hour quota **remaining** (not used), and its reset time. Full is good. |
| `7D ▰▰▰▰▱ 83% (09/13)` | weekly quota remaining, and its reset **date** (`MM/DD`). Full is good. |
| `$1.23` | what this session has cost so far, as the CLI reckons it. The one number in actual money. |
| `SENT 1.2M` | every token sent to the model, summed over the whole conversation. Each turn resends the conversation, so this climbs far past the context window — see below. |
| `CR 98%` | of that `SENT`, the share served from **cache read**. The remainder consists of cache writes and uncached input. A higher share means more of the input came from cache. |
| `OUT 21.1k` | tokens the model produced. Per token these are the most expensive on the line. |
| `TH 24%` | of that `OUT`, the share that was **thinking**. Thinking is billed as output, so a high share on an expensive model is where money goes quietly. Lower `--effort` to cut it. |

Two things that look like contradictions and are not:

- **`SENT` is far larger than `CTX`.** `CTX` is occupancy *now*; `SENT` is a
  running total since the conversation began. Every turn resends the whole
  conversation, so a 30-turn session on a 200k window will have sent millions.
- **Compaction empties `CTX` but not `SENT`.** A token total covers one
  conversation, and a conversation is one transcript. `/clear` starts a fresh
  count; compacting does not.

The meters read in opposite directions on purpose: a meter answers *how much of
this is there*, and whether that is good news is the colour's job, not the
bar's. Green is fine, amber is close, red is not.

`{cwd}` is deliberately **not** on the default line — every CLI supplies it, so
it costs width everywhere, and it does not answer the question the line is for.
Add it back with `--format` if you want it.

Two things appear only when they apply:

```
 Opus 5 :high ★ CTX ▰▰▰▰▱ 88% ★ 5H ▱▱▱▱▱ 6% (14:30) ★ 7D ▰▱▱▱▱ 12% (08/27) ★ $1.23 ★ Thy context runneth over!
 Opus 5 :high ★ CTX ▰▰▱▱▱ 30% ★ 5H ▰▰▰▰▰ 90% (14:30) ★ 7D ▰▰▰▰▰ 95% (08/27) ★ $1.23 ★ Explore draws near!
```

That last segment is `{say}`. See [Narration](#narration).

**The default line is wide** — around 118 columns once there is a transcript to
count. It wraps on an 80-column terminal. That is a starting point, not a
recommendation: trimming it is what `--format` is for.

```sh
# ceilings and money only, no volume
hudline --format="{model}[:{effort}]|CTX {ctx}|5H {5h}[ ({5h_reset})]|7D {7d}|{cost}|{say}"

# add the directory back
hudline --format="{model}[:{effort}]|CTX {ctx}|5H {5h}|7D {7d}|{cost}|{cwd}|[SENT {sent}] [CR {cr}]|[OUT {out}] [TH {th}]|{say}"
```

## The Format

A Format describes the line. Four rules:

| | |
|---|---|
| `{field}` | a field's **value** — the label is yours to write |
| `\|` | splits segments; a segment is the unit that disappears |
| `[...]` | an optional group; a narrower unit that disappears; nestable |
| `\\|` `\\[` `\\{` | a literal `\|` `[` `{` |

**A field with no data never prints a placeholder** — it takes the text around
it with it. A missing field removes its innermost enclosing `[...]`; with no
enclosing group, it removes its whole segment. Surviving segments collapse
their internal whitespace and are joined by the separator.

```sh
hudline --format="{model}[:{effort}]|ctx {ctx}|7d {7d} left[ (resets {7d_reset})]|{cwd}"
```

- no effort level on this model → `Opus 5`, not `Opus 5:`
- API-key auth, so no weekly quota → the whole `7d` segment vanishes
- reset time unavailable but quota known → `7d 83% left`

That rule is also what lets one Format survive a change of CLI. The same string,
unedited, on four of them:

```
claude-code   Opus 5:high ★ ctx ▱▱▱▱▱ 8% ★ 7d ▰▰▰▰▱ 83% left (resets 08/27) ★ doitservers
qwen-code     Qwen3-Coder ★ ctx ▰▱▱▱▱ 12% ★ qwen-project
copilot-cli   Claude Sonnet 4.5 ★ ctx ▰▱▱▱▱ 22% ★ doitservers
antigravity   Gemini 3 Pro ★ ctx ▰▱▱▱▱ 15% ★ doitservers
```

No holes, no `n/a`, no `undefined` — the fields those CLIs cannot supply take
their own text with them and nothing else moves.

## Fields

`hudline --list-fields` prints this table with live sample values and marks what
your CLI cannot supply. Add `--host=qwen-code` to see it for another CLI.

| field | means |
|---|---|
| `{model}` | current model, as the CLI names it |
| `{effort}` | reasoning effort level — only on models that have one |
| `{model_id}` | full model identifier |
| `{ctx}` | how full the context window is |
| `{ctx_left}` | how much context window is left |
| `{ctx_size}` | total size of the context window |
| `{7d}` `{5h}` | weekly / 5-hour quota **remaining** — Claude Pro/Max plans |
| `{7d_reset}` `{5h_reset}` | when that quota resets |
| `{quota}` `{quota_reset}` | single model quota remaining / when it resets — Antigravity |
| `{branch}` | current git branch |
| `{cwd}` | shell directory you are in, follows `/add-dir` |
| `{dir}` | project root the session started in |
| `{added}` | how many extra directories are in scope |
| `{cost}` | what this session has cost so far |
| `{lines_add}` `{lines_del}` | lines added / removed this session |
| `{agent}` | name of the subagent running now |
| `{style}` | active output style |
| `{session}` | name you gave this session |
| `{ver}` | CLI version |
| `{vim}` | vim mode, `INSERT` or `NORMAL` |
| `{pr}` | pull request number, inside a PR worktree |
| `{fast}` `{think}` | the words `fast` / `think`, when those modes are on |
| `{say}` | one line about the most alarming thing right now |
| `{sent}` | everything sent to the model, whole conversation |
| `{cr}` `{cw}` | **share of `{sent}`** read from / written to cache |
| `{out}` | output tokens, whole conversation |
| `{th}` | **share of `{out}`** that was thinking |
| `{tot}` | `sent + out` |

Three things a field can be, and they are not the same:

- **a value** — it has data right now
- **`—`** — this CLI supplies it, but not in this state (`{agent}` needs a
  subagent running, `{vim}` needs vim mode on). It will appear when it applies.
- **`n/a`** — this CLI cannot supply it at all. Nothing you do will make it show.

Other notes worth knowing:

- Quota fields are what is **left**, not what is used.
- **Token fields count two layers, not five.** `{tot}` is `sent + out`. `{cr}`
  and `{cw}` are a breakdown *of* `{sent}`; `{th}` is a breakdown *of* `{out}`.
  A breakdown never joins the sum, which is why they are shown as shares — a
  cache read is not a number to add to anything, it is a fraction of what you
  already sent.
- **They measure volume, not money.** `{sent}` is 98% cache reads on any
  conversation that has been running a while, and cache reads are the cheapest
  tokens there are. For cost, use `{cost}`; for headroom, `{5h}` and `{7d}`.
- **Compaction does not reset them.** A token total covers one conversation,
  and a conversation is one transcript: `/clear` starts a fresh count,
  `--resume` continues one, and a subagent's turns belong to the conversation
  that spawned it. Compacting empties the context window without ending the
  conversation, so `{ctx}` drops to near zero while `{tot}` keeps climbing.
  Both are right; they answer different questions.
- Token totals mean the same thing everywhere but arrive differently: Claude
  Code needs the transcript read (its payload's `context_window` is current
  occupancy, not a running total), while Copilot CLI puts conversation totals in
  the payload. The transcript is only read when your Format mentions a token
  field, and never on a CLI that does not need it. On a 1.5MB transcript that
  read costs about 7ms.
- `0` is a value, but a share of nothing is not: a conversation that has really
  sent 0 tokens shows `sent 0`, while `{cr}` has no denominator yet and
  disappears until the first response. A payload with no transcript to read
  shows nothing at all — those are three different facts.
- `wk` still works as an alias for `7d`.

## Themes

A Format says **what** to show. A theme says **how**: the palette, the colour of
the labels and punctuation you wrote, which representation of a field is drawn,
the separator, and the wording of the narration. A Format never names a colour,
so the same Format survives a change of theme the same way it survives a change
of CLI.

```sh
hudline --list-themes
```

| | |
|---|---|
| **`neon`** *(default)* | sherly.dev's palette, with meters and a narrator |
| **`plain`** | the line, uncoloured except where a number is alarming |

`neon` takes its palette from [sherly.dev](https://sherly.dev): hot pink labels,
graphite punctuation, and the model name as a filled chip. Percentages are drawn
as meters and the line grows a narrator when something is wrong.

`plain` is the escape hatch, byte-identical to what shipped before themes
existed. Point a terminal without 256 colours or Unicode at it:

```sh
hudline --theme=plain
```
```
Opus 5:high | ctx 8% | 5h 61% left (resets 10:30) | 7d 83% left (resets 08/27) | doitservers
```

### Colour

Colours are **threshold** colours and belong to the field, not to you and not to
the theme: `ctx` turns amber at 75% and red at 82%; quota fields turn amber below
50% and red below 20%. A theme supplies the palette that "danger" is drawn from
and never the decision that this number is dangerous. You never write a colour
into a Format.

The literal text you write is coloured too, in two kinds: the **words** are
content, and the **brackets, parens and separator** around them are the skeleton
holding it up. They are deliberately not the same colour.

Colour depth follows `COLORTERM` and `TERM`: 24-bit where the terminal says so,
256 where it does not, the basic eight otherwise. `--no-color` and `NO_COLOR`
turn colour off — the meters and separators stay, because they are not colour.

### Narration

`{say}` is one sentence about the most alarming thing that is true right now,
and nothing at all when nothing is. Saying nothing is the normal case, and a
silent narration takes its whole segment with it.

- It **reports state, never events.** It cannot tell you what just happened,
  because nothing here remembers a previous render.
- It says **one** thing, and picks whichever will stop you soonest rather than
  whichever number is worst. A context window three messages from full outranks
  a weekly quota you can do nothing about until Tuesday.
- It cannot contradict the line beside it: it asks the threshold colours what
  counts as alarming rather than keeping cut-offs of its own, so a red number
  and a sentence saying all is well cannot end up side by side.
- The theme supplies the wording. `plain` says `context window nearly full`;
  `neon` says `Thy context runneth over!`

## Options

| | |
|---|---|
| `--format=…` | the Format. Quote it — an unquoted `\|` is a shell pipe |
| `HUDLINE_FORMAT` | same thing via the environment, for awkward quoting |
| `--theme=…` | `neon` (default) or `plain` |
| `HUDLINE_THEME` | same thing via the environment |
| `--sep=…` | separator; beats the theme's |
| `--host=…` | `claude-code` (default), `qwen-code`, `copilot-cli`, `antigravity` |
| `--show=` / `--hide=` | shorthand that compiles to a Format |
| `--no-color`, `NO_COLOR` | drop colour |
| `--print-format` | print the Format actually in effect |
| `--list-fields` | print the field catalogue |
| `--list-themes` | print the themes |
| `--no-tui` | skip the full-screen editor in `init` / `edit` |

Precedence: `--format` › `--show`/`--hide` › `HUDLINE_FORMAT` › the theme's own
Format › the built-in default.

A theme only supplies a Format when nobody else did. Give `--format` and the
theme still paints it — it just stops choosing which fields appear.

## Supported CLIs

| CLI | Settings file | Key |
|---|---|---|
| **Claude Code** | `~/.claude/settings.json` | `statusLine` |
| **GitHub Copilot CLI** | `~/.copilot/config.json` *(or `settings.json`, whichever exists)* | `statusLine` |
| **Antigravity CLI** | `~/.gemini/antigravity-cli/settings.json` | `statusLine` |
| **Qwen Code** | `~/.qwen/settings.json` | `ui.statusLine` |

`init` writes the right file and the right key for whichever you pick, and adds
`--host=` when it is not Claude Code.

Two per-CLI notes it will also tell you at install time:

- **Copilot CLI** keeps the status line behind a feature flag. Turn it on with
  `copilot --experimental`, or add `{"feature_flags":{"enabled":["STATUS_LINE"]}}`
  to the same file.
- **Antigravity** ignores the key unless it is spelled `statusLine` in camelCase.

### Not supported, and why

| CLI | |
|---|---|
| **OpenAI Codex CLI** | **Cannot be supported.** `[tui].status_line` takes only a fixed list of built-in item ids and cannot run an external command ([openai/codex#17827](https://github.com/openai/codex/issues/17827)). |
| **opencode** | No custom status line at all ([anomalyco/opencode#30295](https://github.com/anomalyco/opencode/issues/30295)). |
| **Cursor CLI** | Has the mechanism; its payload has not been sampled yet. A custom line also replaces Cursor's own footer rows. |
| **Factory Droid** | Has the mechanism; its stdin payload is undocumented. |

The last two are a sampling job, not a design one — they appear in `init` marked
as not yet supported so the gap is visible rather than silent.

## Editing an existing line

```sh
npx -y hudline edit
```

Reads the Format back out of your CLI's settings and drops you into the editor
on your current line.

```
  Opus 5:high │ ctx 8% │ 5h 61% left (resets 14:30) │ 7d 83% left (resets 08/26) │ doitservers
                        ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
  segment 3/5 · {5h} {5h_reset}

  ← → move   < > reorder   d delete   a add field   e edit text
```

You are editing the real line, not a list of checkboxes — what you see is what
your CLI will print, in the theme it will print it in.

Before writing anything it takes a backup, shows you a diff, and asks. It only
ever touches the `statusLine` key. If your settings file contains comments it
will not rewrite it at all — it prints the snippet for you to paste.

## Troubleshooting

**The line is blank.** The CLI sent nothing on stdin, which is normal before a
session starts. Check it directly:

```sh
echo '{"model":{"display_name":"Opus 5"},"context_window":{"used_percentage":8}}' | npx -y hudline
```

**The line says `hudline: …`.** That is the error, printed where you can see it —
a status line has no other output channel. `payload is not valid JSON` means the
CLI sent something unexpected; `unknown theme x` and format errors name the
problem and the column.

**A field prints as `{ctx}` instead of a value.** That key does not exist. A
typo is passed through literally so it is visible rather than silently dropped.
`--list-fields` has the spellings.

**Boxes or double-width gaps instead of meters.** Your terminal font lacks
`▰`/`▱`. Use `--theme=plain`.

**Everything is one colour.** The terminal is reporting 8-colour support.
`COLORTERM=truecolor` if you know better, or `--theme=plain` if you do not.

**It got slow.** Only token fields read the transcript. Drop `{sent}` `{cr}`
`{cw}` `{out}` `{th}` `{tot}` from your Format and nothing is read at all.

**My line says `{in}` after upgrading from 0.4.x.** `{in}` is gone. It counted
only the input that missed the cache both ways — a couple of tokens per request
once caching warms up, which is not what anyone reads "input" to mean. `{sent}`
replaces it and counts everything sent to the model. The old key was removed
rather than quietly redefined so that a stale Format says so on the line
instead of reporting a number three orders of magnitude off. `{cr}` `{cw}`
`{th}` are now shares rather than counts.

**It is painted and I want it plain.** `neon` is the default theme. A Format
says what to show and a theme says how, so `--theme=plain` changes only the
appearance — same fields, no colour, no meters.

## Full manual

[docs/INSTALL.md](docs/INSTALL.md) — per-CLI settings paths for WSL, macOS and
Windows, manual installation, verification, troubleshooting, and migrating from
`cc-token-statusline`.

## Develop

```sh
npm test
echo '{"model":{"display_name":"Opus 5"}}' | node bin/hudline.js --no-color
```

`CONTEXT.md` is the glossary; `docs/adr/` records the decisions that are hard to
reverse and would otherwise look arbitrary.

## License

MIT
