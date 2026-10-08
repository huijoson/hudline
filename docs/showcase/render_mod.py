#!/usr/bin/env python3
"""Render the real pixel-hud mod's drawing as a documentation PNG."""

import argparse
import base64
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MOD = ROOT / "plugins" / "pixel-hud"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
parser.add_argument("--king", action="store_true",
                    help="draw the King Slime show after a long task (pixel-hud-king.png)")
args = parser.parse_args()
font = ImageFont.truetype(args.font, 24)
small = ImageFont.truetype(args.font, 18)
title = ImageFont.truetype(args.font, 30)

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

test('showcase', async ($, on) => {
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
  if (KING) {
    // A task of a minute ends; the King Slime reigns some 22 ticks later.
    await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(140 * 22)
    await ui.unmount()
    ui = await $.ui.mount({ plugin: 'pixel-hud', surface: 'terminal', component: 'AbovePrompt', props })
  }
  console.log('SHOWCASE' + JSON.stringify(await ui.drawn()))
  await ui.unmount()
})
"""

with tempfile.TemporaryDirectory() as tmp:
    copy = Path(tmp) / "pixel-hud"
    shutil.copytree(MOD, copy, ignore=shutil.ignore_patterns("*.test.tsx", "*.test.ts"))
    source = (SHOWCASE_TEST
              .replace("MODEL", json.dumps(payload["model"]["display_name"].lower()))
              .replace("EFFORT", json.dumps(payload["effort"]["level"]))
              .replace("USAGE", json.dumps(usage))
              .replace("TRANSCRIPT", json.dumps(transcript))
              .replace("COLUMNS", str(COLUMNS))
              .replace("KING", "true" if args.king else "false"))
    (copy / "hooks" / "showcase.test.tsx").write_text(source)
    run = subprocess.run(["claude", "plugin", "test", str(copy)], text=True,
                         capture_output=True)
    found = re.search(r"^SHOWCASE(.*)$", run.stdout + run.stderr, re.M)
    if not found:
        raise SystemExit(f"the mod drew nothing:\n{run.stdout}\n{run.stderr}")
    tree = json.loads(found.group(1))


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


# The meter row wraps at COLUMNS the way a terminal wraps it.
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
output = HERE / ("pixel-hud-king.png" if args.king else "pixel-hud.png")
canvas.save(output)
for cells in rows:
    print("".join(ch for ch, _, _ in cells))
print(f"Wrote {output} ({width} x {height})")
