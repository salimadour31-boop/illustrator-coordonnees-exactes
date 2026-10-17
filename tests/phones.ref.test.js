// Comparaison avec libphonenumber-js (implémentation de référence indépendante, même source de données)
// Comparison with libphonenumber-js (independent reference implementation, same data source)
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../CoordonneesExactes.jsx');
const lp = require('libphonenumber-js/max');
const { ok, eq, summary, rng } = require('./util');
C.setLang(true);
const xml = fs.readFileSync(path.join(__dirname, '../data/PhoneNumberMetadata.xml'), 'utf8');
const TYPES = { fixedLine: 'F', mobile: 'M', voip: 'V', tollFree: 'T', premiumRate: 'P', sharedCost: 'S', uan: 'U', personalNumber: 'N', pager: 'G', voicemail: 'W' };
const LPT = { FIXED_LINE: 'F', MOBILE: 'M', FIXED_LINE_OR_MOBILE: 'FM', VOIP: 'V', TOLL_FREE: 'T', PREMIUM_RATE: 'P', SHARED_COST: 'S', UAN: 'U', PERSONAL_NUMBER: 'N', PAGER: 'G', VOICEMAIL: 'W' };
const ex = [];
const terrRe = /<territory id="([A-Z0-9]+)" countryCode="(\d+)"[\s\S]*?<\/territory>/g; let m;
while ((m = terrRe.exec(xml))) {
  if (m[1] === '001') continue;
  for (const [tag, k] of Object.entries(TYPES)) {
    const r = new RegExp('<' + tag + '>[\\s\\S]*?<exampleNumber>(\\d+)</exampleNumber>[\\s\\S]*?</' + tag + '>').exec(m[0]);
    if (r) ex.push({ region: m[1], cc: m[2], type: k, nsn: r[1] });
  }
}
// 1. Chaque numéro d'exemple officiel est valide, du bon type / every official example is valid, right type
let typeOk = 0, typeTot = 0;
for (const e of ex) {
  const r = C.parsePhone('+' + e.cc + ' ' + e.nsn, { region: 'DZ', label: 'tel' });
  ok(r.status === 'ok', `exemple ${e.region} ${e.type} +${e.cc}${e.nsn} valide (statut ${r.status})`);
  typeTot++; if (r.type === e.type || (r.type === 'FM' && (e.type === 'F' || e.type === 'M'))) typeOk++;
  // Même chose en écriture nationale dans le pays / same in national writing in the country
  const d = C.PHONE_REGIONS[e.region];
  if (d.np === '0' && e.region !== 'AR') {
    const rn = C.parsePhone(C.formatNational(e.nsn, d), { region: e.region, label: 'tel' });
    ok(rn.status === 'ok' || rn.issues.some(i => i.code === 'FORMAT'), `exemple national ${e.region} ${C.formatNational(e.nsn, d)} (statut ${rn.status})`);
  }
}
console.log(`  ${ex.length} numéros d'exemple, type identique : ${typeOk}/${typeTot}`);
// 2. Numéros modifiés (chiffre supprimé, ajouté, remplacé) : même verdict que libphonenumber-js
// 2. Mutated numbers (digit removed, added, replaced): same verdict as libphonenumber-js
const R = rng(20261017); let agree = 0, total = 0, typeAgree = 0, typeTotal = 0; const diffs = {};
for (let n = 0; n < 40000; n++) {
  const e = ex[Math.floor(R() * ex.length)];
  let s = e.nsn; const op = Math.floor(R() * 4), p = Math.floor(R() * (s.length + 1)), dg = String(Math.floor(R() * 10));
  if (op === 0) s = s.slice(0, p) + s.slice(p + 1);
  else if (op === 1) s = s.slice(0, p) + dg + s.slice(p);
  else if (op === 2) s = s.slice(0, p) + dg + s.slice(p + 1);
  if (s.length < 2) continue;
  const mine = C.parsePhone('+' + e.cc + s, { region: 'DZ', label: 'tel' });
  const ref = lp.parsePhoneNumberFromString('+' + e.cc + s);
  const refValid = !!(ref && ref.isValid());
  // Notre « 0 gardé après l'indicatif » est une erreur, la référence l'accepte parfois / we flag kept trunk 0
  const mineValid = mine.status === 'ok' && !mine.issues.some(i => i.sev === 'err');
  const trunk = mine.issues.some(i => i.code === 'TRUNK0' || i.code === 'PAREN0');
  if (trunk) continue;
  total++;
  if (mineValid === refValid) agree++; else { const k = e.region; diffs[k] = (diffs[k] || 0) + 1; }
  if (mineValid && refValid) { typeTotal++; const t = LPT[ref.getType()]; if (t === mine.type) typeAgree++; }
}
const rate = agree / total;
console.log(`  ${total} numéros modifiés : verdict identique à libphonenumber-js ${agree}/${total} (${(rate * 100).toFixed(2)} %), type identique ${typeAgree}/${typeTotal}`);
const worst = Object.entries(diffs).sort((a, b) => b[1] - a[1]).slice(0, 8); if (worst.length) console.log('  écarts par pays :', JSON.stringify(worst));
ok(rate > 0.99, 'accord > 99 % avec libphonenumber-js');
ok(typeAgree / typeTotal > 0.98, 'types identiques > 98 %');
// 3. Numéros nationaux algériens et français aléatoires / random Algerian and French national numbers
let nat = 0, natAgree = 0;
for (let n = 0; n < 6000; n++) {
  const reg = ['DZ', 'FR', 'MA', 'TN', 'BE', 'CH'][n % 6];
  let len = 8 + Math.floor(R() * 4), s = '0';
  for (let k = 1; k < len; k++) s += String(Math.floor(R() * 10));
  const mine = C.parsePhone(s, { region: reg, label: 'tel' });
  const ref = lp.parsePhoneNumberFromString(s, reg);
  const mineValid = mine.status === 'ok' && !mine.issues.some(i => i.sev === 'err');
  const refValid = !!(ref && ref.isValid());
  nat++; if (mineValid === refValid) natAgree++;
}
console.log(`  ${nat} numéros nationaux aléatoires (DZ, FR, MA, TN, BE, CH) : accord ${natAgree}/${nat}`);
ok(natAgree / nat > 0.99, 'accord national > 99 %');
// 4. Écriture standard identique à libphonenumber-js / same standard form as libphonenumber-js
let fmtTot = 0, fmtNat = 0, fmtInt = 0;
for (const e of ex) {
  const ref = lp.parsePhoneNumberFromString('+' + e.cc + e.nsn); if (!ref || !ref.isValid()) continue;
  const d = C.PHONE_REGIONS[ref.country || e.region]; if (!d) continue;
  fmtTot++;
  if (C.formatIntl(e.cc, e.nsn, d).replace(/-/g, ' ') === ref.formatInternational().replace(/-/g, ' ')) fmtInt++;
  if (C.formatNational(e.nsn, d) === ref.formatNational()) fmtNat++;
}
console.log(`  écriture standard : internationale ${fmtInt}/${fmtTot}, nationale ${fmtNat}/${fmtTot} identiques à libphonenumber-js`);
ok(fmtInt / fmtTot > 0.97, 'format international > 97 %');
ok(fmtNat / fmtTot > 0.9, 'format national > 90 %');
process.exitCode = summary('phones.ref') ? 1 : 0;
