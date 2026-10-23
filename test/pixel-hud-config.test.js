"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const plugin = require("../plugins/pixel-hud/.claude-plugin/plugin.json");

test("pixel-hud offers the stage theme picker with slimes as the default", () => {
  assert.deepEqual(plugin.userConfig.stage, {
    type: "string",
    title: "Stage theme",
    options: ["slimes", "quest"],
    default: "slimes",
    description: "What walks beside the branch: the slime family, or a hero who fights a monster each time a task finishes.",
  });
});
