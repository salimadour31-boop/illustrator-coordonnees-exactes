    /* ================================================================== */
    /* RÉGLAGES / SETTINGS                                                */
    /* ================================================================== */
    function defaults() {
        var e = engineDefaults();
        e.scope = 'document'; e.markers = true; e.select = true; e.lang = FR ? 'fr' : 'en';
        return e;
    }
    var CFG_KEYS = ['scope', 'region', 'phones', 'emails', 'urls', 'handles', 'codes', 'unlabeled', 'format', 'sep', 'lineSplits', 'showOk', 'markers', 'select', 'lang'];
    function serialize(o) {
        var s = [], i, k;
        for (i = 0; i < CFG_KEYS.length; i++) { k = CFG_KEYS[i]; s.push(k + '=' + String(o[k])); }
        return s.join('\n');
    }
    function deserialize(txt, base) {
        var o = base || defaults(), lines = String(txt).split(/\r?\n/), i, p, k, v;
        for (i = 0; i < lines.length; i++) {
            p = lines[i].indexOf('='); if (p < 1) { continue; }
            k = lines[i].substr(0, p); v = lines[i].substr(p + 1);
            if (indexOf(CFG_KEYS, k) < 0) { continue; }
            if (typeof o[k] === 'boolean') { o[k] = v === 'true'; }
            else if (k === 'scope') { if (v === 'selection' || v === 'artboard' || v === 'document') { o[k] = v; } }
            else if (k === 'region') { if (has(PHONE_REGIONS, v)) { o[k] = v; } }
            else if (k === 'format') { if (v === 'none' || v === 'national' || v === 'intl' || v === 'keep') { o[k] = v; } }
            else if (k === 'sep') { if (v === ' ' || v === '.' || v === '-') { o[k] = v; } }
            else if (k === 'lang') { if (v === 'fr' || v === 'en') { o[k] = v; } }
        }
        return o;
    }
    function cfgFile() { return new File(Folder.userData + '/' + CFG_NAME); }
    function loadCfg() {
        var o = defaults(), f;
        try { f = cfgFile(); if (f.exists && f.open('r')) { o = deserialize(f.read(), o); f.close(); } } catch (e) { }
        setLang(o.lang === 'fr');
        return o;
    }
    function saveCfg(o) { var f; try { f = cfgFile(); if (f.open('w')) { f.write(serialize(o)); f.close(); } } catch (e) { } }

    /* ================================================================== */
    /* DIALOGUES / DIALOGS                                                */
    /* ================================================================== */
    function settingsDialog(o, hasSel) {
        var w = new Window('dialog', 'CoordonneesExactes ' + VERSION), p, g, rSel, rAb, rDoc, dReg, eReg, cP, cE, cU, cH, cC, cUn, cSp, dFmt, dSep, cM, cS, cOk, dLang, bA, bC, res = null, i, names = [], idx = 0;
        w.orientation = 'column'; w.alignChildren = 'fill';
        w.add('statictext', undefined, T('Vérifie téléphones, e-mails, sites, comptes @ et codes à clé de tous les textes vivants. Conseil : travaillez sur une copie.', 'Checks phones, e-mails, websites, @handles and check-digit codes in every live text. Tip: work on a copy.'), { multiline: true });
        p = w.add('panel', undefined, T('Portée', 'Scope')); p.orientation = 'row';
        rSel = p.add('radiobutton', undefined, T('Sélection', 'Selection')); rAb = p.add('radiobutton', undefined, T('Plan de travail actif', 'Active artboard')); rDoc = p.add('radiobutton', undefined, T('Document', 'Document'));
        rSel.value = o.scope === 'selection' && hasSel; rAb.value = o.scope === 'artboard'; rDoc.value = !rSel.value && !rAb.value;
        if (!hasSel) { rSel.enabled = false; }
        p = w.add('panel', undefined, T('Numéros sans indicatif', 'Numbers without country code')); p.orientation = 'row';
        for (i = 0; i < REGION_MENU.length; i++) { names.push(T(REGION_MENU[i][1], REGION_MENU[i][2]) + ' (' + REGION_MENU[i][0] + ')'); if (REGION_MENU[i][0] === o.region) { idx = i; } }
        names.push(T('Autre code pays ISO…', 'Other ISO country code…'));
        dReg = p.add('dropdownlist', undefined, names);
        eReg = p.add('edittext', undefined, ''); eReg.characters = 3;
        dReg.selection = idx;
        if (indexOf(['DZ'], o.region) < 0) {
            var found = false; for (i = 0; i < REGION_MENU.length; i++) { if (REGION_MENU[i][0] === o.region) { found = true; } }
            if (!found) { dReg.selection = REGION_MENU.length; eReg.text = o.region; }
        }
        p = w.add('panel', undefined, T('Contrôles', 'Checks')); p.orientation = 'column'; p.alignChildren = 'left';
        cP = p.add('checkbox', undefined, T('Téléphones (longueur, préfixes attribués, fixe / mobile, 0 après l’indicatif, libellés)', 'Phones (length, assigned prefixes, landline / mobile, 0 after country code, labels)')); cP.value = o.phones;
        cUn = p.add('checkbox', undefined, T('   Lire aussi les numéros sans libellé qui commencent par 0', '   Also read unlabelled numbers starting with 0')); cUn.value = o.unlabeled;
        cE = p.add('checkbox', undefined, T('E-mails (syntaxe, gmial.com / gmail.fr, extension)', 'E-mails (syntax, gmial.com / gmail.fr, extension)')); cE.value = o.emails;
        cU = p.add('checkbox', undefined, T('Sites et liens (http//, wwww., extension, wa.me, profils)', 'Websites and links (http//, wwww., extension, wa.me, profiles)')); cU.value = o.urls;
        cH = p.add('checkbox', undefined, T('Comptes @ (règles Instagram, TikTok, X, Facebook…)', '@handles (Instagram, TikTok, X, Facebook… rules)')); cH.value = o.handles;
        cC = p.add('checkbox', undefined, T('Codes à clé : IBAN, RIB / RIP, CCP + clé, ISBN, ISSN, EAN, SIREN / SIRET, TVA FR', 'Check-digit codes: IBAN, RIB / RIP, CCP + key, ISBN, ISSN, EAN, SIREN / SIRET, FR VAT')); cC.value = o.codes;
        cSp = p.add('checkbox', undefined, T('Coordonnées coupées en fin de ligne (proposer « insécable »)', 'Contact details split at a line end (offer "no break")')); cSp.value = o.lineSplits;
        g = p.add('group'); g.add('statictext', undefined, T('Écriture standard des numéros :', 'Standard number form:'));
        dFmt = g.add('dropdownlist', undefined, [T('ne pas proposer', 'do not suggest'), T('nationale (0550 12 34 56)', 'national (0550 12 34 56)'), T('internationale (+213 550 12 34 56)', 'international (+213 550 12 34 56)'), T('garder nationale ou internationale', 'keep national or international')]);
        dFmt.selection = indexOf(['none', 'national', 'intl', 'keep'], o.format) < 0 ? 0 : indexOf(['none', 'national', 'intl', 'keep'], o.format);
        dSep = g.add('dropdownlist', undefined, [T('espaces', 'spaces'), T('points', 'dots'), T('tirets', 'hyphens')]);
        dSep.selection = indexOf([' ', '.', '-'], o.sep) < 0 ? 0 : indexOf([' ', '.', '-'], o.sep);
        p = w.add('panel', undefined, T('Résultat', 'Result')); p.orientation = 'column'; p.alignChildren = 'left';
        cM = p.add('checkbox', undefined, T('Repères sur le calque non imprimable « Contrôle coordonnées »', 'Markers on the non-printing layer "Contrôle coordonnées"')); cM.value = o.markers;
        cS = p.add('checkbox', undefined, T('Sélectionner les textes à revoir', 'Select the texts to review')); cS.value = o.select;
        cOk = p.add('checkbox', undefined, T('Lister aussi les coordonnées sans remarque', 'Also list items without remark')); cOk.value = o.showOk;
        g = w.add('group'); g.add('statictext', undefined, T('Langue :', 'Language:'));
        dLang = g.add('dropdownlist', undefined, ['Français', 'English']); dLang.selection = o.lang === 'en' ? 1 : 0;
        g = w.add('group'); g.alignment = 'right';
        bA = g.add('button', undefined, T('Analyser', 'Analyse'), { name: 'ok' });
        bC = g.add('button', undefined, T('Annuler', 'Cancel'), { name: 'cancel' });
        function read() {
            var k, code;
            o.scope = rSel.value ? 'selection' : (rAb.value ? 'artboard' : 'document');
            k = dReg.selection ? dReg.selection.index : 0;
            if (k < REGION_MENU.length) { o.region = REGION_MENU[k][0]; }
            else { code = trim(eReg.text).toUpperCase(); if (has(PHONE_REGIONS, code)) { o.region = code; } }
            o.phones = cP.value; o.unlabeled = cUn.value; o.emails = cE.value; o.urls = cU.value; o.handles = cH.value; o.codes = cC.value; o.lineSplits = cSp.value;
            o.format = ['none', 'national', 'intl', 'keep'][dFmt.selection ? dFmt.selection.index : 0];
            o.sep = [' ', '.', '-'][dSep.selection ? dSep.selection.index : 0];
            o.markers = cM.value; o.select = cS.value; o.showOk = cOk.value;
            o.lang = dLang.selection && dLang.selection.index === 1 ? 'en' : 'fr'; setLang(o.lang === 'fr');
        }
        bA.onClick = function () { read(); res = 'analyze'; w.close(1); };
        bC.onClick = function () { res = null; w.close(0); };
        w.show();
        return res;
    }
    function rowText(r) { return [r.issue.fix && r.issue.fix.on !== undefined ? (r.checked ? '\u2714' : '\u2013') : ' ', sevTag(r.issue.sev), kindName(r.item), shorten(r.item.raw, 34), shorten(r.issue.msg, 90), fixText(r.issue)]; }
    function resultsDialog(res, data, header) {
        var w = new Window('dialog', T('CoordonneesExactes — résultats', 'CoordonneesExactes — results')), lb, g, i, it, cells, bAll, bNone, bFix, bSave, bSel, bOk, out = 'close', lines = reportLines(res, data), nFix;
        w.orientation = 'column'; w.alignChildren = 'fill';
        if (header) { w.add('statictext', undefined, header, { multiline: true }); }
        w.add('statictext', undefined, lines[0]);
        w.add('statictext', undefined, T('Double-clic sur une ligne avec correction pour la cocher / décocher. Les textes verrouillés ne sont jamais modifiés.', 'Double-click a row with a fix to tick / untick it. Locked texts are never modified.'));
        lb = w.add('listbox', [0, 0, 1060, 380], [], { numberOfColumns: 6, showHeaders: true, columnTitles: ['\u2714', T('Gravité', 'Severity'), T('Type', 'Type'), T('Texte', 'Text'), T('Problème', 'Problem'), T('Correction', 'Fix')], columnWidths: [26, 82, 74, 200, 430, 240] });
        function fill() {
            var sel = lb.selection ? lb.selection.index : -1;
            lb.removeAll();
            for (i = 0; i < res.rows.length; i++) {
                cells = rowText(res.rows[i]);
                it = lb.add('item', cells[0]);
                for (var c = 1; c < cells.length; c++) { it.subItems[c - 1].text = cells[c]; }
            }
            if (sel >= 0 && sel < res.rows.length) { lb.selection = sel; }
            nFix = 0; for (i = 0; i < res.rows.length; i++) { if (res.rows[i].checked) { nFix++; } }
            if (bFix) { bFix.text = T('Appliquer les corrections cochées (', 'Apply ticked fixes (') + nFix + ')'; bFix.enabled = nFix > 0; }
        }
        lb.onDoubleClick = function () {
            var r = lb.selection ? res.rows[lb.selection.index] : null;
            if (!r || !r.issue.fix) { return; }
            if (!data.stories[r.story].editable) { alert(T('Ce texte est verrouillé ou masqué : il ne sera pas modifié.', 'This text is locked or hidden: it will not be modified.')); return; }
            r.checked = !r.checked; fill();
        };
        g = w.add('group'); g.alignment = 'fill';
        bAll = g.add('button', undefined, T('Tout cocher', 'Tick all'));
        bNone = g.add('button', undefined, T('Tout décocher', 'Untick all'));
        bSel = g.add('button', undefined, T('Sélectionner ce texte', 'Select this text'));
        bSave = g.add('button', undefined, T('Enregistrer le rapport…', 'Save report…'));
        bFix = g.add('button', undefined, '');
        bOk = g.add('button', undefined, T('Fermer', 'Close'), { name: 'cancel' });
        bAll.onClick = function () { for (i = 0; i < res.rows.length; i++) { if (res.rows[i].issue.fix && data.stories[res.rows[i].story].editable) { res.rows[i].checked = true; } } fill(); };
        bNone.onClick = function () { for (i = 0; i < res.rows.length; i++) { res.rows[i].checked = false; } fill(); };
        bSel.onClick = function () {
            var r = lb.selection ? res.rows[lb.selection.index] : null, st, k, sel = [];
            if (!r) { return; }
            st = data.stories[r.story];
            for (k = 0; k < st.frames.length; k++) { if (!data.frames[st.frames[k]].locked) { sel.push(data.frames[st.frames[k]].tf); } }
            try { app.activeDocument.selection = null; app.activeDocument.selection = sel; app.redraw(); } catch (e) { }
        };
        bSave.onClick = function () { saveReport(reportLines(res, data)); };
        bFix.onClick = function () { out = 'fix'; w.close(1); };
        bOk.onClick = function () { out = 'close'; w.close(0); };
        fill();
        w.show();
        return out;
    }
    function saveReport(lines) {
        var f;
        try {
            f = File.saveDialog(T('Enregistrer le rapport', 'Save the report'), '*.txt');
            if (!f) { return false; }
            f.encoding = 'UTF-8';
            if (f.open('w')) { f.write('\uFEFF' + lines.join('\r\n')); f.close(); return true; }
        } catch (e) { }
        return false;
    }

    /* ================================================================== */
    /* DÉROULEMENT / FLOW                                                 */
    /* ================================================================== */
    function run(doc, o, ui) {
        var hasSel = false, act, data, res, ap, res2, msg;
        try { hasSel = doc.selection && (doc.selection.length > 0 || doc.selection.typename === 'TextRange'); } catch (e0) { hasSel = false; }
        act = ui.settings(o, hasSel);
        if (!act) { return null; }
        ui.save(o);
        if (o.scope === 'selection' && !hasSel) { ui.alert(T('Rien n’est sélectionné. Sélectionnez des textes (ou des groupes) ou choisissez « Plan de travail actif » ou « Document ».', 'Nothing is selected. Select texts (or groups) or choose "Active artboard" or "Document".')); return null; }
        if (!o.phones && !o.emails && !o.urls && !o.handles && !o.codes) { ui.alert(T('Aucun contrôle coché.', 'No check ticked.')); return null; }
        data = collect(doc, o.scope);
        if (!data.stories.length) { ui.alert(T('Aucun texte vivant visible dans la portée choisie (les textes vectorisés ne sont pas lus).', 'No visible live text in the chosen scope (outlined text cannot be read).')); return null; }
        res = analyzeStories(data.stories, o);
        if (o.markers) { drawMarkers(doc, data, res); } else { getMarkLayer(doc, false); }
        if (o.select) { selectIssues(doc, data, res); }
        if (!res.items.length) { ui.alert(T('Aucune coordonnée (téléphone, e-mail, site, compte @, code) reconnue dans la portée choisie.', 'No contact details (phone, e-mail, website, @handle, code) recognised in the chosen scope.')); return res; }
        if (ui.results(res, data, '') !== 'fix') { return res; }
        ap = applyFixes(data, res);
        data = collect(doc, o.scope);
        res2 = analyzeStories(data.stories, o);
        if (o.markers) { drawMarkers(doc, data, res2); } else { getMarkLayer(doc, false); }
        if (o.select) { selectIssues(doc, data, res2); }
        msg = T('Corrections appliquées : ', 'Fixes applied: ') + ap.done + (ap.nobreak ? T(' (dont ' + ap.nobreak + ' insécable(s))', ' (' + ap.nobreak + ' no-break)') : '') +
            (ap.locked ? T(', ' + ap.locked + ' dans des textes verrouillés', ', ' + ap.locked + ' in locked texts') : '') +
            (ap.skipped ? T(', ' + ap.skipped + ' ignorée(s) (texte modifié entre-temps ou chevauchement)', ', ' + ap.skipped + ' skipped (text changed meanwhile or overlap)') : '') + '. ' + T('Nouvelle vérification ci-dessous. Édition > Annuler pour revenir en arrière.', 'New check below. Edit > Undo to revert.');
        ui.results(res2, data, msg);
        res2.applied = ap;
        return res2;
    }
    function main() {
        var doc, o;
        if (!app.documents.length) { alert(T('Aucun document ouvert. Ouvrez un fichier Illustrator puis relancez le script.', 'No document open. Open an Illustrator file and run the script again.')); return; }
        doc = app.activeDocument;
        o = loadCfg();
        run(doc, o, { settings: settingsDialog, results: resultsDialog, alert: function (m) { alert(m); }, save: saveCfg });
    }

