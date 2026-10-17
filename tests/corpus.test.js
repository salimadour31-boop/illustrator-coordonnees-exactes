// Corpus synthétique : cartes de visite, en-têtes, affiches FR / AR / EN avec erreurs injectées
// Synthetic corpus: business cards, letterheads, posters FR / AR / EN with injected errors
'use strict';
const C = require('../CoordonneesExactes.jsx');
const lp = require('libphonenumber-js/max');
const { ok, eq, summary, rng } = require('./util');
C.setLang(true);
const R = rng(7);
const pick = a => a[Math.floor(R() * a.length)];
const O = Object.assign(C.engineDefaults(), { format: 'none' });
const AR = s => s.replace(/[0-9]/g, d => String.fromCharCode(0x660 + Number(d)));
// Numéros valides tirés au hasard, confirmés par libphonenumber-js / random valid numbers, confirmed by libphonenumber-js
function randomNumber(region, type) {
  const T = { M: 'MOBILE', F: 'FIXED_LINE' };
  for (let n = 0; n < 2000; n++) {
    const d = C.PHONE_REGIONS[region], pat = d[type]; if (!pat) return null;
    const L = pick(pat[1]); let s = '';
    const seeds = { DZ: { M: ['5', '6', '7'], F: ['2', '3', '4'] }, FR: { M: ['6', '7'], F: ['1', '2', '3', '4', '5'] }, MA: { M: ['6', '7'], F: ['5'] }, TN: { M: ['2', '5', '9'], F: ['7'] } };
    s = pick(seeds[region][type]); while (s.length < L) s += String(Math.floor(R() * 10));
    const p = lp.parsePhoneNumberFromString('+' + d.c + s);
    if (p && p.isValid() && (p.getType() === T[type] || p.getType() === 'FIXED_LINE_OR_MOBILE')) return { region, type, nsn: s, cc: d.c };
  }
  return null;
}
function writeNum(x, style) {
  const d = C.PHONE_REGIONS[x.region];
  if (style === 'intl') return C.formatIntl(x.cc, x.nsn, d);
  if (style === 'compact') return C.formatNational(x.nsn, d).replace(/ /g, '');
  if (style === 'dots') return C.formatNational(x.nsn, d).replace(/ /g, '.');
  return C.formatNational(x.nsn, d);
}
const NAMES = ['amine', 'sara', 'yacine', 'lina', 'karim', 'nadia', 'samir', 'meriem'];
const COMPANIES = ['sarl-amal', 'atlas-print', 'nour-design', 'djurdjura', 'tassili', 'elbaraka', 'medina-services'];
const NOISE = ['RC : 16/00-1234567B12', 'NIF : 000216001234567', 'NIS : 000116001234567', 'AI : 16012345678', 'Capital social : 1 000 000 DA', 'Cité 20 Août, Bt 12 n° 3, 16000 Alger', 'Ouvert de 08:00 à 17:00, du dimanche au jeudi', 'Prix : 2 500 DA – Promo -20 %', 'Édition 2025-2026, le 17/10/2026', 'Lot 123, Zone industrielle, BP 45', 'Réf. 0012345678', 'شارع العربي بن مهيدي، 31000 وهران', 'السجل التجاري : 16/00-1234567', 'Format 85 x 55 mm, 350 g'];
const ERR_KINDS = ['phoneDel', 'phoneIns', 'trunk0', 'faxMob', 'gmail', 'emailComma', 'www', 'http', 'tldcon', 'ccpKey', 'ripKey', 'ibanDigit', 'igHyphen', 'none', 'none', 'none'];
function mkCard() {
  const region = pick(['DZ', 'DZ', 'DZ', 'FR', 'MA', 'TN']);
  const mob = randomNumber(region, 'M'), fix = randomNumber(region, 'F');
  const name = pick(NAMES), comp = pick(COMPANIES), tld = region === 'DZ' ? 'dz' : (region === 'FR' ? 'fr' : 'com');
  const arabic = R() < 0.25, style = pick(['nat', 'nat', 'dots', 'compact', 'intl']);
  const parts = []; const marks = {};
  const ccp = String(Math.floor(R() * 1e8)), ccpK = C.ccpKey(ccp);
  const ripAcc = String(Math.floor(R() * 1e9)).padStart(10, '0'), ripK = C.ribKeyDZ('99999', ripAcc);
  let iban = 'FR00'; for (let k = 0; k < 23; k++) iban += String(Math.floor(R() * 10)); iban = 'FR' + C.ibanCheckDigits(iban) + iban.slice(4);
  const lines = {
    mob: (arabic ? 'جوال : ' : pick(['Mob : ', 'Mobile : ', 'GSM : ', 'Port. : ', 'M : '])) + (arabic ? AR(writeNum(mob, style === 'intl' ? 'nat' : style)) : writeNum(mob, style)),
    fix: (arabic ? 'هاتف : ' : pick(['Tél : ', 'Tél./Fax : ', 'Fixe : ', 'T : '])) + (arabic ? AR(writeNum(fix, 'nat')) : writeNum(fix, style)),
    mail: pick(['E-mail : ', 'Email : ', '', 'البريد الإلكتروني : ']) + (R() < 0.5 ? name + '@gmail.com' : 'contact@' + comp + '.' + tld),
    web: 'www.' + comp + '.' + tld,
    ig: 'Instagram : @' + comp.replace(/-/g, '.'),
    ccp: 'CCP : ' + ccp + ' clé ' + ccpK,
    rip: 'RIP : 007 99999 ' + ripAcc + ' ' + ripK,
    iban: 'IBAN : ' + iban.replace(/(.{4})/g, '$1 ').trim()
  };
  let err = pick(ERR_KINDS); if (err === 'igHyphen' && comp.indexOf('-') < 0) err = 'none';
  const D = n => n.replace(/[^0-9٠-٩]/g, '');
  if (err === 'phoneDel') { const s = lines.mob, idx = [...s].map((c, i) => /[0-9٠-٩]/.test(c) ? i : -1).filter(i => i >= 0); const p = idx[2 + Math.floor(R() * (idx.length - 2))]; lines.mob = s.slice(0, p) + s.slice(p + 1); }
  if (err === 'phoneIns') { const s = lines.fix, idx = [...s].map((c, i) => /[0-9٠-٩]/.test(c) ? i : -1).filter(i => i >= 0); const p = idx[2 + Math.floor(R() * (idx.length - 2))]; lines.fix = s.slice(0, p) + (arabic ? '٣' : '3') + s.slice(p); }
  if (err === 'trunk0') { lines.mob = 'Mob : ' + C.formatIntl(mob.cc, mob.nsn, C.PHONE_REGIONS[region]).replace(' ', ' 0'); }
  if (err === 'faxMob') { lines.fix = 'Fax : ' + writeNum(mob, 'nat'); }
  if (err === 'gmail') { lines.mail = 'E-mail : ' + name + '@' + pick(['gmial.com', 'gamil.com', 'gmail.fr', 'gmail.con', 'gmal.com', 'hotmial.com', 'yahooo.fr']); }
  if (err === 'emailComma') { lines.mail = 'E-mail : contact@' + comp + ',' + tld; }
  if (err === 'www') { lines.web = pick(['wwww.', 'ww.', 'www,']) + comp + '.' + tld; }
  if (err === 'http') { lines.web = pick(['http//', 'https:/', 'htpp://', 'http:\\\\']) + 'www.' + comp + '.' + tld; }
  if (err === 'tldcon') { lines.web = 'www.' + comp + '.' + pick(['con', 'cpm', 'comm', 'dzz', 'frr']); }
  if (err === 'ccpKey') { lines.ccp = 'CCP : ' + ccp + ' clé ' + String((Number(ccpK) + 1 + Math.floor(R() * 98)) % 100).padStart(2, '0'); }
  if (err === 'ripKey') { lines.rip = 'RIP : 007 99999 ' + ripAcc + ' ' + String((Number(ripK) % 97) + 1).padStart(2, '0'); }
  if (err === 'ibanDigit') { const p = 6 + Math.floor(R() * 20); const b = iban.slice(0, p) + String((Number(iban[p]) + 1) % 10) + iban.slice(p + 1); lines.iban = 'IBAN : ' + b.replace(/(.{4})/g, '$1 ').trim(); }
  if (err === 'igHyphen') { lines.ig = 'Instagram : @' + comp; }
  const target = { phoneDel: 'mob', phoneIns: 'fix', trunk0: 'mob', faxMob: 'fix', gmail: 'mail', emailComma: 'mail', www: 'web', http: 'web', tldcon: 'web', ccpKey: 'ccp', ripKey: 'rip', ibanDigit: 'iban', igHyphen: 'ig' }[err];
  const order = ['mob', 'fix', 'mail', 'web', 'ig']; if (region === 'DZ') order.push(pick(['ccp', 'rip'])); else order.push('iban');
  let errK = err, tgt = target; if (tgt && order.indexOf(tgt) < 0) { errK = 'none'; tgt = undefined; }
  const sep = pick(['\r', '\r', ' | ', '  •  ']);
  let text = (arabic ? 'شركة ' : '') + comp.toUpperCase() + '\r';
  const noise = [pick(NOISE), pick(NOISE)];
  const spans = {};
  const all = order.concat(['n0', 'n1']);
  all.sort(() => R() - 0.5);
  all.forEach((k, i) => { const s = k[0] === 'n' && k.length === 2 ? noise[Number(k[1])] : lines[k]; spans[k] = [text.length, text.length + s.length]; text += s + (i < all.length - 1 ? sep : ''); });
  return { text, region, err: errK, target: tgt, spans, valid: { mob, fix } };
}
const stats = {}; let clean = 0, cleanFP = 0, fpExamples = [], missed = [], recognized = 0, expected = 0;
for (let n = 0; n < 3000; n++) {
  const c = mkCard(); if (!c.valid.mob || !c.valid.fix) continue;
  const items = C.analyzeText(c.text, Object.assign({}, O, { region: c.region }));
  const bad = items.filter(it => it.issues.some(i => i.sev === 'err' || i.sev === 'warn'));
  // Toutes les lignes de coordonnées sont reconnues / every contact line is recognised
  for (const k of ['mob', 'fix', 'mail', 'web', 'ig', 'ccp', 'rip', 'iban']) {
    if (!c.spans[k]) continue; expected++;
    const [s, e] = c.spans[k];
    if (items.some(it => it.s >= s && it.e <= e)) recognized++; else if (missed.length < 6) missed.push(k + ' : ' + c.text.slice(s, e));
  }
  if (c.err === 'none') {
    clean++;
    if (bad.length) { cleanFP++; if (fpExamples.length < 8) fpExamples.push(bad.map(b => b.raw + ' → ' + b.issues.map(i => i.code).join(',')).join(' ; ') + '   ⟦' + c.text.replace(/\r/g, ' ⏎ ') + '⟧'); }
    continue;
  }
  const [s, e] = c.spans[c.target];
  const hit = bad.some(it => it.s < e && it.e > s);
  const elsewhere = bad.filter(it => !(it.s < e && it.e > s));
  stats[c.err] = stats[c.err] || { n: 0, hit: 0, other: 0 }; stats[c.err].n++; if (hit) stats[c.err].hit++; if (elsewhere.length) { stats[c.err].other++; if (fpExamples.length < 8) fpExamples.push('[' + c.err + '] ' + elsewhere.map(b => b.raw + ' → ' + b.issues.map(i => i.code).join(',')).join(' ; ')); }
}
console.log(`  ${clean} cartes sans erreur : ${cleanFP} avec fausse alerte`);
console.log(`  lignes de coordonnées reconnues : ${recognized}/${expected}`);
let totN = 0, totHit = 0, totOther = 0;
for (const [k, v] of Object.entries(stats)) { console.log(`  ${k.padEnd(11)} ${v.hit}/${v.n} trouvées, ${v.other} fausse(s) alerte(s) ailleurs`); totN += v.n; totHit += v.hit; totOther += v.other; }
for (const f of fpExamples) console.log('   FP:', f);
for (const f of missed) console.log('   non reconnu :', f);
eq(cleanFP, 0, 'aucune fausse alerte sur les cartes justes');
eq(totHit, totN, 'toutes les erreurs injectées trouvées');
eq(totOther, 0, 'aucune fausse alerte à côté des erreurs');
eq(recognized, expected, 'toutes les coordonnées reconnues');

// Bruit sans coordonnées : prix, dates, heures, RC, NIF, lots, versions, GPS…
// Noise without contact data: prices, dates, hours, trade register, tax ids, lots, versions, GPS…
const r = n => Math.floor(R() * n), z = (n, l) => String(n).padStart(l, '0');
const NOISE_GENS=[
 ()=>`Total : ${r(99)} ${z(r(1000),3)},00 DA`,
 ()=>`Du ${1+r(28)}/${1+r(12)} au ${1+r(28)}/${1+r(12)}/2026`,
 ()=>`${z(r(48)+1,2)}000 ${['Alger','Oran','Béjaïa','Tizi Ouzou'][r(4)]}`,
 ()=>`RC ${z(r(48)+1,2)}/00-${z(r(1e7),7)}B${z(r(30),2)}`,
 ()=>`NIF ${z(r(1e9),9)}${z(r(1e6),6)}`,
 ()=>`Commande n° 2026${z(1+r(12),2)}${z(1+r(28),2)}-${z(r(10000),4)}`,
 ()=>`Horaires ${z(r(12),2)}h${z(r(60),2)} - ${z(12+r(10),2)}h${z(r(60),2)}`,
 ()=>`Matricule ${z(r(1e4),4)} ${z(r(1e4),4)} ${z(r(100),2)}`,
 ()=>`Lot n° ${z(r(1e6),6)} - DLC ${z(1+r(28),2)}.${z(1+r(12),2)}.2027`,
 ()=>`Capital : ${r(100)} ${z(r(1000),3)} ${z(r(1000),3)} DA`,
 ()=>`Poids net ${z(r(1000),3)} g - ${r(10)},${r(10)} kg`,
 ()=>`Réf ${z(r(1e8),8)}`,
 ()=>`Facture N° ${z(r(1e6),6)}/2026`,
 ()=>`Version ${r(5)}.${r(10)}.${r(100)}`,
 ()=>`Coordonnées GPS : 36.${z(r(1e6),6)}, 3.${z(r(1e6),6)}`,
 ()=>`Taux ${r(10)},${z(r(100),2)} % - ${z(r(1e3),3)} 000 exemplaires`,
 ()=>`N° d'agrément ${z(r(1e4),4)}/${z(r(100),2)}/${z(r(1e3),3)}`,
 ()=>`Tirage : ${z(r(1e4),4)} ${z(r(1e3),3)}`,
 ()=>`رقم الطلب ${z(r(1e8),8)}`,
 ()=>`السعر : ${r(9)} ${z(r(1e3),3)} دج`,
];
let noiseFP = 0; const noiseEx = [];
for (let i = 0; i < 4000; i++) {
  const s = NOISE_GENS[r(NOISE_GENS.length)]();
  const it = C.analyzeText(s, C.engineDefaults());
  if (it.length) { noiseFP++; if (noiseEx.length < 5) noiseEx.push(s); }
}
console.log(`  4000 lignes de bruit : ${noiseFP} lue(s) à tort comme coordonnées`, noiseEx.join(' | '));
eq(noiseFP, 0, 'bruit : aucune coordonnée inventée');
process.exitCode = summary('corpus') ? 1 : 0;
