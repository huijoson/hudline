"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { HOSTS, getHost, supportedHosts } = require("../src/hosts/index.js");
const { createResolver, createSampleResolver } = require("../src/resolver.js");
const { renderFormat } = require("../src/format.js");
const { DEFAULT_FORMAT } = require("../src/templates.js");
const { hostSupports } = require("../src/catalogue.js");
const install = require("../src/wizard/install.js");

const copilot = getHost("copilot-cli");
const antigravity = getHost("antigravity");
const claudeCode = getHost("claude-code");

test("every supported Host can name a settings file and a value shape", () => {
  for (const host of supportedHosts()) {
    assert.ok(host.settingsPath.posix, host.id);
    assert.ok(Array.isArray(host.settingsKey) && host.settingsKey.length, host.id);
    assert.equal(typeof host.settingsValue("x").command, "string", host.id);
    assert.ok(host.sample, host.id);
  }
});

test("Codex is listed but never selectable — it cannot run a command at all", () => {
  const codex = getHost("codex");
  assert.equal(codex.supported, false);
  assert.equal(codex.reason, "blocked");
  assert.match(codex.note, /runs no command/);
  assert.equal(supportedHosts().some((host) => host.id === "codex"), false);
  assert.equal(HOSTS.some((host) => host.id === "codex"), true);
});

test("Copilot's token Fields come from the Payload, with no transcript read", () => {
  assert.equal(copilot.transcript, null);
  assert.equal(hostSupports(copilot, "tot"), true);

  // Copilot's `total_input_tokens` is already Input in the two-layer sense, so
  // it is `sent` unchanged — and `tot` is computed from it rather than read
  // from the Payload's own `total_tokens`, whose definition is not ours.
  const payload = {
    context_window: {
      total_input_tokens: 1215336, total_output_tokens: 21100,
      total_cache_read_tokens: 1200000, total_tokens: 99999999,
    },
  };
  const r = createResolver(copilot, payload, { colour: false, format: "{sent}|{cr}|{tot}" });
  assert.equal(r.get("sent"), "1.2M");
  assert.equal(r.get("cr"), "99%");
  assert.equal(r.get("tot"), "1.2M");
});

test("Input means the same thing read from a transcript or from a Payload", () => {
  // The same conversation, expressed the two ways the two Hosts express it.
  const totals = {
    input_tokens: 2, output_tokens: 100, thinking_tokens: 50,
    cache_read_input_tokens: 900, cache_creation_input_tokens: 98,
  };
  const payload = { context_window: {
    total_input_tokens: 1000, total_output_tokens: 100, total_reasoning_tokens: 50,
    total_cache_read_tokens: 900, total_cache_write_tokens: 98,
  } };

  for (const key of ["sent", "cr", "cw", "out", "th", "tot"]) {
    assert.equal(claudeCode.transcript.map[key](totals), copilot.extract[key](payload), key);
  }
});

test("an Adapter's extract wins over a Field's default source", () => {
  // `sent` is declared transcript-sourced, yet Copilot supplies it directly.
  const { getField } = require("../src/fields.js");
  assert.equal(getField("sent").source, "transcript");
  assert.equal(hostSupports(copilot, "sent"), true);
  assert.equal(hostSupports(antigravity, "sent"), false);
});

test("Antigravity's quota fraction becomes a remaining percentage", () => {
  const r = createResolver(antigravity, { quota: { remaining_fraction: 0.72 } }, { colour: false });
  assert.equal(r.get("quota"), "72%");
});

test("reset times are accepted as epoch seconds or as an ISO timestamp", () => {
  const epoch = createResolver(antigravity, { quota: { reset_time: 1787812200 } }, { colour: false });
  const iso = createResolver(antigravity, { quota: { reset_time: "2026-08-26T09:30:00Z" } }, { colour: false });
  assert.match(epoch.get("quota_reset"), /^\d{2}:\d{2}$/);
  assert.match(iso.get("quota_reset"), /^\d{2}:\d{2}$/);
});

test("Copilot's settings file is looked for under both documented names", () => {
  const paths = install.settingsPathsFor(copilot);
  assert.equal(paths.length, 2);
  assert.match(paths[0], /\.copilot[/\\]config\.json$/);
  assert.match(paths[1], /\.copilot[/\\]settings\.json$/);
});

test("the default Format displays both Claude Code quota windows", () => {
  const line = renderFormat(DEFAULT_FORMAT, createSampleResolver(claudeCode, { colour: false }));
  assert.match(line, /^Opus 5:high \| ctx 8% \| 5h 61% left \(\d\d:\d\d\) \| 7d 83% left \(\d\d\/\d\d\) \| \$1\.23 \| sent 1\.2M cr 99% \| out 21\.1k th 24%$/);
  assert.doesNotMatch(line, /quota|branch/);
});

test("the same Format carries across every supported Host without printing holes", () => {
  for (const host of supportedHosts()) {
    const line = renderFormat(DEFAULT_FORMAT, createSampleResolver(host, { colour: false }));
    assert.doesNotMatch(line, /\{|\}|n\/a|undefined/, host.id);
    assert.ok(line.includes("ctx "), host.id);
  }
});

test("a CLI that will never work is labelled differently from one not done yet", () => {
  const reasons = Object.fromEntries(
    HOSTS.filter((host) => !host.supported).map((host) => [host.id, host.reason])
  );
  assert.equal(reasons.codex, "blocked");
  assert.equal(reasons.opencode, "blocked");
  assert.equal(reasons["cursor-cli"], "pending");
  assert.equal(reasons.droid, "pending");
});
