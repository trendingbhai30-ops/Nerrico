// Nerrico Style Bible — definition schema + validation.
//
// A style definition is pure structured data. This module is the single
// contract for its shape, enforced AT REGISTRATION (like the Motion Engine:
// author mistakes throw at import time, long before a render). Checks:
//   1. every required field exists with the right type,
//   2. cross-references hold — renderStyle must be a real Remotion style,
//      every motion preference must resolve to an IMPLEMENTED Motion Registry
//      entry of the right category (a style can never steer the planner
//      toward a static shot),
//   3. incompatible options — forbidden elements must not appear in the
//      style's own prompt vocabulary/anchors/prefix/suffix.

import { STYLES } from '../styles.js';
import { motionRegistry, resolveMotion } from '../../../remotion/motion/index.js';

const PACES = ['slow', 'medium', 'fast'];
const STATUSES = ['active', 'future'];

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isStrArray = (v, min = 1) => Array.isArray(v) && v.length >= min && v.every(isStr);

function bad(name, field, why) {
  throw new Error(`Style Bible: "${name}" invalid — ${field}: ${why}`);
}

// A motion preference may be a KIND of the given category or a PRESET that
// resolves to that category — exactly the contract validateShots enforces on
// planner output (scenes.js), applied here to the style author instead.
function checkMotionRef(name, field, ref, category) {
  const resolved =
    motionRegistry.has(category, ref) || motionRegistry.has('preset', ref)
      ? resolveMotion(motionRegistry.has(category, ref) ? { category, kind: ref } : ref)
      : null;
  if (!resolved || resolved.category !== category) {
    bad(name, field, `"${ref}" is not a registered ${category} kind or ${category}-category preset`);
  }
  if (resolved.def?.status !== 'implemented') {
    bad(name, field, `"${ref}" is not implemented — a style may only prefer implemented motion`);
  }
}

export function validateStyleDefinition(def) {
  if (!def || typeof def !== 'object') throw new Error('Style Bible: definition must be an object');
  const name = def.name;
  if (!isStr(name) || !/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Style Bible: style name must be kebab-case, got "${name}"`);
  }

  // --- required scalar fields -------------------------------------------------
  for (const f of ['displayName', 'description', 'philosophy', 'cameraBehaviour']) {
    if (!isStr(def[f])) bad(name, f, 'required non-empty string');
  }
  if (!STATUSES.includes(def.status)) bad(name, 'status', `must be one of ${STATUSES.join('|')}`);
  if (!STYLES[def.renderStyle]) {
    bad(name, 'renderStyle', `"${def.renderStyle}" is not a registered render style (${Object.keys(STYLES).join(', ')})`);
  }

  // --- rule lists -------------------------------------------------------------
  for (const f of ['composition', 'framing', 'lighting', 'forbidden']) {
    if (!isStrArray(def[f])) bad(name, f, 'required non-empty array of strings');
  }

  // --- motion preferences -----------------------------------------------------
  const m = def.motion;
  if (!m || typeof m !== 'object') bad(name, 'motion', 'required object');
  if (!PACES.includes(m.pace)) bad(name, 'motion.pace', `must be one of ${PACES.join('|')}`);
  if (!isStrArray(m.cameraPresets)) bad(name, 'motion.cameraPresets', 'required non-empty array');
  for (const p of m.cameraPresets) checkMotionRef(name, 'motion.cameraPresets', p, 'camera');
  if (!Array.isArray(m.transitions)) bad(name, 'motion.transitions', 'required array (may be empty)');
  for (const t of m.transitions) checkMotionRef(name, 'motion.transitions', t, 'transition');
  if (!Array.isArray(m.effects)) bad(name, 'motion.effects', 'required array (may be empty)');
  for (const e of m.effects) checkMotionRef(name, 'motion.effects', e, 'effect');
  if (!isStr(m.transitionFrequency)) bad(name, 'motion.transitionFrequency', 'required non-empty string');
  if (!isStr(m.effectFrequency)) bad(name, 'motion.effectFrequency', 'required non-empty string');

  // --- palette / lighting / typography ---------------------------------------
  const pal = def.colorPalette;
  if (!pal || typeof pal !== 'object') bad(name, 'colorPalette', 'required object');
  if (!isStr(pal.description)) bad(name, 'colorPalette.description', 'required non-empty string');
  if (!isStrArray(pal.tones)) bad(name, 'colorPalette.tones', 'required non-empty array');
  if (!isStr(pal.accent)) bad(name, 'colorPalette.accent', 'required non-empty string');

  const typo = def.typography;
  if (!typo || typeof typo !== 'object') bad(name, 'typography', 'required object');
  if (!isStr(typo.captionStyle)) bad(name, 'typography.captionStyle', 'required non-empty string');
  if (!isStrArray(typo.rules)) bad(name, 'typography.rules', 'required non-empty array');

  // --- image prompt rules -----------------------------------------------------
  const ip = def.imagePrompt;
  if (!ip || typeof ip !== 'object') bad(name, 'imagePrompt', 'required object');
  for (const f of ['medium', 'prefix']) {
    if (!isStr(ip[f])) bad(name, `imagePrompt.${f}`, 'required non-empty string');
  }
  if (typeof ip.suffix !== 'string') bad(name, 'imagePrompt.suffix', 'required string (may be empty)');
  if (!isStrArray(ip.vocabulary)) bad(name, 'imagePrompt.vocabulary', 'required non-empty array');
  if (!isStrArray(ip.rules)) bad(name, 'imagePrompt.rules', 'required non-empty array');

  // --- consistency system -----------------------------------------------------
  const con = def.consistency;
  if (!con || typeof con !== 'object') bad(name, 'consistency', 'required object');
  if (!isStrArray(con.rules)) bad(name, 'consistency.rules', 'required non-empty array');
  if (!isStrArray(con.promptAnchors)) bad(name, 'consistency.promptAnchors', 'required non-empty array');

  // --- incompatible options ---------------------------------------------------
  // A style must not forbid something its own prompt machinery injects: every
  // composed image prompt contains prefix + anchors + suffix, and the planner
  // is pushed toward vocabulary — a forbidden term appearing there would make
  // the style violate itself on every single shot.
  const selfText = [ip.prefix, ip.suffix, ...ip.vocabulary, ...con.promptAnchors]
    .join(' | ')
    .toLowerCase();
  for (const f of def.forbidden) {
    if (selfText.includes(f.toLowerCase())) {
      bad(name, 'forbidden', `"${f}" also appears in the style's own vocabulary/anchors/prefix/suffix — incompatible`);
    }
  }
}
