#!/usr/bin/env python3
"""Render the real pixel-hud mod's drawing as a PNG, GIF, or contact sheet."""

import argparse
import base64
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

from PIL import Image, ImageChops, ImageDraw, ImageFont, features


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MOD = ROOT / "plugins" / "pixel-hud"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
parser.add_argument("--stage", choices=["slimes", "quest"], default="slimes",
                    help="choose the stage theme")
parser.add_argument("--output", type=Path, help="write the image to this path")
mode = parser.add_mutually_exclusive_group()
mode.add_argument("--king", action="store_true",
                    help="draw the King Slime show after a long task (pixel-hud-king.png)")
mode.add_argument("--gif", action="store_true",
                    help="animate the stage moment, one frame a tick")
mode.add_argument("--sheet", action="store_true",
                    help="draw the stage moments in a grid (one battle per quest skill)")
mode.add_argument("--foes", type=Path, metavar="PNG",
                    help="draw every quest monster and skill frame to a contact sheet at PNG")
args = parser.parse_args()
# Text is laid out with libraqm, as the committed images were: Pillow's basic
# layout advances each cell 14 px instead of 14.45 and draws narrower images.
if not features.check("raqm"):
    raise SystemExit("Pillow was built without libraqm; see docs/showcase/README.md")
font = ImageFont.truetype(args.font, 24)
small = ImageFont.truetype(args.font, 18)
title = ImageFont.truetype(args.font, 30)


def foes_sheet(output):
    source = r"""
import { registerHooks } from 'node:module'
// The mod's own-file imports omit extensions; Node's TS loader needs them.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context)
} })
const { MONSTERS, SKILLS, paintMonster, paintSkill } = await import(MODULE)
const { QUEST_STAGE: stage } = await import(STAGE_MODULE)
const groups = []
for (const [table, painter] of [[MONSTERS, paintMonster], [SKILLS, paintSkill]]) {
  for (const [name, art] of Object.entries(table)) {
    const frames = art.frames.map((_, frame) => {
      const pixels = Array.from({ length: stage.rows * 2 }, () => Array(14).fill(null))
      painter(pixels, name, 2, frame)
      return pixels
    })
    groups.push({ name, frames })
  }
}
console.log(JSON.stringify(groups))
""".replace("STAGE_MODULE", json.dumps((MOD / "hooks" / "quest.ts").as_uri())).replace("MODULE", json.dumps((MOD / "hooks" / "quest-foes.ts").as_uri()))
    run = subprocess.run(["node", "--experimental-strip-types", "--input-type=module", "-e", source],
                         text=True, capture_output=True, check=True)
    groups = json.loads(run.stdout)
    scale, gap, label_height = 10, 20, 32
    tile_width, tile_height = 14 * scale, len(groups[0]["frames"][0]) * scale
    columns = max(len(group["frames"]) for group in groups)
    sheet = Image.new("RGB", (gap + columns * (tile_width + gap),
                              gap + len(groups) * (tile_height + label_height + gap)), "#101116")
    draw = ImageDraw.Draw(sheet)
    for row, group in enumerate(groups):
        for frame, pixels in enumerate(group["frames"]):
            x = gap + frame * (tile_width + gap)
            y = gap + row * (tile_height + label_height + gap)
            draw.text((x, y), f'{group["name"]} {frame}', font=small, fill="#dedee5")
            for r, line in enumerate(pixels):
                for c, color in enumerate(line):
                    if color is not None:
                        left, top = x + c * scale, y + label_height + r * scale
                        draw.rectangle((left, top, left + scale - 1, top + scale - 1),
                                       fill=f"#{color:06x}")
    sheet.save(output)
    print(f"Wrote {output} ({sheet.width} x {sheet.height})")


if args.foes:
    foes_sheet(args.foes)
    raise SystemExit

# The same synthetic data as hudline.png, handed to the mod through the engine's
# own test host: the payload's figures as $.session.usage(), the transcript as
# the file the classic hooks name. The branch is `main`, clean.
payload = json.loads((HERE / "payload.json").read_text())
transcript = (HERE / "transcript.jsonl").read_text()


# The mod prints reset times in the machine's local zone, and the test host
# does not take TZ. Shift each instant by this machine's offset so the image
# shows the same UTC clock times as hudline.png.
def iso(seconds):
    offset = datetime.fromtimestamp(seconds).astimezone().utcoffset()
    return (datetime.fromtimestamp(seconds, timezone.utc) - offset).isoformat()


limits = payload["rate_limits"]
usage = {
    "startedAt": 0,
    "context": {"window": payload["context_window"]["context_window_size"],
                "percent": payload["context_window"]["used_percentage"]},
    "rateLimits": [
        {"kind": "five_hour", "percentUsed": limits["five_hour"]["used_percentage"],
         "resetsAt": iso(limits["five_hour"]["resets_at"])},
        {"kind": "seven_day", "percentUsed": limits["seven_day"]["used_percentage"],
         "resetsAt": iso(limits["seven_day"]["resets_at"])},
    ],
    "cost": {"usd": payload["cost"]["total_cost_usd"]},
}
COLUMNS = 84

SHOWCASE_TEST = """
import { mock, test } from 'claude-code/testing'
import { selectStage } from './stages'
import { QUEST_STAGE, WALK_CYCLE_TICKS } from './quest'
import { FRAME_MS, SLIME_WIDTH, KING_GATHER_TICKS, KING_MERGE_TICKS, KING_DROP_TICKS, KING_FLASH_TICKS, KING_REIGN_TICKS, KING_SHOW_TICKS } from './slime'

test('showcase', { options: { stage: THEME_OPTION } }, async ($, on) => {
  const theme = selectStage(THEME_OPTION)
  console.log('FRAME_MS' + FRAME_MS)
  on('process.run', async (_$, e) => ({
    value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? 'main\\n' : '', stderr: '',
             isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.model', async () => ({ value: MODEL }))
  on('session.usage', async () => ({ value: USAGE as never }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  const clock = mock.clock(on)
  on('command.register', async () => ({ value: undefined }) as never)
  on('turn.complete', async () => ({ text: '' }))
  on('classic.SessionStart', async () => ({}) as never)
  on('fs.exists', async () => ({ value: true }))
  on('fs.stat', async () => ({ value: { kind: 'file', size: TRANSCRIPT.length, mtimeMs: 0, isLink: false } }))
  on('fs.read', async () => ({ value: TRANSCRIPT }))
  on('turn.step', async function* () {
    return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.classic.SessionStart({ source: 'startup', transcript_path: '/t.jsonl' } as never)
  const step = $.turn.step({ turnId: 't', index: 0, model: MODEL, effort: EFFORT, messageCount: 1 } as never)
  for await (const _ of step) {
  }
  await step.result

  const props = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: COLUMNS } as never
  let ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
  for (let i = 0; i < 20 && (await ui.find({ type: 'Text', text: 'SENT' })) === undefined; i += 1) {
    await ui.unmount()
    ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
  }
  // Let the once-per-session encounter finish before the resting sample.
  const raster = await ui.find({ type: 'Raster', key: 'slimes' })
  const count = Number(raster?.props.columns) / SLIME_WIDTH
  await clock.advance(FRAME_MS * theme.momentEndTick({ kind: 'encounter', startTick: 0 }, count, 'breathe'))
  await ui.unmount()
  ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
  if (KING) {
    // A task of a minute ends; catch the middle of the reign.
    await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId: 't', reason: 'answer' })
    // Skip the transformation to show the crowned king halfway through its reign.
    await clock.advance(FRAME_MS * (KING_GATHER_TICKS + KING_MERGE_TICKS + KING_DROP_TICKS + KING_FLASH_TICKS + Math.floor(KING_REIGN_TICKS / 2)))
    await ui.unmount()
    ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
  }
  for (const skill of (THEME_OPTION === 'quest' && SHEET ? ['slash', 'fireball', 'thunder'] : [null])) {
    if (FRAMES > 0) {
      // A task ends; one drawing a tick, through the moment and back to rest.
      console.log('SHOWCASE' + JSON.stringify(await ui.drawn()))
      await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId: 't', reason: 'answer' })
      const battleStart = clock.now() / FRAME_MS
      for (let i = 0; i < FRAMES; i += 1) {
        await ui.unmount()
        ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
        if (skill) {
          const monster = skill === 'slash' ? 'slime' : skill === 'fireball' ? 'bat' : 'skeleton'
          const actual = await ui.find({ type: 'Raster', key: 'slimes' })
          const expected = theme.cells(count, battleStart + i, { kind: 'battle', startTick: battleStart, monster, skill }, 'breathe')
          if (actual?.props.cells !== expected) throw new Error('battle picker/frame mismatch: ' + skill + ' tick ' + i)
        }
        console.log('SHOWCASE' + JSON.stringify(await ui.drawn()))
        await clock.advance(FRAME_MS)
      }
    } else console.log('SHOWCASE' + JSON.stringify(await ui.drawn()))
  }
  await ui.unmount()
})
"""

with tempfile.TemporaryDirectory() as tmp:
    copy = Path(tmp) / "pixel-hud"
    shutil.copytree(MOD, copy, ignore=shutil.ignore_patterns("*.test.tsx", "*.test.ts"))
    if args.stage == "quest":
        # Exercise the real event path with a fixed sequence, one battle per skill.
        (copy / "hooks" / "battle-showcase.ts").write_text("""
import { register as registerHud } from './register'
import type { Register } from 'claude-code'
export const register: Register = (on, options) => {
  const picks = [0, 0, 0.25, 0.34, 0.5, 0.67]
  let pick = 0
  return registerHud(on, options, () => picks[pick++ % picks.length]!)
}
""")
        (copy / "hooks" / "hooks.json").write_text(json.dumps({"modules": ["./battle-showcase.ts"]}))
    frame_count = "0"
    if args.gif or args.sheet:
        frame_count = (
            "QUEST_STAGE.momentEndTick({ kind: 'battle', startTick: 0, monster: 'slime', skill: 'fireball' }, 4, 'breathe') + WALK_CYCLE_TICKS"
            if args.stage == "quest" else "KING_SHOW_TICKS + 6"
        )
    source = (SHOWCASE_TEST
              .replace("THEME_OPTION", json.dumps(args.stage))
              .replace("MODEL", json.dumps(payload["model"]["display_name"].lower()))
              .replace("EFFORT", json.dumps(payload["effort"]["level"]))
              .replace("USAGE", json.dumps(usage))
              .replace("TRANSCRIPT", json.dumps(transcript))
              .replace("COLUMNS", str(COLUMNS))
              .replace("if (KING)", "if (true)" if args.king else "if (false)")
              .replace("SHEET", "true" if args.sheet else "false")
              .replace("FRAMES", frame_count))
    (copy / "hooks" / "showcase.test.tsx").write_text(source)
    run = subprocess.run(["claude", "plugin", "test", str(copy)], text=True,
                         capture_output=True)
    found = re.findall(r"^SHOWCASE(.*)$", run.stdout + run.stderr, re.M)
    if run.returncode != 0:
        raise SystemExit(f"showcase test failed:\n{run.stdout}\n{run.stderr}")
    if not found:
        raise SystemExit(f"the mod drew nothing:\n{run.stdout}\n{run.stderr}")
    trees = [json.loads(f) for f in found]
    timing = re.search(r"^FRAME_MS(\d+)$", run.stdout + run.stderr, re.M)
    if timing is None:
        raise SystemExit("the mod did not report FRAME_MS; cannot determine frame duration")
    frame_ms = int(timing[1])


INK = "#dedee5"
DEFAULT = 0x01000000


def raster(props):
    # A Raster's cells: little-endian u32 triplets [codePoint, fg, bg], row-major.
    raw = base64.b64decode(props["cells"])
    words = [int.from_bytes(raw[i:i + 4], "little") for i in range(0, len(raw), 4)]
    colour = lambda w: None if w == DEFAULT else f"#{w:06x}"
    cols = props["columns"]
    cells = [(chr(words[k]), colour(words[k + 1]) or INK, colour(words[k + 2]))
             for k in range(0, len(words), 3)]
    return [cells[r * cols:(r + 1) * cols] for r in range(props["rows"])]


# Lays the drawing out as rows of cells: a column Box stacks its children, any
# other Box sets them side by side, as the terminal does. Nothing else is
# reinterpreted.
def layout(node):
    if isinstance(node, str):
        return []
    props = node.get("props") or {}
    if node.get("type") == "Text":
        content = "".join(c for c in node.get("children", []) if isinstance(c, str))
        return [[(ch, props.get("color") or INK, props.get("backgroundColor")) for ch in content]]
    if node.get("type") == "Raster":
        return raster(props)
    parts = [layout(child) for child in node.get("children", [])]
    parts = [p for p in parts if p]
    if props.get("flexDirection") == "column":
        return [row for p in parts for row in p]
    height = max((len(p) for p in parts), default=0)
    rows = [[] for _ in range(height)]
    for p in parts:
        width = max(len(row) for row in p)
        for r in range(height):
            row = p[r] if r < len(p) else []
            rows[r] += row + [(" ", INK, None)] * (width - len(row))
    return rows


# Paints one drawing of the mod; the meter row wraps at COLUMNS the way a
# terminal wraps it.
def paint(tree):
    rows = []
    for cells in layout(tree):
        if not cells:
            continue
        for start in range(0, len(cells), COLUMNS):
            rows.append(cells[start:start + COLUMNS])

    cell_width = font.getlength("M")
    row_height = 36
    width = round(COLUMNS * cell_width) + 112
    height = 210 + len(rows) * row_height
    canvas = Image.new("RGB", (width, height), "#101116")
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 30), "pixel-hud", font=title, fill="#f5f3f8")
    draw.text((width - 48, 40), "CLAUDE CODE MOD / ABOVE THE PROMPT", font=small,
              fill="#b6b2c4", anchor="ra")
    draw.rounded_rectangle((32, 91, width - 32, 125 + len(rows) * row_height),
                           radius=12, fill="#191a21", outline="#32333f")
    for r, cells in enumerate(rows):
        y = 108 + r * row_height
        for c, (char, fg, bg) in enumerate(cells):
            x = 56 + c * cell_width
            if bg:
                draw.rectangle((x, y, x + cell_width, y + row_height - 1), fill=bg)
            # Half blocks are drawn as the pixels they stand for, so the letters are
            # solid at any font's line height.
            if char == "█":
                draw.rectangle((x, y, x + cell_width, y + row_height - 1), fill=fg)
            elif char == "▀":
                draw.rectangle((x, y, x + cell_width, y + row_height / 2 - 1), fill=fg)
            elif char == "▄":
                draw.rectangle((x, y + row_height / 2, x + cell_width, y + row_height - 1), fill=fg)
            elif char != " ":
                draw.text((x, y + 26), char, font=font, fill=fg, anchor="ls")
    draw.text((48, height - 53), "SAMPLE VALUES  /  UTC reset times  /  84-column wrap",
              font=small, fill="#b6b2c4")
    return canvas, rows


def king_frames(trees):
    frames = [paint(tree)[0] for tree in trees]
    # One palette for every frame, so the text that stays put does not flicker
    # as each frame would otherwise pick its own colours.
    palette_strip = Image.new("RGB", (frames[0].width, frames[0].height * len(frames)))
    for i, frame in enumerate(frames):
        palette_strip.paste(frame, (0, i * frame.height))
    palette = palette_strip.quantize(colors=256)
    frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    return frames, palette


if args.sheet:
    frames = [paint(tree)[0] for tree in trees]
    runs = []
    previous = None
    # Compare full frames before cropping, so every pixel change gets a cell.
    # Keep the resting sample separate from the show's tick numbers.
    group_size = len(frames) // 3 if args.stage == "quest" else len(frames)
    for index, frame in enumerate(frames):
        group, offset = divmod(index, group_size)
        skill = ["slash", "fireball", "thunder"][group] if args.stage == "quest" else "king"
        tick = offset - 1
        if offset == 0:
            runs.append((frame, None, skill))
            previous = None
            continue
        pixels = frame.tobytes()
        if pixels == previous:
            first, start, _ = runs[-1]
            runs[-1] = (first, start, (skill, tick))
        else:
            runs.append((frame, tick, (skill, tick)))
        previous = pixels

    changes = Image.new("RGB", frames[0].size)
    for frame in frames[1:]:
        changes = ImageChops.lighter(changes, ImageChops.difference(frame, frames[0]))
    bounds = changes.getbbox()
    if bounds is None:
        crop = (0, 0, frames[0].width, frames[0].height)
    else:
        left, top, right, bottom = bounds
        pad_x, pad_y = round(2 * font.getlength("M")), 36
        crop = (max(0, left - pad_x), max(0, top - pad_y),
                min(frames[0].width, right + pad_x), min(frames[0].height, bottom + pad_y))

    columns = 4
    gap = 16
    label_height = 32
    width, height = crop[2] - crop[0], crop[3] - crop[1]
    rows = (len(runs) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * (width + gap) + gap,
                              rows * (height + label_height + gap) + gap), "#101116")
    draw = ImageDraw.Draw(sheet)
    for i, (frame, start, end) in enumerate(runs):
        x = gap + (i % columns) * (width + gap)
        y = gap + (i // columns) * (height + label_height + gap)
        if start is None:
            label = f"{end} rest"
        else:
            skill, last = end
            label = f"{skill} t{start}" if start == last else f"{skill} t{start}–t{last}"
        draw.text((x, y), label, font=small, fill=INK)
        sheet.paste(frame.crop(crop), (x, y + label_height))
    output = args.output or Path(tempfile.gettempdir()) / f"pixel-hud-{'quest' if args.stage == 'quest' else 'king'}-sheet.png"
    sheet.save(output)
    print(f"Wrote {output} ({sheet.width} x {sheet.height}, {len(runs)} cells)")
    raise SystemExit

if args.gif:
    frames, palette = king_frames(trees)
    # The slimes at rest a moment, then the show at the slimes' own pace.
    durations = [1200] + [frame_ms] * (len(frames) - 2) + [1200]
    output = args.output or HERE / f"pixel-hud-{'quest' if args.stage == 'quest' else 'king'}.gif"
    # Disable per-frame palette optimization and supply the shared palette so
    # Pillow keeps one global colour table instead of remapping each frame.
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations,
                   loop=0, optimize=False, palette=palette.getpalette())
    width, height = frames[0].size
    print(f"Wrote {output} ({width} x {height}, {len(frames)} frames)")
    raise SystemExit
canvas, rows = paint(trees[-1])
width, height = canvas.size
output = args.output or HERE / ("pixel-hud-king.png" if args.king else f"pixel-hud-{args.stage}.png" if args.stage != "slimes" else "pixel-hud.png")
canvas.save(output)
for cells in rows:
    print("".join(ch for ch, _, _ in cells))
print(f"Wrote {output} ({width} x {height})")
