"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createResolver, createSampleResolver } = require("../src/resolver.js");
const { renderFormat } = require("../src/format.js");
const claudeCode = require("../src/hosts/claude-code.js");
const qwenCode = require("../src/hosts/qwen-code.js");
const { sumUsageLines, emptyTotals } = require("../src/transcript.js");

function writeTranscript(lines) {
  const file = path.join(os.tmpdir(), `hudline-${Date.now()}-${Math.random()}.jsonl`);
  fs.writeFileSync(file, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
  return file;
}

test("quota Fields report what is left, not what is used", () => {
  const payload = { rate_limits: { seven_day: { used_percentage: 17 } } };
  const r = createResolver(claudeCode, payload, { colour: false });
  assert.equal(r.get("7d"), "83%");
});

test("wk is an alias for 7d so 0.2.x configurations keep working", () => {
  const payload = { rate_limits: { seven_day: { used_percentage: 17 } } };
  const r = createResolver(claudeCode, payload, { colour: false });
  assert.equal(r.get("wk"), "83%");
  assert.equal(r.has("wk"), true);
});

test("a false boolean is Missing, so [{fast}] means 'show when on'", () => {
  const on = createResolver(claudeCode, { fast_mode: true }, { colour: false });
  const off = createResolver(claudeCode, { fast_mode: false }, { colour: false });
  assert.equal(on.get("fast"), "fast");
  assert.equal(off.get("fast"), undefined);
});

test("zero is Available, not Missing", () => {
  const file = writeTranscript([
    { type: "assistant", message: { id: "m1", usage: { input_tokens: 0, output_tokens: 0 } } },
  ]);
  const r = createResolver(claudeCode, { transcript_path: file }, { colour: false });
  assert.equal(r.get("sent"), "0");
  // A count of 0 is Available; a share of nothing is not. See ADR 0007.
  assert.equal(r.get("cr"), undefined);
  fs.unlinkSync(file);
});

test("`sent` is everything sent, and a breakdown is a share of its own layer", () => {
  const file = writeTranscript([
    { type: "assistant", message: { id: "m1", usage: {
      input_tokens: 2, output_tokens: 100,
      output_tokens_details: { thinking_tokens: 50 },
      cache_read_input_tokens: 900, cache_creation_input_tokens: 98,
    } } },
  ]);
  const r = createResolver(claudeCode, { transcript_path: file }, { colour: false });

  assert.equal(r.get("sent"), "1.0k", "2 + 900 + 98 — cache included, which is the point");
  assert.equal(r.get("cr"), "90%", "a share of sent");
  assert.equal(r.get("cw"), "10%");
  assert.equal(r.get("th"), "50%", "a share of out, not of sent");
  assert.equal(r.get("out"), "100");
  assert.equal(r.get("tot"), "1.1k", "sent + out, breakdowns not counted twice");

  // `in` was removed rather than aliased, so a stale Format announces itself on
  // the line instead of quietly reporting a number 3 orders of magnitude off.
  assert.equal(r.has("in"), false);
  assert.equal(renderFormat("in {in}", r), "in {in}");
  fs.unlinkSync(file);
});

test("threshold colour follows the Field, and --no-color removes it everywhere", () => {
  const hot = { context_window: { used_percentage: 91 } };
  assert.match(createResolver(claudeCode, hot).get("ctx"), /\x1b\[31m91%\x1b\[0m/);
  assert.equal(createResolver(claudeCode, hot, { colour: false }).get("ctx"), "91%");
});

test("the transcript is not read when the Format does not ask for it", () => {
  let reads = 0;
  const host = {
    ...claudeCode,
    transcript: {
      ...claudeCode.transcript,
      read: () => { reads++; return { ...emptyTotals(), input_tokens: 1 }; },
    },
  };

  const lean = createResolver(host, {}, { format: "ctx {ctx}|{cwd}" });
  lean.get("ctx");
  assert.equal(reads, 0);

  const hungry = createResolver(host, {}, { format: "sent {sent}" });
  hungry.get("sent");
  assert.equal(reads, 1);
});

test("usage is summed once per message.id, and thinking is not folded into tot", () => {
  const totals = sumUsageLines(
    [
      { type: "assistant", message: { id: "m1", usage: { input_tokens: 2, output_tokens: 111, output_tokens_details: { thinking_tokens: 80 }, cache_read_input_tokens: 100, cache_creation_input_tokens: 10 } } },
      { type: "assistant", message: { id: "m1", usage: { input_tokens: 2, output_tokens: 111, output_tokens_details: { thinking_tokens: 80 }, cache_read_input_tokens: 100, cache_creation_input_tokens: 10 } } },
      { type: "user", message: { id: "m2" } },
    ].map((line) => JSON.stringify(line)).join("\n")
  );
  assert.deepEqual(totals, {
    input_tokens: 2, output_tokens: 111, thinking_tokens: 80,
    cache_read_input_tokens: 100, cache_creation_input_tokens: 10,
  });
  const tot = claudeCode.transcript.map.tot(totals);
  // sent (2 + 100 + 10) + out (111). Two layers, and thinking is inside out.
  assert.equal(tot, 223);
});

test("one Format degrades correctly on a Host that cannot supply its Fields", () => {
  const format = "{model}[:{effort}]|ctx {ctx}|7d {7d} left|{cwd}|[sent {sent}] [tot {tot}]";
  const claude = renderFormat(format, createSampleResolver(claudeCode, { colour: false }));
  const qwen = renderFormat(format, createSampleResolver(qwenCode, { colour: false }));

  assert.match(claude, /^Opus 5:high \| ctx 8% \| 7d 83% left \| doitservers \| sent 1\.2M tot /);
  // Qwen has no rate limits, no effort level and no transcript reader: those
  // Segments disappear instead of printing holes.
  assert.equal(qwen, "Qwen3-Coder | ctx 12% | qwen-project");
});

test("no transcript to read is Missing; a transcript with no usage is zero", () => {
  const absent = createResolver(claudeCode, {}, { colour: false });
  assert.equal(absent.get("sent"), undefined, "no transcript_path at all");

  const unreadable = createResolver(claudeCode, { transcript_path: "/nope/nothing.jsonl" }, { colour: false });
  assert.equal(unreadable.get("sent"), undefined, "transcript_path that cannot be read");

  const empty = writeTranscript([{ type: "user", message: { id: "u1" } }]);
  const quiet = createResolver(claudeCode, { transcript_path: empty }, { colour: false });
  assert.equal(quiet.get("sent"), "0", "a real transcript with no assistant usage");
  fs.unlinkSync(empty);
});
