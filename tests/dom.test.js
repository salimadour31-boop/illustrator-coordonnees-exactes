// Tests du flux Illustrator sur un DOM simulé (PAS Illustrator) / flow tests on a simulated DOM (NOT Illustrator)
'use strict';
const M = require('./mockai.js');
global.app = { locale: 'fr_FR', documents: [] };
const C = require('../CoordonneesExactes.jsx');
const { ok, eq, summary } = require('./util');
C.setLang(true);
const opts = () => { const o = C.defaults(); o.lang = 'fr'; o.region = 'DZ'; return o; };
let seen = [];
const UI = (act, answers, hook) => { let n = 0; seen = []; return { settings: () => act, results: (res, data, header) => { seen.push({ res, header, lines: C.reportLines(res, data) }); if (hook && n === 0) hook(res, data); return answers[n++] || 'close'; }, alert: m => alerts.push(m), save: () => {} }; };
const BB = (t) => ({ l: 0, t, r: 300, b: t - 20 });

// 1. Aucun document / no document
C.main(); ok(alerts.length === 1 && /Aucun document ouvert/.test(alerts[0]), 'message sans document : ' + alerts[0]);

// 2. Rien de sélectionné / nothing selected
alerts.length = 0;
let doc = M.mkDoc([{ text: 'Tél : 021 23 45 67', bb: BB(100) }]);
let o = opts(); o.scope = 'selection';
C.run(doc, o, UI('analyze', [])); ok(alerts.length === 1 && /Rien n.est sélectionné/.test(alerts[0]), 'message sans sélection : ' + alerts[0]);

// 3. Aucun texte / no live text
alerts.length = 0; doc = M.mkDoc([]);
C.run(doc, opts(), UI('analyze', [])); ok(alerts.length === 1 && /Aucun texte vivant/.test(alerts[0]), 'message sans texte : ' + alerts[0]);

// 4. Analyse + corrections cochées par défaut ; mise en forme gardée lettre par lettre
//    Analysis + default-ticked fixes; formatting kept letter by letter
alerts.length = 0;
const card = 'SARL ATLAS\rMob : +213 0550 12 34 56\rE-mail : contact@gmial.com\rSite : wwww.atlas-print.dz';
doc = M.mkDoc([
  { text: card, bb: BB(100) },
  { text: 'Fax : +213 0550 12 34 56', bb: BB(60), locked: true },
  { text: 'E-mail : x@gmial.com', bb: BB(30), layer: 'hidden' },
  { text: 'CCP : 1234567 clé 00', bb: BB(0) },
]);
const st0 = doc.frames[0].story, before = st0.chars.map(x => x.a);
let res = C.run(doc, opts(), UI('analyze', ['fix', 'close']));
const first = seen[0].res;
ok(first.rows.some(r => r.issue.code === 'TRUNK0'), '0 gardé après +213 signalé');
ok(first.rows.some(r => r.issue.code === 'PROVIDER'), 'gmial signalé');
ok(first.rows.some(r => r.item.kind === 'url' && r.issue.sev !== 'info'), 'wwww signalé');
ok(first.rows.some(r => r.item.kind === 'code' && r.issue.sev === 'err'), 'clé CCP fausse signalée');
ok(!first.rows.some(r => /x@gmial/.test(r.item.raw)), 'calque masqué ignoré');
ok(first.rows.filter(r => r.checked).every(r => first.rows.indexOf(r) >= 0 && r.issue.fix), 'seules des lignes avec correction sont cochées');
const txt = st0.textRange.contents;
eq(txt, 'SARL ATLAS\rMob : +213 550 12 34 56\rE-mail : contact@gmail.com\rSite : www.atlas-print.dz', 'texte corrigé');
// Chaque lettre gardée garde son objet d'attributs / each kept letter keeps its attribute object
const ops = C.editOps(card, txt); let kept = true, a = 0, b = 0;
{ // vérifie l'ordre des attributs : les attributs restants sont une sous-suite de l'original
  let j = 0; for (const x of st0.chars) { while (j < before.length && before[j] !== x.a) j++; if (j >= before.length) { kept = false; break; } }
}
ok(kept && ops.length > 0, 'mise en forme d’origine gardée (aucun attribut nouveau, ordre conservé)');
ok(st0.chars[0].a === before[0] && st0.chars[st0.chars.length - 1].a === before[before.length - 1], 'début et fin intacts');
eq(doc.frames[1].story.textRange.contents, 'Fax : +213 0550 12 34 56', 'texte verrouillé non modifié');
eq(doc.frames[3].story.textRange.contents, 'CCP : 1234567 clé 00', 'clé CCP fausse : pas de correction automatique (on ne devine pas le bon compte)');
ok(res && res.applied && res.applied.done === 3, 'corrections faites : ' + JSON.stringify(res && res.applied));
ok(/Corrections appliquées : 3/.test(seen[1].header), 'message après correction : ' + seen[1].header);
ok(!seen[1].res.rows.some(r => r.story === 0 && (r.issue.sev === 'err' || r.issue.sev === 'warn')), 'nouvelle vérification : plus d’erreur dans le texte corrigé');
let L = doc.layers.find(x => x.name === C.MARK_LAYER);
ok(L && L.printable === false && L.locked === true, 'calque de repères non imprimable et verrouillé');
ok(L && L.pageItems.some(x => x.kind === 'rect'), 'repères sur les erreurs restantes (verrouillé, CCP)');
ok(doc.selection.length > 0 && doc.selection.every(f => !f.locked), 'sélection des textes à revoir sans texte verrouillé');

// 5. Idempotence : relancer ne change plus rien / re-running changes nothing more
const after1 = st0.textRange.contents, edits1 = st0.edits;
res = C.run(doc, opts(), UI('analyze', ['fix', 'close']));
ok(st0.textRange.contents === after1 && st0.edits === edits1, 'deuxième passage sans effet sur le texte déjà corrigé');

// 6. Plus d'erreur → calque de repères retiré / no more errors → marker layer removed
doc = M.mkDoc([{ text: 'Mob : +213 0550 12 34 56', bb: BB(100) }]);
C.run(doc, opts(), UI('analyze', ['fix', 'close']));
ok(!doc.layers.find(x => x.name === C.MARK_LAYER), 'plus d’erreur → calque de repères supprimé');

// 7. Coupure en fin de ligne → insécable / line split → no-break
doc = M.mkDoc([{ text: 'Contact : 0550 12 34 56', bb: BB(100), width: 18 }]);
const sp = doc.frames[0].story;
ok(sp.lines.length === 2, 'composition simulée : numéro coupé sur 2 lignes');
res = C.run(doc, opts(), UI('analyze', ['fix', 'close']));
ok(seen[0].res.rows.some(r => r.issue.code === 'SPLIT' && r.checked), 'coupure signalée et cochée');
const ph = sp.textRange.contents.indexOf('0550');
ok(sp.chars.slice(ph, ph + 13).every(c => c.a.noBreak === true), 'numéro rendu insécable');
ok(sp.chars[0].a.noBreak !== true, 'le reste du texte n’est pas insécable');
eq(sp.textRange.contents, 'Contact : 0550 12 34 56', 'texte inchangé par l’insécable');
ok(!seen[1].res.rows.some(r => r.issue.code === 'SPLIT'), 'après correction : plus de coupure');

// 8. Texte modifié entre l'analyse et l'application → correction ignorée
//    Text changed between analysis and apply → fix skipped
doc = M.mkDoc([{ text: 'Mob : +213 0550 12 34 56', bb: BB(100) }]);
res = C.run(doc, opts(), UI('analyze', ['fix', 'close'], (r, data) => { doc.frames[0].story.chars.push({ c: '!', a: {} }); }));
ok(res.applied.done === 0 && res.applied.skipped >= 1, 'texte changé → ignoré : ' + JSON.stringify(res.applied));
eq(doc.frames[0].story.textRange.contents, 'Mob : +213 0550 12 34 56!', 'texte laissé tel quel');

// 9. Texte chaîné : une seule histoire / threaded text: one story
const shared = new M.Story('Tél : 021 23 45 67\rMob : 0661 23 45 6\rcontact@atlas.dz');
doc = M.mkDoc([{ story: shared, bb: BB(100) }, { story: shared, bb: { l: 400, t: 100, r: 600, b: 80 } }]);
let data = C.collect(doc, 'document');
ok(data.stories.length === 1 && data.stories[0].frames.length === 2, 'histoire chaînée lue une fois');
res = C.run(doc, opts(), UI('analyze', ['close']));
ok(seen[0].res.rows.some(r => /0661 23 45 6/.test(r.item.raw) && r.issue.sev === 'err'), 'chiffre manquant trouvé dans l’histoire chaînée');
L = doc.layers.find(x => x.name === C.MARK_LAYER);
ok(L && L.pageItems.filter(x => x.kind === 'rect').length === 2, 'un repère par bloc chaîné');

// 10. Portée sélection (groupe et TextRange) / selection scope (group and TextRange)
doc = M.mkDoc([{ text: 'Tél : 021 23 45 6', bb: BB(100) }, { text: 'Mob : 0550 12 34 5', bb: BB(60) }]);
doc.selection = [{ typename: 'GroupItem', pageItems: [doc.frames[1]] }];
o = opts(); o.scope = 'selection';
C.run(doc, o, UI('analyze', ['close']));
ok(seen[0].res.rows.length >= 1 && seen[0].res.rows.every(r => /0550/.test(r.item.raw)), 'seul le texte du groupe sélectionné est lu');
doc.selection = { typename: 'TextRange', story: doc.frames[0].story };
C.run(doc, o, UI('analyze', ['close']));
ok(seen[0].res.rows.length >= 1 && seen[0].res.rows.every(r => /021/.test(r.item.raw)), 'curseur dans un texte (TextRange) : ce texte seul');

// 11. Plan de travail actif / active artboard
doc = M.mkDoc([{ text: 'Tél : 021 23 45 6', bb: BB(100) }, { text: 'Mob : 0550 12 34 5', bb: { l: 1100, t: 100, r: 1300, b: 80 } }],
  [{ rect: [-50, 200, 1000, -200], name: 'Recto' }, { rect: [1000, 200, 2000, -200], name: 'Verso' }]);
doc.activeAb = 1; o = opts(); o.scope = 'artboard';
C.run(doc, o, UI('analyze', ['close']));
ok(seen[0].res.rows.length >= 1 && seen[0].res.rows.every(r => /0550/.test(r.item.raw)), 'seul le plan de travail actif est lu');
ok(seen[0].lines.some(l => /Plan 2 « Verso »/.test(l)), 'rapport : nom du plan de travail');

// 12. Rien de reconnu / nothing recognised
alerts.length = 0; doc = M.mkDoc([{ text: 'Prix : 2 500 DA — le 17/10/2026', bb: BB(100) }]);
C.run(doc, opts(), UI('analyze', ['close']));
ok(alerts.length === 1 && /Aucune coordonnée/.test(alerts[0]), 'message rien de reconnu : ' + alerts[0]);

// 13. Dialogue de réglages simulé / simulated settings dialog
global.uiScenario = (w, log) => { M.find(log, /^Maroc|^Morocco/); const dd = log.find(c => c.type === 'dropdownlist' && c.list && c.list.some(x => /Maroc/.test(x))); dd.selection = 1; M.find(log, /^Analyser$/, 'button').onClick(); };
o = opts(); const r13 = C.settingsDialog(o, false);
ok(r13 === 'analyze' && o.region === 'MA' && o.scope === 'document', 'réglages : pays et portée lus : ' + o.region + ' ' + o.scope);
global.uiScenario = (w, log) => { M.find(log, /^Annuler$/, 'button').onClick(); };
ok(C.settingsDialog(opts(), true) === null, 'réglages : Annuler');
// Dialogue de résultats : double-clic, tout décocher, appliquer
doc = M.mkDoc([{ text: 'Mob : +213 0550 12 34 56\rcontact@gmial.com', bb: BB(100) }]);
data = C.collect(doc, 'document'); res = C.analyzeStories(data.stories, opts());
global.uiScenario = (w, log) => { const lb = log.find(c => c.type === 'listbox'); ok(lb.items.length === res.rows.length, 'liste : une ligne par remarque'); M.find(log, /^Tout décocher$/, 'button').onClick(); lb.selection = { index: 0 }; lb.onDoubleClick(); const bf = M.find(log, /^Appliquer/, 'button'); ok(/\(1\)/.test(bf.text), 'bouton Appliquer compte 1 : ' + bf.text); bf.onClick(); };
ok(C.resultsDialog(res, data, '') === 'fix' && res.rows.filter(r => r.checked).length === 1, 'résultats : une seule correction cochée');
// Rapport enregistré en UTF-8 avec BOM / report saved in UTF-8 with BOM
global.saveTarget = '/tmp/rapport.txt';
global.uiScenario = (w, log) => { M.find(log, /^Enregistrer le rapport/, 'button').onClick(); M.find(log, /^Fermer$/, 'button').onClick(); };
C.resultsDialog(res, data, '');
ok(global.files['/tmp/rapport.txt'] && global.files['/tmp/rapport.txt'].charAt(0) === '\uFEFF' && /gmial/.test(global.files['/tmp/rapport.txt']), 'rapport .txt écrit');

// 14. Réglages enregistrés / saved settings
o = opts(); o.region = 'FR'; o.format = 'intl'; o.sep = '.'; o.markers = false;
const back = C.deserialize(C.serialize(o), opts());
ok(back.region === 'FR' && back.format === 'intl' && back.sep === '.' && back.markers === false, 'réglages relus');
const bad = C.deserialize('region=XX\nformat=rm -rf\nsep=;;\nscope=all\nfoo=bar', opts());
ok(bad.region === 'DZ' && bad.format === 'none' && bad.sep === ' ' && bad.scope === 'document' && !('foo' in bad), 'valeurs invalides refusées');


// 15. Garde-fou : même cochée de force, une correction dans un texte verrouillé n'est pas appliquée
//     Safety net: even force-ticked, a fix in a locked text is not applied
doc = M.mkDoc([{ text: 'Mob : +213 0550 12 34 56', bb: BB(100), locked: true }]);
data = C.collect(doc, 'document'); res = C.analyzeStories(data.stories, opts());
res.rows.forEach(r => { if (r.issue.fix) r.checked = true; });
const apL = C.applyFixes(data, res);
ok(apL.done === 0 && apL.locked >= 1 && doc.frames[0].story.textRange.contents === 'Mob : +213 0550 12 34 56', 'texte verrouillé jamais modifié : ' + JSON.stringify(apL));

process.exitCode = summary('dom') ? 1 : 0;
