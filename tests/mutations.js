// Mutations volontaires : les tests doivent échouer / deliberate mutations: tests must fail
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const src = fs.readFileSync(path.join(__dirname, '../CoordonneesExactes.jsx'), 'utf8');
const MUT = [
  ['modulo 97 faux', "(r * 10 + (s.charCodeAt(i) - 48)) % 97", "(r * 10 + (s.charCodeAt(i) - 48)) % 96"],
  ['clé RIB sans le ×100', "mod97(agency + account + '00')", "mod97(agency + account + '0')"],
  ['poids CCP décalés', "* (4 + j)", "* (3 + j)"],
  ['GS1 poids inversés', "var s = 0, i, w = 3, d;", "var s = 0, i, w = 1, d;"],
  ['Luhn sans le −9', "if (d > 9) { d -= 9; }", ""],
  ['exception La Poste oubliée', "if (s.substr(0, 9) === '356000000' && s !== '35600000000048')", "if (false)"],
  ['insécable non posé', "chars(head)[i].characterAttributes.noBreak = true;", ""],
  ['texte modifié non vérifié', "if (cur !== st.text || n !== cur.length) { out.skipped += list.length; continue; }", ""],
  ['textes verrouillés modifiés', "if (!st.editable) { out.locked += list.length; continue; }", ""],
  ['calque de repères imprimable', "try { L.printable = false; } catch (e4) { }", ""],
  ['distance de frappe sans transposition', "editDistance(label, P.b)", "editDistance(label, P.b) + 1"],
  ['préfixe national gardé non vu', "code: 'TRUNK0'", "code: 'TRUNKX'"],
];
const TESTS = ['engine.test.js', 'corpus.test.js', 'dom.test.js'];
let killed = 0;
for (const [name, a, b] of MUT) {
  if (src.indexOf(a) < 0) { console.log('mutation introuvable / not found:', name); continue; }
  const tmp = path.join(__dirname, '../CoordonneesExactes.mut.jsx');
  fs.writeFileSync(tmp, src.replace(a, b));
  let failed = false;
  for (const t of TESTS) {
    const code = fs.readFileSync(path.join(__dirname, t), 'utf8').split("require('../CoordonneesExactes.jsx')").join("require('../CoordonneesExactes.mut.jsx')").split("require('./").join("require('" + __dirname + "/");
    const tf = path.join(__dirname, '_mut_' + t); fs.writeFileSync(tf, code);
    try { cp.execFileSync('node', [tf], { stdio: 'pipe' }); } catch (e) { failed = true; }
    fs.unlinkSync(tf);
    if (failed) break;
  }
  fs.unlinkSync(tmp);
  console.log((failed ? 'détectée / killed : ' : 'NON détectée / survived : ') + name);
  if (failed) killed++;
}
console.log(killed + '/' + MUT.length + ' mutations détectées');
process.exit(killed === MUT.length ? 0 : 1);
