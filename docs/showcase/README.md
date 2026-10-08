# Reproduce the README image

`hudline.png` shows the actual default CLI output with synthetic data, rendered
into a terminal-style panel. It is not a screenshot of a live Claude Code session.
The image wraps at 84 columns without changing the default Format.

Requirements: Node.js 18+, Python 3, Pillow 10.2.0 and DejaVu Sans Mono.
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
```

The second draws `pixel-hud-king.png`: a task of a minute ends, and the image
catches the King Slime mid-reign, 22 ticks of the slimes' clock later.

The script copies the mod to a temporary folder, adds one test that hands it
the sample figures through Claude Code's own plugin test host, and runs
`claude plugin test`. The test prints the tree the mod drew, and the script
paints that tree, the slimes' Raster cells included. The branch is `main` and
clean, and the slimes are caught at rest.

The mod writes reset times in the machine's local zone, and the test host does
not take `TZ`. The script shifts the sample instants by the local offset, so the
image shows the same UTC times as `hudline.png`.
