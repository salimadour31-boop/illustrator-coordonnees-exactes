// Tests des fonctions pures / pure-function tests
'use strict';
const C = require('../CoordonneesExactes.jsx');
const { ok, eq, summary, rng } = require('./util');
C.setLang(true);
const O = Object.assign(C.engineDefaults(), { format: 'none' });
const R = rng(42);
const codesOf = (s, o) => C.analyzeText(s, Object.assign({}, O, o || {})).map(it => it.kind + ':' + (it.issues.map(i => i.code).join(',') || 'OK'));
const fixOf = (s, o) => { for (const it of C.analyzeText(s, Object.assign({}, O, o || {}))) for (const i of it.issues) if (i.fix && i.fix.to) return i.fix.to; return null; };

// --- Chiffres / digits
eq(C.asciiDigits('٠٥٥٠ ١٢ ۳۴'), '0550 12 34', 'chiffres arabes et persans');
eq(C.asciiDigits('٠٥٥٠').length, 4, 'longueur conservée');
eq(C.digitsLike('0550 12', '٠٦٦١'), '٠٥٥٠ ١٢', 'réécriture en chiffres arabes');
// --- Script de modifications : propriété sur 3000 paires aléatoires / edit script property
const alpha = '0123456789 +.-()ab';
let lcsOk = true, applyOk = true;
function lcs(a, b) { const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]); return L[0][0]; }
for (let n = 0; n < 3000; n++) {
  const mk = () => { let s = ''; const l = Math.floor(R() * 16); for (let k = 0; k < l; k++) s += alpha[Math.floor(R() * alpha.length)]; return s; };
  const a = mk(), b = mk(), ops = C.editOps(a, b);
  if (C.applyOpsToString(a, ops) !== b) applyOk = false;
  const deleted = ops.reduce((x, o) => x + o.del, 0);
  if (a.length - deleted !== lcs(a, b)) lcsOk = false;
}
ok(applyOk, 'editOps reconstruit la cible (3000 paires)');
ok(lcsOk, 'editOps garde le maximum de caractères (LCS)');
// --- Clés de contrôle / check digits
for (const iban of ['GB82WEST12345698765432', 'FR1420041010050500013M02606', 'DE89370400440532013000', 'BE68539007547034', 'NL91ABNA0417164300', 'CH9300762011623852957', 'TN5910006035183598478831', 'SA0380000000608010167519', 'AE070331234567890123456', 'MR1300020001010000123456753'])
  ok(C.ibanValid(iban), 'IBAN valide ' + iban);
ok(!C.ibanValid('GB82WEST12345698765433'), 'IBAN faux détecté');
let ibanMut = 0, ibanTot = 0;
for (let n = 0; n < 2000; n++) {
  let body = 'FR00'; for (let k = 0; k < 23; k++) body += String(Math.floor(R() * 10));
  body = 'FR' + C.ibanCheckDigits(body) + body.slice(4);
  ok(C.ibanValid(body), 'IBAN généré valide');
  const p = 4 + Math.floor(R() * 23), d = String((Number(body[p]) + 1 + Math.floor(R() * 9)) % 10);
  ibanTot++; if (!C.ibanValid(body.slice(0, p) + d + body.slice(p + 1))) ibanMut++;
}
eq(ibanMut, ibanTot, 'IBAN : tout chiffre changé est détecté (2000)');
// RIP Algérie Poste publié (CCP 200 clé 12, RIP 00799999000000020091) / published RIP
eq(C.ribKeyDZ('99999', '0000000200'), '91', 'clé RIP du compte public CCP 200');
eq(C.ccpKey('200'), '12', 'clé CCP du compte public 200');
// Référence indépendante (bibliothèque Python « algeria » : 97 − ((ccp×100 mod 97) + 85) mod 97)
for (let n = 0; n < 3000; n++) {
  const acc = Math.floor(R() * 1e10); const r = (acc * 100) % 97; let x = r + 85 > 97 ? 97 - (r + 85 - 97) : 97 - (r + 85); // formule telle que publiée
  if (x === 0) x = 97;
  const mine = C.ribKeyDZ('99999', String(acc).padStart(10, '0'));
  if (r + 85 !== 97) eq(Number(mine), x, 'clé RIP = référence Python pour ' + acc);
}
// CCP : référence indépendante (poids 4…13 depuis la droite)
for (let n = 0; n < 2000; n++) { const acc = String(Math.floor(R() * 1e9)); const x = acc.padStart(10, '0'); let s = 0; for (let j = 0; j < 10; j++) s += Number(x[9 - j]) * (4 + j); eq(C.ccpKey(acc), String(s % 100).padStart(2, '0'), 'clé CCP ' + acc); }
eq(C.gs1Check('400638133393'), '1', 'EAN-13 Wikipédia 4006381333931');
eq(C.gs1Check('978030640615'), '7', 'ISBN-13 9780306406157');
eq(C.isbn10Check('030640615'), '2', 'ISBN-10 0306406152');
eq(C.issnCheck('0317847'), '1', 'ISSN 0317-8471');
eq(C.issnCheck('0378595'), '5', 'ISSN 0378-5955');
eq(C.issnCheck('2434561'), 'X', 'ISSN 2434-561X');
ok(C.luhnValid('732829320'), 'SIREN 732 829 320 (Luhn)');
ok(C.siretValid('73282932000074'), 'SIRET 732 829 320 00074');
ok(C.siretValid('35600000049837'), 'SIRET La Poste (somme multiple de 5)');
ok(!C.siretValid('35600000049838'), 'SIRET La Poste faux');
ok(C.siretValid('35600000000048'), 'SIRET du siège de La Poste (Luhn)');
eq(C.tvaFrKey('404833048'), '83', 'TVA FR83404833048');
// --- Codes dans le texte / codes in text
eq(codesOf('IBAN : FR14 2004 1010 0505 0001 3M02 606 BIC : PSSTFRPPXXX').join(' '), 'code:OK', 'IBAN groupé + BIC non avalé');
eq(codesOf('IBAN FR14 2004 1010 0505 0001 3M02 60').join(' '), 'code:IBAN_LEN', 'IBAN trop court');
eq(codesOf('RIP : 007 99999 0000000200 91').join(' '), 'code:OK', 'RIP juste');
eq(codesOf('RIB : 007 99999 0000000200 19').join(' '), 'code:RIB_KEY', 'RIP clé inversée');
eq(codesOf('Dons : CCP 200 clé 12').join(' '), 'code:OK', 'CCP + clé juste');
eq(codesOf('CCP : 0000000201 Clé 12').join(' '), 'code:CCP_KEY', 'CCP chiffre faux');
eq(codesOf('CCP 1234567/89').join(' '), 'code:' + (C.ccpKey('1234567') === '89' ? 'OK' : 'CCP_KEY'), 'CCP écrit avec /');
eq(codesOf('ISBN 978-0-306-40615-7').join(' '), 'code:OK', 'ISBN-13 juste');
eq(codesOf('ISBN : 0-306-40615-2').join(' '), 'code:OK', 'ISBN-10 juste');
eq(codesOf('ISBN 978-0-306-40651-7').join(' '), 'code:ISBN_KEY', 'ISBN inversion');
eq(codesOf('ISSN 0317-8471').join(' '), 'code:OK', 'ISSN juste');
eq(codesOf('EAN 13 : 4006381333932').join(' '), 'code:EAN_KEY', 'EAN faux');
eq(codesOf('SIRET : 732 829 320 00074').join(' '), 'code:OK', 'SIRET juste');
eq(codesOf('N° TVA : FR 83 404 833 048').join(' '), 'code:OK', 'TVA FR juste');
eq(codesOf('N° TVA : FR 84 404 833 048').join(' '), 'code:TVA_KEY', 'TVA FR fausse');
// --- E-mails
eq(codesOf('contact@sarl-amal.dz').join(' '), 'email:OK', 'e-mail juste');
eq(codesOf('info@gmial.com').join(' '), 'email:PROVIDER', 'gmial');
eq(fixOf('info@gmial.com'), 'info@gmail.com', 'gmial → gmail');
eq(fixOf('ali@gamil.com'), 'ali@gmail.com', 'gamil → gmail');
eq(fixOf('ali@hotmial.fr'), 'ali@hotmail.fr', 'hotmial.fr → hotmail.fr');
eq(fixOf('ali@yahooo.fr'), 'ali@yahoo.fr', 'yahooo.fr');
eq(fixOf('ali@outlok.com'), 'ali@outlook.com', 'outlok');
eq(fixOf('ali@gmail.fr'), 'ali@gmail.com', 'gmail.fr');
eq(fixOf('ali@gmail.con'), 'ali@gmail.com', 'gmail.con');
eq(fixOf('ali@gmail,com'), 'ali@gmail.com', 'gmail,com');
eq(fixOf('ali @gmail.com'), 'ali@gmail.com', 'espace avant @');
eq(fixOf('ali@ gmail.com'), 'ali@gmail.com', 'espace après @');
eq(fixOf('ali..b@gmail.com'), 'ali.b@gmail.com', 'deux points');
eq(fixOf('ali.@gmail.com'), 'ali@gmail.com', 'point avant @');
eq(codesOf('ali@hotmail.dz').join(' '), 'email:PROVIDER', 'hotmail.dz inexistant');
eq(codesOf('Écrivez à sarl@amal.dzz').join(' '), 'email:TLD', 'extension inexistante');
eq(codesOf('élève@ecole.dz').join(' '), 'email:ACCENT', 'accent avant @');
for (const good of ['ali@email.com', 'ali@mail.com', 'contact@live.fr', 'a@gmx.fr', 'x@laposte.net', 'x@orange.fr', 'x@free.fr', 'nom.prenom@univ-alger.dz', 'contact@cevital.com', 'info@sonatrach.dz', 'x@me.com', 'a_b-c+d@sub.domaine.co.uk', 'contact@hotel-elaurassi.com', 'support@outlet.dz', 'z@yahoo.co.uk'])
  eq(codesOf(good).join(' '), 'email:OK', 'e-mail réel non signalé ' + good);
// --- Sites
eq(codesOf('www.sarlamal.dz').join(' '), 'url:OK', 'site juste');
eq(fixOf('http//www.site.dz'), 'http://www.site.dz', 'http//');
eq(fixOf('https:/site.dz'), 'https://site.dz', 'https:/');
eq(fixOf('htpp://site.dz'), 'http://site.dz', 'htpp');
eq(fixOf('wwww.site.com'), 'www.site.com', 'wwww');
eq(fixOf('ww.site.com'), 'www.site.com', 'ww.');
eq(fixOf('www,site.com'), 'www.site.com', 'www,');
eq(fixOf('www. site.com'), 'www.site.com', 'espace après www.');
eq(fixOf('www.site,com'), 'www.site.com', 'virgule');
eq(fixOf('www.site.con'), 'www.site.com', '.con');
eq(codesOf('www.site_amal.dz').join(' '), 'url:CHARS', 'underscore');
eq(codesOf('Fichier logo.png et rapport.pdf, version 2.0, prix 1.500').join(' '), '', 'fichiers et nombres ignorés');
eq(codesOf('wa.me/0550123456').join(' '), 'url:WAME', 'wa.me avec 0');
eq(codesOf('https://wa.me/213550123456').join(' '), 'url:OK', 'wa.me juste');
eq(codesOf('wa.me/21355012345').join(' '), 'url:WAME', 'wa.me numéro incomplet');
eq(codesOf('instagram.com/sarl-amal').join(' '), 'url:HANDLE', 'profil Instagram avec tiret');
eq(codesOf('facebook.com/sarlamal').join(' '), 'url:OK', 'profil Facebook juste');
// --- Comptes @
eq(codesOf('Instagram : @sarl.amal').join(' '), 'handle:OK', 'Instagram juste');
eq(codesOf('Instagram : @sarl.amal.').join(' '), 'handle:OK', 'point final = ponctuation');
eq(codesOf('TikTok @sarl-amal').join(' '), 'handle:HANDLE', 'TikTok tiret');
eq(codesOf('X : @sarl.amal').join(' '), 'handle:HANDLE', 'X point');
eq(codesOf('@sarlamél').join(' '), 'handle:HANDLE', 'accent');
eq(codesOf('Suivez-nous @sarl_amal').join(' '), 'handle:OK', 'sans plateforme');
// --- Téléphones / phones
eq(codesOf('Tél : 0550 12 34 56').join(' '), 'phone:OK', 'mobile DZ');
eq(codesOf('Tél : 021 23 45 67').join(' '), 'phone:OK', 'fixe Alger');
eq(codesOf('Mob : 0550 12 34 5').join(' '), 'phone:UNASSIGNED', 'mobile incomplet');
eq(codesOf('Mob : 0550 12 34 567').join(' '), 'phone:LEN', 'mobile trop long');
eq(codesOf('+213 0550 12 34 56').join(' '), 'phone:TRUNK0', '0 après +213');
eq(fixOf('+213 0550 12 34 56'), '+213 550 12 34 56', 'correction 0 après +213');
eq(fixOf('00213 0661 22 33 44'), '00213 661 22 33 44', 'correction 0 après 00213');
eq(fixOf('+33 (0)1 23 45 67 89'), '+33 1 23 45 67 89', '(0) retiré');
eq(codesOf('+39 06 1234 5678').join(' '), 'phone:OK', 'Italie : le 0 fait partie du numéro');
eq(codesOf('Fax : 0661 22 33 44').join(' '), 'phone:LBL_FAX', 'fax sur mobile');
eq(codesOf('Mobile : 021 23 45 67').join(' '), 'phone:LBL_MOB', 'mobile sur fixe');
eq(codesOf('Mob/WhatsApp : 0770 11 22 33').join(' '), 'phone:OK', 'mob + whatsapp');
eq(codesOf('جوال : ٠٥٥٠ ١٢ ٣٤ ٥٦').join(' '), 'phone:OK', 'arabe');
eq(codesOf('فاكس : ٠٥٥٠ ١٢ ٣٤ ٥٦').join(' '), 'phone:LBL_FAX', 'فاكس sur mobile');
eq(codesOf('Tél : 550 12 34 56').join(' '), 'phone:NONP', '0 oublié');
eq(codesOf('Tél : 021 23 45 67 / 0550 12 34 56 / 0661 22 33 44').join(' '), 'phone:OK phone:OK phone:OK', 'trois numéros');
eq(codesOf('Tél : 0550 12 34 56 0661 22 33 44').join(' '), 'phone:OK phone:OK', 'deux numéros collés (découpe)');
eq(codesOf('T : 0550123456 – F : 021234567').join(' '), 'phone:OK phone:OK', 'libellés T / F');
eq(codesOf('Tel: +1 202 555 0125').join(' '), 'phone:OK', 'États-Unis');
eq(codesOf('Tél. : +33 6 12 34 56 78').join(' '), 'phone:OK', 'France mobile');
eq(codesOf('Tél. : +33 6 12 34 56 7').join(' '), 'phone:LEN', 'France incomplet');
eq(codesOf('+212 6 61 23 45 67').join(' '), 'phone:OK', 'Maroc');
eq(codesOf('+216 71 234 567').join(' '), 'phone:OK', 'Tunisie');
eq(codesOf('+999 123 456 789').join(' '), 'phone:NOCC', 'indicatif inexistant');
eq(codesOf('Tél : 01 23 45 67 89', { region: 'FR' }).join(' '), 'phone:OK', 'pays par défaut France');
eq(codesOf('Tél : 01 23 45 67 89', { region: 'DZ' }).join(' '), 'phone:UNASSIGNED', 'le même numéro n’existe pas en Algérie');
// Faux positifs / false positives
for (const noise of ['Prix : 1 500 DA', 'le 12/10/2026', 'RC 16/00-1234567B12', 'NIF : 000216001234567', 'NIS 000116001234567', 'Ouvert de 08:00 - 17:00', 'Saison 2025-2026', 'BP 123 Alger 16000', 'Capital : 10 000 000 DA', 'Réf. 0012345678', 'Facture n° 0001234567', 'Code 0550123', 'Lot 0123456 B', 'Article 0012 3456 789', 'Poids 0,500 kg', '1.500.000 DA', 'Agrément 01234567', 'Version 0.1.23.4567', 'Matricule 00123 45678', 'السجل التجاري 16/00-1234567', 'رقم التعريف الجبائي 000216001234567'])
  eq(codesOf(noise).join(' '), '', 'pas de coordonnée dans « ' + noise + ' »');
// Libellés / labels
eq((C.labelOf('Tél : ') || {}).kind, 'tel', 'libellé Tél');
eq((C.labelOf('Mob. ') || {}).kind, 'mob', 'libellé Mob.');
eq((C.labelOf('Tél/Fax : ') || {}).kind, 'tel fax', 'libellé Tél/Fax');
eq((C.labelOf('NIF : ') || {}).excl, true, 'NIF exclu');
eq(C.labelOf('hôtel '), null, 'hôtel n’est pas un libellé');
// Format standard (option) / standard form
const F = { format: 'national' };
eq(fixOf('Tél : 0550123456', F), '0550 12 34 56', 'format national DZ');
eq(fixOf('Tél : ٠٥٥٠١٢٣٤٥٦', F), '٠٥٥٠ ١٢ ٣٤ ٥٦', 'format national en chiffres arabes');
eq(fixOf('Tél : 0550 12 34 56', { format: 'intl' }), '+213 550 12 34 56', 'format international');
eq(fixOf('Tél : 0550 12 34 56', { format: 'national', sep: '.' }), '0550.12.34.56', 'format avec points');
eq(C.analyzeText('+213 0550123456', Object.assign({}, O, { format: 'keep' }))[0].issues.filter(i => i.code === 'FORMAT')[0].fix.to, '+213 550 12 34 56', 'format qui inclut la correction du 0');
// Coupures de ligne / line splits
{
  const text = 'Contact : 0550 12 34 56 et contact@sarl.dz';
  const items = C.analyzeText(text, O);
  eq(C.lineSplits(text, ['Contact : 0550 12 ', '34 56 et contact@sarl.dz'], items), 1, 'numéro coupé détecté');
  ok(items[0].issues.some(i => i.code === 'SPLIT' && i.fix.nb), 'insécable proposé');
  const items2 = C.analyzeText(text, O);
  eq(C.lineSplits(text, ['Contact : ', '0550 12 34 56 et ', 'contact@sarl.dz'], items2), 0, 'pas de coupure');
  eq(C.lineSplits(text, ['autre texte'], items2), -1, 'lignes illisibles signalées');
}
// Contrôle croisé / cross check
{
  const a = C.analyzeText('contact@sarl-amal.dz', O), b = C.analyzeText('www.sarlamal.dz', O);
  const all = a.concat(b).map(x => ({ item: x }));
  eq(C.crossChecks(all), 1, 'domaine e-mail ≠ site');
  const c = C.analyzeText('contact@sarlamal.dz www.sarlamal.dz ali@gmail.com', O).map(x => ({ item: x }));
  eq(C.crossChecks(c), 0, 'domaines identiques / messagerie gratuite');
}
process.exitCode = summary('engine') ? 1 : 0;
