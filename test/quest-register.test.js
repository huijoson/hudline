"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cpSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

test("quest register admits the fixed monster and skill without restarting a battle", (t) => {
  const available = spawnSync("claude", ["plugin", "test", "--help"], { encoding: "utf8" });
  if (available.error?.code === "ENOENT") return t.skip("claude CLI is unavailable");
  assert.equal(available.status, 0, available.stderr);
  const scratch = mkdtempSync(join(tmpdir(), "hudline-quest-test-"));
  try {
    const plugin = join(scratch, "pixel-hud");
    cpSync(resolve(__dirname, "../plugins/pixel-hud"), plugin, {
      recursive: true,
      filter: (path) => !/\.test\.tsx?$/.test(path),
    });
    // As in the showcase renderer, inject picks through the real entry point.
    writeFileSync(join(plugin, "hooks/fixed-battles.ts"), `
import { register as registerHud } from './register'
import type { Register } from 'claude-code'
export const register: Register = (on, options) => {
  const picks = [0.25, 0.67]
  let pick = 0
  return registerHud(on, options, () => picks[pick++ % picks.length]!)
}
`);
    writeFileSync(join(plugin, "hooks/hooks.json"), JSON.stringify({ modules: ["./fixed-battles.ts"] }));
    cpSync(join(__dirname, "fixtures/quest-battle.tsx"), join(plugin, "hooks/battle.test.tsx"));
    const result = spawnSync("claude", ["plugin", "test", plugin], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
