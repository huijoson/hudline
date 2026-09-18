"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { sumUsageLines, emptyTotals, sentTokens } = require("../src/transcript.js");

const row = (message) => JSON.stringify({ type: "assistant", message });

test("the model that served a turn is collected, once each, in order", () => {
  const raw = [
    row({ id: "m1", model: "claude-opus-5", usage: { input_tokens: 10 } }),
    row({ id: "m2", model: "deepseek-v4.1-flash", usage: { input_tokens: 20 } }),
    row({ id: "m3", model: "claude-opus-5", usage: { input_tokens: 30 } }),
  ].join("\n");
  assert.deepEqual(sumUsageLines(raw).served_models, ["claude-opus-5", "deepseek-v4.1-flash"]);
});

test("a row the CLI manufactured itself is not a model that was served", () => {
  // Claude Code writes `"model":"<synthetic>"` on assistant rows it generated
  // locally rather than received from the API. It is a sentinel, not a model
  // id, and treating it as one would report a model that does not exist.
  const raw = [
    row({ id: "m1", model: "<synthetic>", usage: { input_tokens: 10 } }),
    row({ id: "m2", model: "claude-opus-5", usage: { input_tokens: 10 } }),
  ].join("\n");
  assert.deepEqual(sumUsageLines(raw).served_models, ["claude-opus-5"]);
});

test("a message written twice is one turn, and so one model", () => {
  const raw = [
    row({ id: "m1", model: "claude-opus-5", usage: { input_tokens: 10 } }),
    row({ id: "m1", model: "claude-opus-5", usage: { input_tokens: 10 } }),
  ].join("\n");
  assert.deepEqual(sumUsageLines(raw).served_models, ["claude-opus-5"]);
});

test("an empty Conversation names no model rather than no answer", () => {
  assert.deepEqual(emptyTotals().served_models, []);
  assert.equal(sentTokens(emptyTotals()), 0);
});
