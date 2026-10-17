// FR : Assemble src/part*.js en CoordonneesExactes.jsx et échappe les caractères non ASCII des
//      chaînes et expressions régulières (sûr pour ExtendScript quel que soit l'encodage lu).
// EN : Assembles src/part*.js into CoordonneesExactes.jsx and escapes non-ASCII characters inside
//      strings and regex literals (safe for ExtendScript whatever encoding it reads).
'use strict';
const fs = require('fs'), path = require('path');
const acorn = require('acorn');
const dir = path.join(__dirname, '../src');
const src = fs.readdirSync(dir).filter(f => /^part\d.*\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
const esc = s => s.replace(/[^\x00-\x7E]/g, c => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
let out = '', last = 0;
for (const tk of acorn.tokenizer(src, { ecmaVersion: 5 })) {
  if (tk.type.label === 'string' || tk.type.label === 'regexp' || tk.type.label === 'template') {
    out += src.slice(last, tk.start) + esc(src.slice(tk.start, tk.end)); last = tk.end;
  }
}
out += src.slice(last);
fs.writeFileSync(path.join(__dirname, '../CoordonneesExactes.jsx'), out);
console.log('CoordonneesExactes.jsx', out.length, 'octets / bytes');
