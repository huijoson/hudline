# Reproduce the README image

`hudline.png` shows the actual default CLI output with synthetic data, rendered
into a terminal-style panel. It is not a screenshot of a live Claude Code session.
The image wraps at 84 columns without changing the default Format.

Requirements: Node.js 18+, Python 3, Pillow 10.2.0 built with libraqm, and
DejaVu Sans Mono. Pillow's wheels bundle libraqm, which loads the system's
FriBiDi; check with
`python -c "from PIL import features; print(features.check('raqm'))"`.
Without it Pillow lays text out 14 px a cell instead of 14.45, and the images
come out 1288 px wide instead of 1326, so the scripts refuse to run.
These are documentation tools; the npm package has no new dependencies.

From the repository root:

```sh
python3 -m venv /tmp/hudline-showcase-venv
/tmp/hudline-showcase-venv/bin/pip install Pillow==10.2.0
/tmp/hudline-showcase-venv/bin/python docs/showcase/render.py
```

On systems with another font location, pass `--font /path/to/DejaVuSansMono.ttf`.
Use the same font and Pillow version for consistent image output.

`payload.json` supplies context occupancy, quota windows, model and sample cost.
`transcript.jsonl` supplies two synthetic responses: input totals 1.2M tokens
(including 98% cache reads), output totals 21.1k, and thinking is approximately
24% of output. The cost is an independent example value, not calculated from
these token counts. None of this data comes from a real user session.

The script injects the absolute transcript path, fixes the reset timezone to UTC,
clears user presentation overrides, and invokes `bin/hudline.js` without format
or theme flags. It draws the emitted text, foreground and background colours;
it does not recreate hudline's field formatting or theme logic. Unsupported ANSI
controls cause an error so changes can be reviewed before updating the image.

## The mod image

`pixel-hud.png` is drawn by the Claude Code mod in `plugins/pixel-hud/`, fed the
same `payload.json` and `transcript.jsonl`. It needs the `claude` CLI (2.1.294
or newer) besides Pillow and the font:

```sh
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --king
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --gif
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --sheet
```

The second draws `pixel-hud-king.png`: a task of a minute ends, and the image
catches the King Slime halfway through its reign, using the exported phase
lengths.
The mod picks the King at random; the renderer hands it a fixed pick, the King
Slime unless `--variant gold` or `--variant metal` asks for the Gold King or
the Metal King Slime. The committed images use the King Slime.
The third draws `pixel-hud-king.gif`, the README's demo: the same task, one
frame for each tick of the slimes' exported `FRAME_MS` clock, from the slimes
at rest through the whole show and home again. Pillow folds repeated frames
into one.
The fourth draws a contact sheet of the same frames, four across at full size,
cropped to a shared box around the changing stage with a little padding.
`rest` is the resting sample; show ticks count from 0, with tick ranges for
repeated frames. It writes `pixel-hud-king-sheet.png`
in the system temp directory and prints the path, for review without changing
the committed images.

The script copies the mod to a temporary folder, adds one test that hands it
the sample figures through Claude Code's own plugin test host, and runs
`claude plugin test`. The test prints the tree the mod drew, and the script
paints that tree, the slimes' Raster cells included. The branch is `main` and
clean. The renderer waits for the session-start encounter to finish before
taking its resting sample. The plain image catches the slimes at rest; `--king`,
`--gif` and `--sheet` play the show after a long task. Choose one mode at a time.

The mod writes reset times in the machine's local zone, and the test host does
not take `TZ`. The script shifts the sample instants by the local offset, so the
image shows the same UTC times as `hudline.png`.

Choose the quest hero for a resting PNG with `--stage quest`. Use
`--output /path/to/image.png` to inspect a scratch image without changing the
committed showcases. The renderer selects the real Stage and waits for that
theme's encounter to finish before drawing the sample.

Add `--sheet` for a contact sheet with one battle per skill: slash against a
slime, fireball against a bat, and thunder against a skeleton. The test host
uses fixed picks and checks every battle frame against the selected Stage.
Add `--gif` instead for `pixel-hud-quest.gif`: one slash battle, from the walk
through the monster's arrival, hit and burst, and back to walking. Like the
King GIF, every frame shares one palette so the stationary text stays steady.

```sh
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --stage quest
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --stage quest --sheet
/tmp/hudline-showcase-venv/bin/python docs/showcase/render_mod.py --stage quest --gif
```
