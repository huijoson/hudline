"use strict";

const { getField, GROUP_ORDER, FIELD_KEYS } = require("./fields.js");

// Four starting points, chosen to be visibly different from one another rather
// than variations on one line. There is deliberately no "everything" template:
// the line it produces is wider than a terminal and reads as a recommendation,
// and the need it appears to serve — "what fields exist?" — is documentation's
// job (`hudline --list-fields`), not a template's.
const TEMPLATES = [
  {
    name: "default",
    description: "model, context, both quota windows, cost, token flow",
    // The line answers one question: what have I spent, and how fast am I
    // spending it. `cost` is the money, `5h`/`7d` are the ceilings that stop
    // you, `ctx` is the one that stops this conversation, and `sent`/`out` are
    // the volume driving all three. `cr` is the efficiency: input that missed
    // the cache is input paid for at full price.
    //
    // `cwd` is not here. Every Host supplies it, so it costs width on every
    // Host, and it answers a question this line is not asking. `quota` and
    // `branch` stay because they cost *nothing* where they are unsupported —
    // they disappear and the line is byte-identical without them, which is the
    // whole point of Missing disappearing, and it is what keeps one Format
    // portable across Hosts that report different things.
    //
    // Neither `tot` nor `cw` is here, under one rule: the default line does not
    // carry a number derivable from the numbers already on it. `tot` sits
    // within 1% of `sent` on any Conversation long enough to matter, and `cw`
    // is `100 - cr` once a rounding-error remainder is ignored. Both remain
    // Fields, and both are in the `tokens` template, which is for accounting.
    //
    // The two Segments are not decoration either: each share is kept beside the
    // total it divides, so `cr 98%` and `th 48%` cannot be read as percentages
    // of the same thing.
    format:
      "{model}[:{effort}]|ctx {ctx}|5h {5h} left[ ({5h_reset})]|7d {7d} left[ ({7d_reset})]|" +
      "quota {quota}[ ({quota_reset})]|{cost}|{branch}|{say}|" +
      "[sent {sent}] [cr {cr}]|[out {out}] [th {th}]",
  },
  {
    name: "minimal",
    description: "just what you glance at",
    format: "{model}[:{effort}]|ctx {ctx}|{cwd}",
  },
  {
    name: "limits",
    description: "both quota windows, for when you are near the ceiling",
    format:
      "{model}[:{effort}]|ctx {ctx}|5h {5h}[ ({5h_reset})]|7d {7d}[ ({7d_reset})]|" +
      "quota {quota}[ ({quota_reset})]|{cwd}|{say}",
  },
  {
    name: "tokens",
    description: "conversation token accounting",
    format: "ctx {ctx}|[sent {sent}] [cr {cr}] [cw {cw}]|[out {out}] [th {th}]|[tot {tot}]|{cwd}",
  },
];

const DEFAULT_FORMAT = TEMPLATES[0].format;

function getTemplate(name) {
  return TEMPLATES.find((template) => template.name === name);
}

// Turn an ordered list of Field keys into a Format. Consecutive Fields sharing
// a group land in one Segment so a token breakdown reads as one run rather
// than six pipe-separated fragments; a Field with `attach` folds into the
// Segment of the Field it modifies instead of becoming its peer.
function buildFormat(keys) {
  const segments = [];
  let current = null;
  let currentGroup = null;
  const partOf = new Map();

  for (const key of keys) {
    const field = getField(key);
    if (!field) continue;

    // An attaching Field appends to the part it modifies, wherever that part
    // sits — not to the end of the Segment, which would strand "(resets ...)"
    // behind an unrelated Field.
    const target = field.attach && partOf.get(field.attach.to);
    if (target) {
      target.text += field.attach.source;
      continue;
    }

    const part = { key, text: field.label ? `${field.label} {${key}}` : `{${key}}` };
    if (current && currentGroup === field.group) {
      current.push(part);
    } else {
      current = [part];
      currentGroup = field.group;
      segments.push(current);
    }
    partOf.set(key, part);
  }

  return segments
    .map((parts) =>
      parts.length === 1 ? parts[0].text : parts.map((part) => `[${part.text}]`).join(" ")
    )
    .join("|");
}

// The order the Wizard lists Fields in, and the order --show falls back to.
function catalogueOrder() {
  return [...FIELD_KEYS].sort(
    (a, b) => GROUP_ORDER.indexOf(getField(a).group) - GROUP_ORDER.indexOf(getField(b).group)
  );
}

module.exports = { TEMPLATES, DEFAULT_FORMAT, getTemplate, buildFormat, catalogueOrder };
