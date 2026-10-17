// Outils de test communs / shared test helpers
'use strict';
let pass = 0, fail = 0; const fails = [];
function ok(cond, name) { if (cond) { pass++; } else { fail++; if (fails.length < 40) fails.push(name); } }
function eq(a, b, name) { ok(a === b, name + ' (attendu / expected ' + JSON.stringify(b) + ', obtenu / got ' + JSON.stringify(a) + ')'); }
function summary(title) {
  console.log(`${title}: ${pass} réussi(s) / passed, ${fail} échec(s) / failed`);
  for (const f of fails) console.log('  ÉCHEC / FAIL:', f);
  return fail;
}
// Générateur pseudo-aléatoire reproductible / reproducible PRNG
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
module.exports = { ok, eq, summary, rng, counts: () => ({ pass, fail }) };
