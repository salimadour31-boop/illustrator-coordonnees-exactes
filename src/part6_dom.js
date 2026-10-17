    /* ================================================================== */
    /* ANALYSE DU DOCUMENT ET RAPPORT / DOCUMENT ANALYSIS AND REPORT      */
    /* ================================================================== */
    var REGION_MENU = [['DZ', 'Alg\u00E9rie', 'Algeria'], ['MA', 'Maroc', 'Morocco'], ['TN', 'Tunisie', 'Tunisia'], ['LY', 'Libye', 'Libya'], ['EG', '\u00C9gypte', 'Egypt'],
        ['MR', 'Mauritanie', 'Mauritania'], ['ML', 'Mali', 'Mali'], ['NE', 'Niger', 'Niger'], ['SN', 'S\u00E9n\u00E9gal', 'Senegal'], ['CI', 'C\u00F4te d\u2019Ivoire', 'Ivory Coast'],
        ['FR', 'France', 'France'], ['BE', 'Belgique', 'Belgium'], ['CH', 'Suisse', 'Switzerland'], ['LU', 'Luxembourg', 'Luxembourg'], ['CA', 'Canada', 'Canada'], ['US', '\u00C9tats-Unis', 'United States'],
        ['GB', 'Royaume-Uni', 'United Kingdom'], ['DE', 'Allemagne', 'Germany'], ['ES', 'Espagne', 'Spain'], ['IT', 'Italie', 'Italy'], ['PT', 'Portugal', 'Portugal'], ['NL', 'Pays-Bas', 'Netherlands'],
        ['TR', 'Turquie', 'Turkey'], ['SA', 'Arabie saoudite', 'Saudi Arabia'], ['AE', '\u00C9mirats arabes unis', 'United Arab Emirates'], ['QA', 'Qatar', 'Qatar'], ['KW', 'Kowe\u00EFt', 'Kuwait'],
        ['JO', 'Jordanie', 'Jordan'], ['LB', 'Liban', 'Lebanon']];
    function kindName(it) {
        if (it.kind === 'phone') { return T('téléphone', 'phone'); }
        if (it.kind === 'email') { return 'e-mail'; }
        if (it.kind === 'url') { return T('site', 'website'); }
        if (it.kind === 'handle') { return T('compte @', '@handle'); }
        if (it.kind === 'code') { return it.sub === 'rib' ? 'RIB / RIP' : String(it.sub).toUpperCase(); }
        return it.kind;
    }
    function okMessage(it) {
        if (it.kind === 'phone') { return fmt(T('{0} valide ({1})', 'valid {0} ({1})'), [typeName(it.type), it.region + ' +' + it.cc]); }
        if (it.kind === 'code') { return T('clé de contrôle juste', 'check digits correct'); }
        if (it.kind === 'email' || it.kind === 'url') { return T('bien écrit (l’existence n’est pas vérifiable hors ligne)', 'well formed (existence cannot be checked offline)'); }
        return T('conforme', 'valid');
    }
    function analyzeStories(stories, o) {
        var rows = [], all = [], stats = { items: 0, err: 0, warn: 0, info: 0, ok: 0, splitsUnread: 0 }, i, k, st, items, it, is, ln;
        for (i = 0; i < stories.length; i++) {
            st = stories[i];
            items = analyzeText(st.text, o);
            if (o.lineSplits && st.lines && st.lines.length > 1) {
                ln = lineSplits(st.text, st.lines, items);
                if (ln < 0) { stats.splitsUnread++; }
            }
            for (k = 0; k < items.length; k++) { all.push({ story: i, item: items[k] }); }
        }
        crossChecks(all);
        for (i = 0; i < all.length; i++) {
            it = all[i].item; stats.items++;
            if (!it.issues.length || (it.issues.length === 1 && it.issues[0].sev === 'info' && it.issues[0].code === 'FORMAT' && !o.showFormat)) { stats.ok++; }
            if (!it.issues.length) {
                if (o.showOk) { rows.push({ story: all[i].story, item: it, issue: { code: 'OK', sev: 'ok', msg: okMessage(it) } }); }
                continue;
            }
            for (k = 0; k < it.issues.length; k++) {
                is = it.issues[k];
                stats[is.sev] = (stats[is.sev] || 0) + 1;
                rows.push({ story: all[i].story, item: it, issue: is, checked: !!(is.fix && is.fix.on && stories[all[i].story].editable) });
            }
        }
        rows.sort(function (a, b) { var r = sevRank(a.issue.sev) - sevRank(b.issue.sev); return r !== 0 ? r : (a.story !== b.story ? a.story - b.story : a.item.s - b.item.s); });
        return { rows: rows, stats: stats, items: all };
    }
    function sevRank(s) { return s === 'err' ? 0 : (s === 'warn' ? 1 : (s === 'info' ? 2 : 3)); }
    function sevTag(s) {
        if (s === 'err') { return T('ERREUR', 'ERROR'); }
        if (s === 'warn') { return T('À VÉRIFIER', 'CHECK'); }
        if (s === 'info') { return 'INFO'; }
        return 'OK';
    }
    function fixText(is) {
        if (!is.fix) { return ''; }
        if (is.fix.nb) { return T('rendre insécable', 'make non-breaking'); }
        return shorten(is.fix.from, 40) + ' \u2192 ' + shorten(is.fix.to, 40);
    }
    function reportLines(res, data) {
        var lines = [], st = res.stats, i, r, s;
        lines.push('CoordonneesExactes ' + VERSION + ' \u2014 ' + st.items + T(' coordonnée(s) lue(s) : ', ' contact item(s) read: ') + (st.err || 0) + T(' erreur(s), ', ' error(s), ') + (st.warn || 0) + T(' à vérifier, ', ' to check, ') + (st.info || 0) + ' info, ' + st.ok + T(' sans remarque.', ' without remark.'));
        if (st.splitsUnread) { lines.push(st.splitsUnread + T(' texte(s) dont les lignes n’ont pas pu être lues (coupures non vérifiées).', ' text(s) whose lines could not be read (splits not checked).')); }
        lines.push(T('Rappel : un numéro ou un e-mail bien formé peut quand même être faux ; seul le client peut le confirmer.', 'Reminder: a well-formed number or e-mail can still be wrong; only the client can confirm it.'));
        lines.push('');
        for (i = 0; i < res.rows.length; i++) {
            r = res.rows[i]; s = data.stories[r.story];
            lines.push('[' + sevTag(r.issue.sev) + '] ' + (s && s.abName ? s.abName + ' \u2014 ' : '') + kindName(r.item) + T(' « ', ' "') + shorten(r.item.raw, 60) + T(' » : ', '": ') + r.issue.msg + (r.issue.fix ? T(' — correction : ', ' — fix: ') + fixText(r.issue) : ''));
        }
        if (!res.items.length) { lines.push(T('Aucune coordonnée reconnue dans la portée choisie.', 'No contact details recognised in the chosen scope.')); }
        return lines;
    }

    /* ================================================================== */
    /* ILLUSTRATOR : LECTURE / READING                                    */
    /* ================================================================== */
    function isHiddenItem(it) {
        var p = it;
        try { while (p && p.typename !== 'Document') { if (p.hidden === true) { return true; } if (p.typename === 'Layer' && p.visible === false) { return true; } p = p.parent; } } catch (e) { }
        return false;
    }
    function isLockedItem(it) {
        var p = it;
        try { while (p && p.typename !== 'Document') { if (p.locked === true) { return true; } p = p.parent; } } catch (e) { }
        return false;
    }
    function layerName(it) { try { return it.layer.name; } catch (e) { return ''; } }
    function gatherSel(items, out) {
        var i, it, k;
        for (i = 0; i < items.length; i++) {
            it = items[i];
            if (!it) { continue; }
            if (it.typename === 'TextFrame') { out.push(it); }
            else if (it.typename === 'GroupItem') { try { gatherSel(it.pageItems, out); } catch (e0) { } }
            else if (it.typename === 'TextRange') { try { for (k = 0; k < it.story.textFrames.length; k++) { out.push(it.story.textFrames[k]); } } catch (e) { } }
        }
    }
    function storyHead(tf) { try { return tf.story.textFrames[0]; } catch (e) { return tf; } }
    function abIndexOf(rects, cx, cy) {
        var i, r;
        for (i = 0; i < rects.length; i++) { r = rects[i]; if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) { return i; } }
        return -1;
    }
    function readLines(head) {
        var out = [], L, i, n;
        try { L = head.story.lines; n = Math.min(L.length, 3000); for (i = 0; i < n; i++) { out.push(String(L[i].contents)); } } catch (e) { return null; }
        return out;
    }
    function collect(doc, scope) {
        var list = [], rects = [], names = [], i, j, tf, b, ab, act = 0, frames = [], heads = [], stories = [], seen = [], k, h, txt, sel;
        try { for (i = 0; i < doc.artboards.length; i++) { rects.push(doc.artboards[i].artboardRect); names.push(T('Plan ', 'Artboard ') + (i + 1) + ' \u00AB ' + doc.artboards[i].name + ' \u00BB'); } } catch (e0) { }
        try { act = doc.artboards.getActiveArtboardIndex(); } catch (e1) { act = 0; }
        if (scope === 'selection') {
            sel = doc.selection;
            if (sel && sel.typename === 'TextRange') { sel = [sel]; }
            gatherSel(sel || [], list);
        } else {
            for (i = 0; i < doc.textFrames.length; i++) { list.push(doc.textFrames[i]); }
        }
        for (i = 0; i < list.length; i++) {
            tf = list[i];
            if (indexOf(seen, tf) >= 0) { continue; }
            seen.push(tf);
            if (layerName(tf) === MARK_LAYER || isHiddenItem(tf)) { continue; }
            try { b = tf.geometricBounds; } catch (e2) { continue; }
            ab = abIndexOf(rects, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
            if (scope === 'artboard' && ab !== act) { continue; }
            frames.push({ id: frames.length, tf: tf, l: b[0], t: b[1], r: b[2], b: b[3], ab: ab, locked: isLockedItem(tf) });
        }
        for (i = 0; i < frames.length; i++) {
            h = storyHead(frames[i].tf); k = -1;
            for (j = 0; j < heads.length; j++) { if (heads[j] === h) { k = j; break; } }
            if (k < 0) {
                heads.push(h);
                try { txt = String(h.story.textRange.contents); } catch (e4) { try { txt = String(frames[i].tf.contents); } catch (e5) { txt = ''; } }
                stories.push({ id: stories.length, text: txt, lines: readLines(h), ab: frames[i].ab, abName: frames[i].ab >= 0 ? names[frames[i].ab] : T('hors plan de travail', 'off artboard'), head: h, frames: [frames[i].id], editable: !frames[i].locked });
            } else {
                stories[k].frames.push(frames[i].id);
                if (frames[i].locked) { stories[k].editable = false; }
            }
        }
        return { frames: frames, stories: stories, abNames: names };
    }

    /* ================================================================== */
    /* ILLUSTRATOR : CORRECTIONS / FIXES                                  */
    /* ================================================================== */
    function chars(head) { return head.story.textRange.characters; }
    // Applique une modification minimale : chaque caractère gardé ou remplacé garde sa mise en forme
    // Applies a minimal edit: every kept or replaced character keeps its formatting
    function applyOp(head, pos, del, ins) {
        var k = Math.min(del, ins.length), i, c, n;
        for (i = 0; i < k; i++) { c = chars(head)[pos + i]; if (c.contents !== ins.charAt(i)) { c.contents = ins.charAt(i); } }
        if (ins.length > del) {
            if (k > 0) { c = chars(head)[pos + k - 1]; c.contents = c.contents + ins.substr(k); }
            else {
                n = chars(head).length;
                if (pos < n) { c = chars(head)[pos]; c.contents = ins + c.contents; }
                else { c = chars(head)[n - 1]; c.contents = c.contents + ins; }
            }
        } else if (del > ins.length) {
            for (i = del - 1; i >= k; i--) { chars(head)[pos + i].remove(); }
        }
    }
    function replaceRange(head, s, from, to) {
        var ops = editOps(from, to), q;
        for (q = ops.length - 1; q >= 0; q--) { applyOp(head, s + ops[q].pos, ops[q].del, ops[q].ins); }
    }
    function setNoBreak(head, s, e) {
        var i;
        for (i = s; i < e; i++) { chars(head)[i].characterAttributes.noBreak = true; }
    }
    function applyFixes(data, res) {
        var per = {}, i, r, key, list, out = { done: 0, skipped: 0, locked: 0, nobreak: 0 }, st, cur, n, winners = {}, f, prevS;
        for (i = 0; i < res.rows.length; i++) {
            r = res.rows[i];
            if (!r.checked || !r.issue.fix) { continue; }
            if (r.issue.fix.wins) { winners[r.story + ':' + r.item.s] = true; }
        }
        for (i = 0; i < res.rows.length; i++) {
            r = res.rows[i];
            if (!r.checked || !r.issue.fix) { continue; }
            key = r.story + ':' + r.item.s;
            if (!r.issue.fix.nb && !r.issue.fix.wins && winners[key]) { continue; }
            if (!has(per, r.story)) { per[r.story] = []; }
            per[r.story].push(r);
        }
        for (key in per) {
            if (!has(per, key)) { continue; }
            st = data.stories[Number(key)]; list = per[key];
            if (!st.editable) { out.locked += list.length; continue; }
            try { cur = String(st.head.story.textRange.contents); n = st.head.story.textRange.characters.length; } catch (e0) { out.skipped += list.length; continue; }
            if (cur !== st.text || n !== cur.length) { out.skipped += list.length; continue; }
            // Insécables d'abord (positions inchangées), puis remplacements de la fin vers le début
            // Non-breaking first (positions unchanged), then replacements from the end backwards
            for (i = 0; i < list.length; i++) {
                f = list[i].issue.fix;
                if (!f.nb) { continue; }
                try { setNoBreak(st.head, list[i].item.s, list[i].item.e); out.nobreak++; out.done++; } catch (e1) { out.skipped++; }
            }
            list.sort(function (a, b) { return b.item.s - a.item.s; });
            prevS = 1e12;
            for (i = 0; i < list.length; i++) {
                f = list[i].issue.fix;
                if (f.nb) { continue; }
                if (list[i].item.e > prevS) { out.skipped++; continue; }
                if (cur.substring(list[i].item.s, list[i].item.e) !== f.from) { out.skipped++; continue; }
                try { replaceRange(st.head, list[i].item.s, f.from, f.to); out.done++; prevS = list[i].item.s; } catch (e2) { out.skipped++; }
            }
        }
        return out;
    }

    /* ================================================================== */
    /* ILLUSTRATOR : REPÈRES ET SÉLECTION / MARKERS AND SELECTION         */
    /* ================================================================== */
    function getMarkLayer(doc, create) {
        var L = null;
        try { L = doc.layers.getByName(MARK_LAYER); } catch (e) { L = null; }
        if (L) {
            try { L.locked = false; L.visible = true; } catch (e1) { }
            try { while (L.pageItems.length) { L.pageItems[0].remove(); } } catch (e2) { }
            if (!create) { try { L.remove(); } catch (e3) { } return null; }
            return L;
        }
        if (!create) { return null; }
        L = doc.layers.add(); L.name = MARK_LAYER;
        try { L.printable = false; } catch (e4) { }
        return L;
    }
    function mkColor(doc, r, g, b, c, m, y, k) {
        var col;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) { col = new CMYKColor(); col.cyan = c; col.magenta = m; col.yellow = y; col.black = k; }
        else { col = new RGBColor(); col.red = r; col.green = g; col.blue = b; }
        return col;
    }
    function addLabel(L, x, y, text, col) {
        var tf = L.textFrames.add();
        tf.contents = text;
        try { tf.textRange.characterAttributes.size = 7; tf.textRange.characterAttributes.fillColor = col; } catch (e) { }
        try { tf.position = [x, y]; } catch (e2) { }
        return tf;
    }
    function drawMarkers(doc, data, res) {
        var L = getMarkLayer(doc, true), red = mkColor(doc, 230, 0, 30, 0, 100, 90, 0), orange = mkColor(doc, 255, 120, 0, 0, 60, 100, 0), per = {}, i, r, k, st, f, rect, col, labs, n = 0;
        for (i = 0; i < res.rows.length; i++) {
            r = res.rows[i];
            if (r.issue.sev !== 'err' && r.issue.sev !== 'warn') { continue; }
            if (!has(per, r.story)) { per[r.story] = { err: false, labels: [] }; }
            if (r.issue.sev === 'err') { per[r.story].err = true; }
            per[r.story].labels.push(shorten(r.item.raw, 24) + ' : ' + shorten(r.issue.msg, 50));
        }
        for (k in per) {
            if (!has(per, k)) { continue; }
            st = data.stories[Number(k)]; col = per[k].err ? red : orange;
            for (i = 0; i < st.frames.length; i++) {
                f = data.frames[st.frames[i]];
                rect = L.pathItems.rectangle(f.t + 3, f.l - 3, (f.r - f.l) + 6, (f.t - f.b) + 6);
                rect.filled = false; rect.stroked = true; rect.strokeWidth = 1.2; rect.strokeColor = col;
                if (!per[k].err) { try { rect.strokeDashes = [4, 3]; } catch (e1) { } }
                if (i === 0) { labs = per[k].labels; addLabel(L, f.l - 3, f.b - 5, labs.slice(0, 3).join('  |  ') + (labs.length > 3 ? '  \u2026' : ''), col); }
                n++;
            }
        }
        if (!n) { getMarkLayer(doc, false); return 0; }
        try { L.locked = true; } catch (e2) { }
        return n;
    }
    function selectIssues(doc, data, res) {
        var sel = [], i, k, st, ids = {};
        for (i = 0; i < res.rows.length; i++) {
            if (res.rows[i].issue.sev !== 'err' && res.rows[i].issue.sev !== 'warn') { continue; }
            st = data.stories[res.rows[i].story];
            for (k = 0; k < st.frames.length; k++) { ids[st.frames[k]] = true; }
        }
        for (k in ids) { if (has(ids, k) && !data.frames[Number(k)].locked) { sel.push(data.frames[Number(k)].tf); } }
        try { doc.selection = null; } catch (e0) { }
        if (sel.length) { try { doc.selection = sel; } catch (e1) { } }
        return sel.length;
    }

