    /* ================================================================== */
    /* REPÉRAGE DES NUMÉROS / FINDING PHONE NUMBERS                       */
    /* ================================================================== */
    function wordSet(list) { var o = {}, i; for (i = 0; i < list.length; i++) { o[list[i]] = true; } return o; }
    var LBL_TEL = wordSet(['tel', 't\u00E9l', 'tele', 't\u00E9l\u00E9', 'telephone', 't\u00E9l\u00E9phone', 'phone', 'ph', 'telefon', 'telefono', 'call', 'appel', 'appelez', 'appeler', 'contact', 'contactez', 'contacts', 'hotline', 'standard', 'urgence', 'urgences', 'r\u00E9servation', 'r\u00E9servations', 'reservation', 'reservations', 'renseignements', 'num\u00E9ro', 'numero', 'phones', 'tels', 't\u00E9ls', 'هاتف', 'الهاتف', 'هاتفي', 'للاتصال', 'اتصل', 'اتصلوا', 'الاتصال', 'للحجز', 'للطلب', 'للاستفسار', 'الهواتف', 'ت', 'هـ', 'ه']);
    var LBL_MOB = wordSet(['mob', 'mobile', 'mobil', 'portable', 'port', 'gsm', 'cell', 'cellulaire', 'cellphone', 'cel', 'celular', 'handy', 'mobiles', 'portables', 'جوال', 'الجوال', 'نقال', 'النقال', 'محمول', 'المحمول', 'موبايل', 'الموبايل', 'ج', 'م']);
    var LBL_FAX = wordSet(['fax', 't\u00E9l\u00E9copie', 'telecopie', 't\u00E9l\u00E9copieur', 'telecopieur', 'facsimile', 'فاكس', 'الفاكس', 'ف']);
    var LBL_FIXE = wordSet(['fixe', 'landline', 'ثابت', 'الثابت']);
    var LBL_WA = wordSet(['whatsapp', 'whatsap', 'watsap', 'watsapp', 'wtsp', 'whats', 'viber', 'telegram', 'واتساب', 'الواتساب', 'واتس', 'فايبر', 'تيليغرام', 'واتسآب']);
    var LBL_EXCL = wordSet(['rc', 'nif', 'nis', 'ai', 'art', 'article', 'matricule', 'mat', 'r\u00E9f', 'ref', 'r\u00E9f\u00E9rence', 'reference', 'bp', 'cp', 'code', 'lot', 'cit\u00E9', 'cite', 'route', 'rn', 'km', 'commande', 'facture', 'devis', 'dossier', 'agr\u00E9ment', 'agrement', 'capital', 'sku', 's\u00E9rie', 'serie', 'sn', 'ordre', 'registre', 'quantit\u00E9', 'qte', 'qt\u00E9', 'poids', 'prix', 'iban', 'rib', 'rip', 'ccp', 'isbn', 'issn', 'ean', 'gtin', 'siret', 'siren', 'tva', 'vat', 'السجل', 'التجاري', 'الجبائي', 'الضريبي', 'الإحصائي', 'التعريف', 'المادة', 'رأس', 'المال', 'ص.ب', 'السعر', 'ردمك', 'version', 'ver', 'v', 'build', 'release']);
    var EMOJI_TEL = ['\u260E', '\u260F', '\u2706', '\uD83D\uDCDE', '\u2121'];
    var EMOJI_MOB = ['\uD83D\uDCF1', '\uD83D\uDCF2'];
    var EMOJI_FAX = ['\uD83D\uDCE0'];
    function labelWords(w) {
        var out = [], re = /[A-Za-z\u00C0-\u024F\u0620-\u064A\u0640]+/g, m, x;
        while ((m = re.exec(w)) !== null) { x = m[0].toLowerCase().replace(/\u0640/g, ''); out.push({ w: x, s: m.index, e: m.index + m[0].length }); }
        return out;
    }
    // Libellé d'un numéro d'après le texte qui le précède / label of a number from the text before it
    // Renvoie { kind: 'tel'|'mob'|'fax'|'fixe'|'wa'|'tel fax'…, excl: bool } ou null
    function labelOf(w) {
        var ws = labelWords(w), i, k = [], excl = false, x, last = -1, tail, single, j;
        for (i = 0; i < ws.length; i++) {
            x = ws[i].w;
            if (has(LBL_EXCL, x)) { excl = true; k = []; last = ws[i].e; continue; }
            if (x.length === 1 && !/[\u0620-\u064A]/.test(x)) { continue; }
            if (x.length <= 2 && /[\u0620-\u064A]/.test(x)) {
                // Abréviations arabes « ت : », « ج : », « ف : » seulement suivies de « : »
                if (!/^[\s\u00A0]*[:.\uFF1A]/.test(w.substr(ws[i].e))) { continue; }
            }
            if (has(LBL_MOB, x)) { k.push('mob'); excl = false; last = ws[i].e; }
            else if (has(LBL_FAX, x)) { k.push('fax'); excl = false; last = ws[i].e; }
            else if (has(LBL_FIXE, x)) { k.push('fixe'); excl = false; last = ws[i].e; }
            else if (has(LBL_WA, x)) { k.push('wa'); excl = false; last = ws[i].e; }
            else if (has(LBL_TEL, x)) { k.push('tel'); excl = false; last = ws[i].e; }
        }
        single = /(?:^|[\s|\u2022\u00B7,;\/(])([TtMmFfWw])[\s\u00A0]?[:.\uFF1A][\s\u00A0]*\(?\+?[\s\u00A0]*$/.exec(w);
        if (single) {
            j = single[1].toLowerCase();
            k.push(j === 't' ? 'tel' : (j === 'm' ? 'mob' : (j === 'f' ? 'fax' : 'wa'))); excl = false; last = w.length;
        }
        for (i = 0; i < EMOJI_TEL.length; i++) { j = w.lastIndexOf(EMOJI_TEL[i]); if (j >= 0 && j >= last) { k.push('tel'); excl = false; last = j; } }
        for (i = 0; i < EMOJI_MOB.length; i++) { j = w.lastIndexOf(EMOJI_MOB[i]); if (j >= 0 && j >= last) { k.push('mob'); excl = false; last = j; } }
        for (i = 0; i < EMOJI_FAX.length; i++) { j = w.lastIndexOf(EMOJI_FAX[i]); if (j >= 0 && j >= last) { k.push('fax'); excl = false; last = j; } }
        if (excl) { return { kind: '', excl: true }; }
        if (!k.length) { return null; }
        // Le libellé doit être proche : au plus 12 caractères non blancs entre lui et le numéro
        tail = w.substr(Math.max(0, last)).replace(/[\s\u00A0:.\-\/|()\uFF1A\u2022\u00B7\u200E\u200F]/g, '');
        if (tail.length > 12) { return null; }
        return { kind: k.join(' '), excl: false };
    }
    var UNIT_AFTER = /^[\s\u00A0]*(da|dzd|dinars?|\u20AC|eur|euros?|\$|usd|dh|mad|dt|tnd|fcfa|cfa|%|kg|g|mg|l|ml|cl|cm|mm|m|km|m2|m\u00B2|m3|ha|h|min|ans?|ko|mo|go|px|pt|dpi|ppp|\u062F\u062C|\u062F\.\u062C|\u062F\u064A\u0646\u0627\u0631|\u0643\u063A|\u063A|\u0644\u062A\u0631|\u0633\u0645|\u0645\u0645)(?![A-Za-z\u00C0-\u024F\u0620-\u064A])/i;
    var DATE_RX = /^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}$|^\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}$/;
    // Vraie date plausible (jour <= 31, mois <= 12) / plausible real date (day <= 31, month <= 12)
    function looksLikeDate(raw) {
        var m = /^(\d{1,4})[.\/\-](\d{1,2})[.\/\-](\d{1,4})$/.exec(raw), a, b, c;
        if (!m || !DATE_RX.test(raw)) { return false; }
        a = Number(m[1]); b = Number(m[2]); c = Number(m[3]);
        if (m[1].length === 4) { return b >= 1 && b <= 12 && c >= 1 && c <= 31; }
        return a >= 1 && b >= 1 && ((a <= 31 && b <= 12) || (a <= 12 && b <= 31));
    }
    function isRunCh(ch) { return isDigit(ch) || isSpace(ch) || isBidi(ch) || '.-/()+\u2011\u2010'.indexOf(ch) >= 0; }
    function isStrongCh(ch) { return ',;|\u2013\u2014\u2022\u00B7'.indexOf(ch) >= 0; }
    function digitCount(s) { var n = 0, i; for (i = 0; i < s.length; i++) { if (isDigit(s.charAt(i))) { n++; } } return n; }
    // Coupe une suite en numéros séparés / splits a run into separate numbers
    function splitRun(t, s, e) {
        var parts = [], ps = s, k, ch, prev, next, dl, dr, q;
        for (k = s; k < e; k++) {
            ch = t.charAt(k); prev = k > s ? t.charAt(k - 1) : ''; next = k + 1 < e ? t.charAt(k + 1) : '';
            if (isStrongCh(ch) || ((ch === '/' || ch === '-') && (isSpace(prev) && isSpace(next)))) { parts.push([ps, k]); ps = k + 1; continue; }
            if (ch === '/') {
                dl = digitCount(t.substring(ps, k));
                q = k + 1; while (q < e && !isStrongCh(t.charAt(q)) && !(t.charAt(q) === '/' )) { q++; }
                dr = digitCount(t.substring(k + 1, q));
                if (dl >= 6 && dr >= 6) { parts.push([ps, k]); ps = k + 1; }
                continue;
            }
            if (ch === '+' && k > ps && digitCount(t.substring(ps, k)) >= 6) { parts.push([ps, k]); ps = k; }
        }
        parts.push([ps, e]);
        return parts;
    }
    function trimPart(t, p) {
        var s = p[0], e = p[1];
        while (s < e && !(isDigit(t.charAt(s)) || t.charAt(s) === '+' || t.charAt(s) === '(')) { s++; }
        while (e > s && !isDigit(t.charAt(e - 1)) && !(t.charAt(e - 1) === ')' && t.substring(s, e).indexOf('(') >= 0 && t.substring(s, e - 1).lastIndexOf('(') > t.substring(s, e - 1).lastIndexOf(')'))) { e--; }
        // Parenthèse ouvrante non fermée au début / unclosed opening parenthesis
        if (t.charAt(s) === '(' && t.substring(s, e).indexOf(')') < 0) { s++; while (s < e && isSpace(t.charAt(s))) { s++; } }
        return [s, e];
    }
    // Groupes (séparés par des blancs) d'une partie / blank-separated groups of a part
    function groupsOf(t, s, e) {
        var g = [], k = s, gs = -1;
        for (k = s; k <= e; k++) {
            if (k < e && !isSpace(t.charAt(k))) { if (gs < 0) { gs = k; } }
            else if (gs >= 0) { g.push([gs, k]); gs = -1; }
        }
        return g;
    }
    // Découpe d'une suite trop longue en plusieurs numéros valides (programmation dynamique)
    // Splits a too-long run into several valid numbers (dynamic programming)
    function segment(t, s, e, o) {
        var g = groupsOf(t, s, e), n = g.length, best = [], i, j, raw, pr;
        if (n < 2 || n > 24) { return null; }
        best[0] = [];
        for (j = 1; j <= n; j++) {
            best[j] = null;
            for (i = Math.max(0, j - 8); i < j; i++) {
                if (!best[i]) { continue; }
                raw = t.substring(g[i][0], g[j - 1][1]);
                if (digitCount(raw) < 6) { continue; }
                pr = parsePhone(raw, { region: o.region, label: 'tel' });
                if (pr.status !== 'ok' || pr.issues.length && pr.issues[0].sev === 'err') { continue; }
                if (!best[j] || best[i].length + 1 < best[j].length) { best[j] = best[i].concat([[g[i][0], g[j - 1][1]]]); }
            }
        }
        return best[n] && best[n].length > 1 ? best[n] : null;
    }
    function paraStartOf(t, s) { var k = s - 1; while (k >= 0 && !isBreak(t.charAt(k))) { k--; } return k + 1; }
    function scanPhones(text, t, mask, o) {
        var out = [], n = t.length, i = 0, j, run, parts, p, q, raw, s, e, w, lab, nd, ok, seg, prevEnd = -1, prevLab = null, ps, after, pr, al, segs, z, first, ng;
        while (i < n) {
            if (mask[i] || !(isDigit(t.charAt(i)) || t.charAt(i) === '+' || t.charAt(i) === '(')) { i++; continue; }
            if (i > 0 && (isLetter(t.charAt(i - 1)) || /[@#\u20AC$\u00A3_&]/.test(t.charAt(i - 1)) || (isDigit(t.charAt(i - 1))))) {
                while (i < n && (isDigit(t.charAt(i)) || isLetter(t.charAt(i)))) { i++; }
                continue;
            }
            j = i;
            while (j < n && !mask[j] && (isRunCh(t.charAt(j)) || (isStrongCh(t.charAt(j)) && j + 1 < n && /[\s\u00A0\d+(]/.test(t.charAt(j + 1))))) { j++; }
            // Un numéro collé à une lettre (« 0550123456A ») n'est pas un numéro
            if (j < n && isLetter(t.charAt(j)) && isDigit(t.charAt(j - 1))) { i = j; continue; }
            parts = splitRun(t, i, j);
            for (q = 0; q < parts.length; q++) {
                p = trimPart(t, parts[q]); s = p[0]; e = p[1];
                if (e <= s) { continue; }
                raw = t.substring(s, e); nd = digitCount(raw);
                if (nd < 6) { continue; }
                segs = [[s, e]];
                if (nd > 13 && !(/^\s*\(?\s*(\+|00)/.test(raw) && nd <= 15)) { seg = segment(t, s, e, o); if (seg) { segs = seg; } }
                for (z = 0; z < segs.length; z++) {
                    s = segs[z][0]; e = segs[z][1]; raw = t.substring(s, e); nd = digitCount(raw);
                    if (looksLikeDate(trim(raw))) { continue; }
                    ps = paraStartOf(t, s);
                    w = t.substring(Math.max(ps, prevEnd, s - 40), s);
                    lab = labelOf(w);
                    if (!lab && prevLab && prevEnd >= ps && prevEnd > s - 8 && /^[\s\u00A0\-\/|,;\u2013\u2014\u2022\u00B7]*$|^[\s\u00A0]*(ou|or|et|and|\u0623\u0648|\u0648)[\s\u00A0]*$/.test(t.substring(prevEnd, s))) { lab = prevLab; }
                    if (!lab) {
                        after = /^[\s\u00A0]*\(?[\s\u00A0]*([A-Za-z\u00C0-\u024F\u0620-\u064A]+)/.exec(t.substr(e, 20));
                        if (after) { al = labelOf(after[1] + ' '); if (al && !al.excl) { lab = al; } }
                    }
                    if (lab && lab.excl) { continue; }
                    if (UNIT_AFTER.test(t.substr(e, 12)) && !lab) { continue; }
                    if (!lab && /^[\s\u00A0(]*0[.,]\d/.test(raw)) { continue; }
                    first = trim(raw).replace(/^[\s\u00A0\u200E\u200F(]+/, '');
                    ng = groupsOf(t, s, e).length;
                    ok = false;
                    if (lab) { ok = true; }
                    else if (/^\+/.test(first)) { ok = nd >= 8; }
                    else if (/^00/.test(first)) { ok = nd >= 10 && (ng >= 2 || /[.\-]/.test(raw)); }
                    else if (/^0/.test(first) && o.unlabeled) {
                        ok = nd >= 8 && nd <= 13 && (ng >= 2 || /[.\-]/.test(raw) || nationalLenOk(nd, o.region));
                    }
                    if (!ok) { continue; }
                    pr = parsePhone(text.substring(s, e), { region: o.region, label: lab ? lab.kind : '', format: o.format, sep: o.sep });
                    out.push({ kind: 'phone', s: s, e: e, raw: text.substring(s, e), label: lab ? lab.kind : '', res: pr });
                    markMask(mask, s, e);
                    prevEnd = e; prevLab = lab;
                }
            }
            i = Math.max(j, i + 1);
        }
        return out;
    }
    function nationalLenOk(nd, region) {
        var d = PHONE_REGIONS[region], i;
        if (!d) { return false; }
        for (i = 0; i < d.L.length; i++) { if (d.L[i] + d.np.length === nd) { return true; } }
        return false;
    }

    /* ================================================================== */
    /* ANALYSE D'UN TEXTE / ANALYSIS OF ONE TEXT                          */
    /* ================================================================== */
    function engineDefaults() {
        return { region: 'DZ', phones: true, emails: true, urls: true, handles: true, codes: true, unlabeled: true, format: 'none', sep: ' ', lineSplits: true, showOk: false };
    }
    function scanHandles(t, mask) {
        var out = [], re = /@([A-Za-z0-9._\-\u00C0-\u024F]+)/g, m, s, e, name, w, ws, i, pk = null;
        while ((m = re.exec(t)) !== null) {
            s = m.index;
            if (mask[s]) { continue; }
            if (s > 0 && /[A-Za-z0-9._%+\-\u00C0-\u024F]/.test(t.charAt(s - 1))) { continue; }
            name = m[1].replace(/[.\-_]+$/, function (x) { return x.charAt(0) === '_' ? x : ''; });
            if (!name.length) { continue; }
            e = s + 1 + name.length;
            w = t.substring(Math.max(paraStartOf(t, s), s - 30), s);
            ws = labelWords(w); pk = null;
            for (i = ws.length - 1; i >= 0 && i >= ws.length - 3; i--) { pk = socialKey(ws[i].w); if (pk) { break; } }
            out.push({ kind: 'handle', s: s, e: e, name: name, platform: pk });
            markMask(mask, s, e);
        }
        return out;
    }
    function addFix(issue, raw, to, on, wins) { if (to !== null && to !== undefined && to !== raw) { issue.fix = { from: raw, to: to, on: !!on, wins: !!wins }; } }
    function analyzeText(text, o) {
        var t = asciiDigits(text), mask = [], items = [], list, i, k, it, iss, raw, pr, fixedDone;
        for (i = 0; i < t.length; i++) { mask.push(false); }
        if (o.emails) {
            list = scanEmails(t, mask);
            for (i = 0; i < list.length; i++) {
                it = list[i]; raw = text.substring(it.s, it.e);
                iss = checkEmail(it, raw);
                for (k = 0; k < iss.length; k++) { if (k === 0 && it.fixed) { addFix(iss[k], raw, it.fixed, it.fixOn, false); } }
                items.push({ kind: 'email', s: it.s, e: it.e, raw: raw, issues: iss, domain: it.domain });
            }
        } else { list = scanEmails(t, mask); }
        list = scanUrls(t, mask);
        if (o.urls) {
            for (i = 0; i < list.length; i++) {
                it = list[i]; raw = text.substring(it.s, it.e);
                iss = checkUrl(it, o);
                if (iss.length && it.fixed) { addFix(iss[0], raw, it.fixed, it.fixOn, false); }
                items.push({ kind: 'url', s: it.s, e: it.e, raw: raw, issues: iss, domain: it.domain, handle: it.handle });
            }
        }
        list = scanCodes(t, mask, o);
        if (o.codes) {
            for (i = 0; i < list.length; i++) { it = list[i]; items.push({ kind: 'code', sub: it.sub, s: it.s, e: it.e, raw: text.substring(it.s, it.e), issues: it.issues, ok: !!it.ok }); }
        }
        list = scanHandles(t, mask);
        if (o.handles) {
            for (i = 0; i < list.length; i++) { it = list[i]; items.push({ kind: 'handle', s: it.s, e: it.e, raw: text.substring(it.s, it.e), issues: checkHandle(it.name, it.platform), handle: it.name.toLowerCase(), platform: it.platform }); }
        }
        if (o.phones) {
            list = scanPhones(text, t, mask, o);
            for (i = 0; i < list.length; i++) {
                it = list[i]; pr = it.res; fixedDone = false;
                for (k = 0; k < pr.issues.length; k++) {
                    if (pr.issues[k].code === 'FORMAT') { addFix(pr.issues[k], it.raw, pr.issues[k].formatTo, false, true); }
                    else if (pr.issues[k].safe && !fixedDone) { addFix(pr.issues[k], it.raw, pr.fixed, pr.issues[k].sev === 'err', false); fixedDone = true; }
                }
                items.push({ kind: 'phone', s: it.s, e: it.e, raw: it.raw, issues: pr.issues, label: it.label, cc: pr.cc, nsn: pr.nsn, type: pr.type, status: pr.status, region: pr.region });
            }
        }
        items.sort(function (a, b) { return a.s - b.s; });
        return items;
    }
    // Contrôles entre textes : domaine de l'e-mail ↔ domaine du site
    // Cross-text checks: e-mail domain ↔ website domain
    function crossChecks(all) {
        var mails = [], sites = [], i, j, it, d, base, near, exact, out = 0;
        function core(h) { return String(h).toLowerCase().replace(/^www\./, '').replace(/^(m|web|fr|en|ar)\./, ''); }
        for (i = 0; i < all.length; i++) {
            it = all[i].item;
            if (it.kind === 'email' && it.domain && !isFreeProvider(it.domain)) { mails.push(all[i]); }
            if (it.kind === 'url' && it.domain && !socialKey(it.domain.replace(/\.(com|me)$/, '')) && !/^(wa\.me|t\.me|fb\.com|x\.com|twitter\.com|bit\.ly|goo\.gl|linktr\.ee)$/.test(it.domain)) { sites.push(all[i]); }
        }
        for (i = 0; i < mails.length; i++) {
            d = core(mails[i].item.domain); exact = false; near = null;
            for (j = 0; j < sites.length; j++) {
                base = core(sites[j].item.domain);
                if (base === d || base.split('.').slice(-d.split('.').length).join('.') === d || d.split('.').slice(-base.split('.').length).join('.') === base) { exact = true; break; }
                if (editDistance(base, d) <= 2 || base.split('.')[0] === d.split('.')[0]) { near = sites[j].item.raw; }
            }
            if (!exact && near) {
                mails[i].item.issues.push({ code: 'DOMAIN', sev: 'warn', msg: fmt(T('domaine de l’e-mail « {0} » différent de celui du site « {1} »', 'e-mail domain "{0}" differs from the website "{1}"'), [mails[i].item.domain, near]) });
                out++;
            }
        }
        return out;
    }
    // Coordonnées coupées par un retour à la ligne automatique (lignes lues dans Illustrator)
    // Contact details split by an automatic line wrap (lines read from Illustrator)
    function lineStarts(text, lines) {
        var pos = 0, starts = [], i, k, lt;
        for (i = 0; i < lines.length; i++) {
            lt = String(lines[i]).replace(/[\r\n\u0003]+$/, '');
            if (!lt.length) { continue; }
            k = text.indexOf(lt, pos);
            if (k < 0) { return null; }
            starts.push(k); pos = k + lt.length;
        }
        return starts;
    }
    function lineSplits(text, lines, items) {
        var st = lineStarts(text, lines), i, k, it, b, n = 0;
        if (!st) { return -1; }
        for (i = 0; i < items.length; i++) {
            it = items[i];
            for (k = 0; k < st.length; k++) {
                b = st[k];
                if (b > it.s && b < it.e && !isBreak(text.charAt(b - 1))) {
                    it.issues.push({ code: 'SPLIT', sev: 'warn', msg: T('coupé en fin de ligne : le lecteur risque de ne voir qu’une partie', 'split at the end of a line: readers may see only part of it'), noBreak: true, fix: { nb: true, on: true } });
                    n++;
                    break;
                }
            }
        }
        return n;
    }

