#!/usr/bin/env python3
"""Render the real hudline CLI's ANSI output as a documentation PNG."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
args = parser.parse_args()
font = ImageFont.truetype(args.font, 24)
small = ImageFont.truetype(args.font, 18)
title = ImageFont.truetype(args.font, 30)

payload = json.loads((HERE / "payload.json").read_text())
payload["transcript_path"] = str(HERE / "transcript.jsonl")
# Isolate presentation settings, including the timezone used by reset labels.
env = {key: value for key, value in os.environ.items()
       if not key.startswith("HUDLINE_") and key != "NO_COLOR"}
env.update(TZ="UTC", COLORTERM="truecolor", TERM="xterm-256color")
ansi = subprocess.run(
    ["node", str(ROOT / "bin/hudline.js")], input=json.dumps(payload),
    text=True, capture_output=True, check=True, env=env,
).stdout.rstrip("\n")

# Decode the renderer's truecolour SGR stream; fail on new escape types so a
# future theme change cannot silently produce an inaccurate showcase.
foreground, background = "#dedee5", None
cells = []
for part in re.split(r"(\x1b\[[0-9;]*m)", ansi):
    if part.startswith("\x1b["):
        codes = [int(value) for value in part[2:-1].split(";") if value] or [0]
        index = 0
        while index < len(codes):
            code = codes[index]
            if code == 0:
                foreground, background = "#dedee5", None
                index += 1
            elif code in (38, 48) and codes[index + 1:index + 2] == [2]:
                rgb = codes[index + 2:index + 5]
                if len(rgb) != 3:
                    raise ValueError(f"Incomplete colour: {part!r}")
                colour = tuple(rgb)
                if code == 38:
                    foreground = colour
                else:
                    background = colour
                index += 5
            else:
                raise ValueError(f"Unsupported SGR: {part!r}")
    else:
        for char in part:
            if ord(char) < 32:
                raise ValueError(f"Unsupported control character: {char!r}")
            cells.append((char, foreground, background))

columns = 84
cell_width = font.getlength("M")
row_height = 42
rows = (len(cells) + columns - 1) // columns
width = round(columns * cell_width) + 112
height = 210 + rows * row_height
canvas = Image.new("RGB", (width, height), "#101116")
draw = ImageDraw.Draw(canvas)
draw.text((48, 30), "hudline", font=title, fill="#f5f3f8")
draw.text((width - 48, 40), "CLAUDE CODE / DEFAULT NEON", font=small,
          fill="#b6b2c4", anchor="ra")
draw.rounded_rectangle((32, 91, width - 32, 125 + rows * row_height),
                       radius=12, fill="#191a21", outline="#32333f")
for index, (char, fg, bg) in enumerate(cells):
    x = 56 + (index % columns) * cell_width
    y = 110 + (index // columns) * row_height
    if bg:
        draw.rectangle((x, y, x + cell_width, y + 32), fill=bg)
    draw.text((x, y + 25), char, font=font, fill=fg, anchor="ls")
draw.text((48, height - 53), "SAMPLE VALUES  /  UTC reset times  /  84-column wrap",
          font=small, fill="#b6b2c4")
output = HERE / "hudline.png"
canvas.save(output)
print(re.sub(r"\x1b\[[0-9;]*m", "", ansi))
print(f"Wrote {output} ({width} x {height})")
