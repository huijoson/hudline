"use strict";

const fs = require("fs");

const USAGE_FIELDS = [
  "input_tokens",
  "output_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
];

// Claude Code writes `"model":"<synthetic>"` on assistant rows it manufactured
// itself rather than received from the API. It is a sentinel, not a model id,
// and reading it as one would be reading a bug report as a fact.
const SYNTHETIC_MODEL = "<synthetic>";

// Cumulative usage across a whole conversation. This cannot be read from the
// Payload: `context_window.total_input_tokens` is current occupancy, not a
// running total, so the transcript is the only source for it.
//
// Claude Code can write more than one JSONL line per API response, each
// repeating the same `message.usage`, so entries are de-duplicated by
// `message.id` before summing.
function sumUsageLines(raw) {
  const totals = Object.fromEntries(USAGE_FIELDS.map((field) => [field, 0]));
  totals.thinking_tokens = 0;
  totals.served_models = [];

  const seenIds = new Set();
  const seenModels = new Set();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!entry || entry.type !== "assistant") continue;

    const message = entry.message;
    if (!message || typeof message !== "object") continue;

    const messageId = message.id;
    const usage = message.usage;
    if (!messageId || !usage || typeof usage !== "object") continue;
    if (seenIds.has(messageId)) continue;
    seenIds.add(messageId);

    // The model that actually served the turn — which is not necessarily the
    // one the session asked for, and is the one a Host prices. Collected here
    // because this loop is already walking every row that carries it.
    const served = message.model;
    if (typeof served === "string" && served && served !== SYNTHETIC_MODEL && !seenModels.has(served)) {
      seenModels.add(served);
      totals.served_models.push(served);
    }

    for (const field of USAGE_FIELDS) {
      const value = usage[field];
      if (typeof value === "number" && Number.isFinite(value)) totals[field] += value;
    }

    // thinking_tokens is a breakdown of output_tokens, not additional to it —
    // folding it into the total would double-count.
    const thinking = usage.output_tokens_details?.thinking_tokens;
    if (typeof thinking === "number" && Number.isFinite(thinking)) {
      totals.thinking_tokens += thinking;
    }
  }
  return totals;
}

// Input, in the two-layer sense: everything sent to the model. `input_tokens`
// alone is only the residue that missed the cache both ways — on a cached
// Conversation it is a handful of tokens, and reporting it as "input" is the
// mistake this function exists to stop anyone making again.
function sentTokens(totals) {
  return totals.input_tokens + totals.cache_read_input_tokens + totals.cache_creation_input_tokens;
}

function emptyTotals() {
  const totals = Object.fromEntries(USAGE_FIELDS.map((field) => [field, 0]));
  totals.thinking_tokens = 0;
  totals.served_models = [];
  return totals;
}

// Returns null when there is no transcript to read, and zeros when there is one
// that happens to contain no usage yet. Those are different facts: a
// conversation that has genuinely used 0 tokens should print `in 0`, while a
// Payload that carries no transcript at all has nothing to say and its token
// Fields are Missing.
function readClaudeTranscript(transcriptPath) {
  if (!transcriptPath || typeof transcriptPath !== "string") return null;
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return null;
  }
  return sumUsageLines(raw);
}

module.exports = { readClaudeTranscript, sumUsageLines, sentTokens, emptyTotals, USAGE_FIELDS };
