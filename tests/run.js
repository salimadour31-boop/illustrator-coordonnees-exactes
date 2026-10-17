// Lance tous les tests Node / runs every Node test
'use strict';
const cp = require('child_process'), path = require('path');
const list = ['engine.test.js', 'phones.ref.test.js', 'corpus.test.js', 'dom.test.js', 'mutations.js'];
let bad = 0;
for (const t of list) {
  try { process.stdout.write(cp.execFileSync('node', [path.join(__dirname, t)], { encoding: 'utf8' })); }
  catch (e) { bad++; process.stdout.write(String(e.stdout || '') + String(e.stderr || '')); console.log('>>> ÉCHEC / FAILED: ' + t); }
}
console.log(bad ? bad + ' fichier(s) de test en échec / failing test file(s)' : 'Tous les tests Node réussis / all Node tests passed');
process.exit(bad ? 1 : 0);
