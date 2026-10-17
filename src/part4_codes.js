    /* ================================================================== */
    /* CODES À CLÉ / CHECK-DIGIT CODES                                    */
    /* ================================================================== */
    function ibanValid(s) {
        var r = s.substr(4) + s.substr(0, 4), num = '', i, c;
        for (i = 0; i < r.length; i++) {
            c = r.charCodeAt(i);
            if (c >= 65 && c <= 90) { num += String(c - 55); } else { num += r.charAt(i); }
        }
        return mod97(num) === 1;
    }
    function ibanCheckDigits(s) {
        var r = s.substr(4) + s.substr(0, 2) + '00', num = '', i, c, k;
        for (i = 0; i < r.length; i++) { c = r.charCodeAt(i); num += (c >= 65 && c <= 90) ? String(c - 55) : r.charAt(i); }
        k = 98 - mod97(num);
        return k < 10 ? '0' + k : String(k);
    }
    // Clé RIB / RIP algérien (instruction 06-2004) : 97 − ((agence ‖ compte) × 100 mod 97)
    // Algerian RIB / RIP key: 97 − ((branch ‖ account) × 100 mod 97)
    function ribKeyDZ(agency, account) { var k = 97 - mod97(agency + account + '00'); return k < 10 ? '0' + k : String(k); }
    // Clé CCP : Σ chiffre × poids (4 pour le dernier … 13 pour le 1er des 10), modulo 100
    // CCP key: Σ digit × weight (4 for the last … 13 for the first of 10 digits), modulo 100
    function ccpKey(account) {
        var x = repeat('0', Math.max(0, 10 - account.length)) + account, s = 0, j;
        for (j = 0; j < 10; j++) { s += (x.charCodeAt(9 - j) - 48) * (4 + j); }
        s = s % 100;
        return s < 10 ? '0' + s : String(s);
    }
    function gs1Check(body) {
        var s = 0, i, w = 3, d;
        for (i = body.length - 1; i >= 0; i--) { s += (body.charCodeAt(i) - 48) * w; w = w === 3 ? 1 : 3; }
        d = (10 - s % 10) % 10;
        return String(d);
    }
    function isbn10Check(body) {
        var s = 0, i, d;
        for (i = 0; i < 9; i++) { s += (body.charCodeAt(i) - 48) * (10 - i); }
        d = (11 - s % 11) % 11;
        return d === 10 ? 'X' : String(d);
    }
    function issnCheck(body) {
        var s = 0, i, d;
        for (i = 0; i < 7; i++) { s += (body.charCodeAt(i) - 48) * (8 - i); }
        d = (11 - s % 11) % 11;
        return d === 10 ? 'X' : String(d);
    }
    function luhnValid(s) {
        var sum = 0, i, d, alt = false;
        for (i = s.length - 1; i >= 0; i--) {
            d = s.charCodeAt(i) - 48;
            if (alt) { d *= 2; if (d > 9) { d -= 9; } }
            sum += d; alt = !alt;
        }
        return sum % 10 === 0;
    }
    function siretValid(s) {
        var i, t = 0;
        // La Poste : somme des chiffres multiple de 5, sauf le siège 356 000 000 00048 (Luhn)
        // La Poste: digit sum multiple of 5, except head office 356 000 000 00048 (Luhn)
        if (s.substr(0, 9) === '356000000' && s !== '35600000000048') { for (i = 0; i < 14; i++) { t += s.charCodeAt(i) - 48; } return t % 5 === 0; }
        return luhnValid(s);
    }
    function tvaFrKey(siren) { var k = (12 + 3 * mod97(siren)) % 97; return k < 10 ? '0' + k : String(k); }

    var CODE_LABELS = [
        { k: 'iban', re: /^(iban)$/ },
        { k: 'rib', re: /^(rib|r\.i\.b|rip|r\.i\.p)$/ },
        { k: 'ccp', re: /^(ccp|c\.c\.p|ح\.ب\.ج|حبج)$/ },
        { k: 'isbn', re: /^(isbn|isbn-?1[03]|ردمك)$/ },
        { k: 'issn', re: /^(issn|ردمد)$/ },
        { k: 'ean', re: /^(ean|ean-?1[34]|ean-?8|gtin|gtin-?1[234]|upc|upc-?a|gencod)$/ },
        { k: 'siren', re: /^(siren)$/ },
        { k: 'siret', re: /^(siret)$/ },
        { k: 'tva', re: /^(tva|vat)$/ }
    ];
    function codeLabelAt(low, s) {
        // Libellé juste avant s (40 caractères) / label right before s (40 characters)
        var w = low.substring(Math.max(0, s - 40), s), m, re = /[a-z\u0600-\u06FF][a-z0-9\u0600-\u06FF.\-]*/g, last = null, i, word;
        while ((m = re.exec(w)) !== null) {
            word = m[0].replace(/[.\-]+$/, '');
            for (i = 0; i < CODE_LABELS.length; i++) { if (CODE_LABELS[i].re.test(word)) { last = { k: CODE_LABELS[i].k, end: m.index + m[0].length }; } }
            if (/^(cl[eé]f?|key|مفتاح|المفتاح)$/.test(word)) { continue; }
        }
        if (/حساب\s*بريدي|البريدي\s*الجاري|الحساب\s*البريدي/.test(w)) { last = { k: 'ccp', end: w.length }; }
        if (/compte\s*(bancaire|courant)|رقم\s*الحساب|الحساب\s*البنكي/.test(w) && !last) { last = { k: 'rib', end: w.length }; }
        if (last && w.substr(last.end).replace(/[\s:\u00B0\u00BAn.#\-]/g, '').length > 3) { return null; }
        return last ? last.k : null;
    }
    function markMask(mask, s, e) { var k; for (k = s; k < e; k++) { mask[k] = true; } }
    function maskedAny(mask, s, e) { var k; for (k = s; k < e; k++) { if (mask[k]) { return true; } } return false; }
    function scanCodes(t, mask, opts) {
        var out = [], low = t.toLowerCase(), re, m, s, e, raw, d, lab, cc, n, key, exp, it, keyRe, acc, body, chk;
        // IBAN (groupes de 4) / IBAN (groups of 4)
        re = /([A-Z]{2})(\d{2})((?:[ \u00A0]?[A-Z0-9]{1,4})+)/g;
        while ((m = re.exec(t)) !== null) {
            s = m.index; raw = m[0];
            if (s > 0 && isAlnum(t.charAt(s - 1))) { continue; }
            cc = m[1];
            lab = codeLabelAt(low, s);
            if (!has(IBAN_LEN, cc) && !has(IBAN_LEN_EXP, cc)) { continue; }
            // Limite aux groupes réguliers / keep regular groups only
            var groups = raw.substr(4).replace(/^[ \u00A0]/, '').split(/[ \u00A0]/), body2 = m[1] + m[2], gi, ends = s + 4;
            if (/[ \u00A0]/.test(raw)) {
                ends = s + 4;
                for (gi = 0; gi < groups.length; gi++) {
                    if (gi > 0 && groups[gi - 1].length !== 4) { break; }
                    body2 += groups[gi]; ends += 1 + groups[gi].length;
                }
                if (raw.charAt(4) !== ' ' && raw.charAt(4) !== '\u00A0') { ends -= 1; }
            } else { body2 = raw; ends = s + raw.length; }
            if (lab && lab !== 'iban') { continue; }
            if (!/\d{6}/.test(body2) && lab !== 'iban') { continue; }
            if (body2.length < (lab ? 10 : 14)) { continue; }
            if (!lab && Math.abs(body2.length - (IBAN_LEN[cc] || IBAN_LEN_EXP[cc])) > 2) { continue; }
            if (maskedAny(mask, s, ends)) { continue; }
            it = { kind: 'code', sub: 'iban', s: s, e: ends, val: body2, issues: [] };
            exp = IBAN_LEN[cc] || IBAN_LEN_EXP[cc];
            if (body2.length !== exp) {
                it.issues.push({ code: 'IBAN_LEN', sev: 'err', msg: fmt(T('IBAN {0} : {1} caractères au lieu de {2}', '{0} IBAN: {1} characters instead of {2}'), [cc, body2.length, exp]) });
            } else if (!ibanValid(body2)) {
                it.issues.push({ code: 'IBAN_KEY', sev: 'err', msg: fmt(T('IBAN : clé de contrôle fausse (le calcul donne {0} au lieu de {1}) — un caractère est faux', 'IBAN: wrong check digits (computed {0} instead of {1}) — one character is wrong'), [ibanCheckDigits(body2), body2.substr(2, 2)]) });
            } else { it.ok = true; }
            if (!IBAN_LEN[cc] && IBAN_LEN_EXP[cc]) { it.issues.push({ code: 'IBAN_EXP', sev: 'info', msg: fmt(T('IBAN {0} : format non inscrit au registre officiel SWIFT', '{0} IBAN: format not in the official SWIFT registry'), [cc]) }); }
            out.push(it); markMask(mask, s, ends);
        }
        // Suites de chiffres à libellé (RIB, CCP, ISBN, EAN…) / labelled digit runs
        re = /\d[\d \u00A0\-.\/]*\d|\d/g;
        while ((m = re.exec(t)) !== null) {
            s = m.index; raw = m[0]; e = s + raw.length;
            if (s > 0 && /[A-Za-z0-9]/.test(t.charAt(s - 1)) && !/^(FR)$/.test(t.substring(s - 2, s))) { continue; }
            if (maskedAny(mask, s, e)) { continue; }
            d = raw.replace(/[^0-9]/g, '');
            if (d.length <= 2) { continue; }
            lab = codeLabelAt(low, s);
            if (!lab && d.length === 20 && d.substr(0, 8) === '00799999') { lab = 'rib'; }
            if (!lab) { continue; }
            if (lab === 'ccp' && d.length >= 18) { lab = 'rib'; }
            if (lab === 'rib' && d.length >= 18 && d.length <= 22) {
                it = { kind: 'code', sub: 'rib', s: s, e: e, val: d, issues: [] };
                if (d.length !== 20) { it.issues.push({ code: 'RIB_LEN', sev: 'err', msg: fmt(T('RIB / RIP : {0} chiffres au lieu de 20', 'RIB / RIP: {0} digits instead of 20'), [d.length]) }); }
                else {
                    key = ribKeyDZ(d.substr(3, 5), d.substr(8, 10));
                    if (key !== d.substr(18, 2)) { it.issues.push({ code: 'RIB_KEY', sev: 'err', msg: fmt(T('clé RIB / RIP fausse : le calcul donne {0}, il est écrit {1} — un chiffre est faux', 'wrong RIB / RIP key: computed {0}, written {1} — one digit is wrong'), [key, d.substr(18, 2)]) }); }
                    else { it.ok = true; }
                    if (d.substr(0, 3) === '007' && d.substr(3, 5) !== '99999') { it.issues.push({ code: 'RIP_AG', sev: 'warn', msg: T('RIP d’Algérie Poste : le code agence est toujours 99999', 'Algérie Poste RIP: branch code is always 99999') }); }
                }
                out.push(it); markMask(mask, s, e); continue;
            }
            if (lab === 'ccp') {
                // « 1234567 clé 89 », « 1234567/89 », « 1234567 - 89 » ; ou RIP de 20 chiffres
                keyRe = /^[ \u00A0]*(?:[\-\/,]|cl[eé]f?|key|مفتاح|المفتاح)?[ \u00A0:]*(?:cl[eé]f?|key|مفتاح|المفتاح)?[ \u00A0:]*(\d{2})(?!\d)/i;
                acc = raw.replace(/[ \u00A0\-.\/]*\d{2}$/, '');
                var km = /^(\d[\d \u00A0]*?)[ \u00A0]*[\-\/][ \u00A0]*(\d{2})$/.exec(raw), after;
                if (km) { acc = km[1].replace(/[^0-9]/g, ''); key = km[2]; }
                else {
                    after = keyRe.exec(asciiDigits(t.substr(e)));
                    if (after) { acc = d; key = after[1]; e = e + after[0].length; }
                    else { acc = d; key = null; }
                }
                if (acc.length > 10 || (acc.length < 4 && key === null)) { continue; }
                it = { kind: 'code', sub: 'ccp', s: s, e: e, val: acc, issues: [] };
                if (key === null) { it.issues.push({ code: 'CCP_NOKEY', sev: 'info', msg: fmt(T('CCP {0} sans clé : la clé attendue est {1}', 'CCP {0} without key: the expected key is {1}'), [acc, ccpKey(acc)]) }); }
                else if (ccpKey(acc) !== key) { it.issues.push({ code: 'CCP_KEY', sev: 'err', msg: fmt(T('clé CCP fausse : le calcul donne {0}, il est écrit {1} — un chiffre du compte ou de la clé est faux', 'wrong CCP key: computed {0}, written {1} — a digit of the account or key is wrong'), [ccpKey(acc), key]) }); }
                else { it.ok = true; }
                out.push(it); markMask(mask, s, e); re.lastIndex = e; continue;
            }
            if (lab === 'isbn' || lab === 'issn' || lab === 'ean' || lab === 'siren' || lab === 'siret' || lab === 'tva') {
                body = d; chk = null;
                if (lab === 'isbn' && /^(\d{9})[ \u00A0\-]?[Xx]/.test(t.substr(s).replace(/[\- \u00A0]/g, '').substr(0, 10)) && d.length === 9) {
                    body = d + 'X'; e = s + t.substr(s).search(/[Xx]/) + 1;
                }
                it = { kind: 'code', sub: lab, s: s, e: e, val: body, issues: [] };
                if (lab === 'isbn') {
                    if (body.length === 13) { chk = gs1Check(body.substr(0, 12)); if (!/^97[89]/.test(body)) { it.issues.push({ code: 'ISBN_PFX', sev: 'err', msg: T('ISBN-13 : doit commencer par 978 ou 979', 'ISBN-13: must start with 978 or 979') }); } }
                    else if (body.length === 10) { chk = isbn10Check(body.substr(0, 9)); }
                    else { it.issues.push({ code: 'ISBN_LEN', sev: 'err', msg: fmt(T('ISBN : {0} chiffres (10 ou 13 attendus)', 'ISBN: {0} digits (10 or 13 expected)'), [body.length]) }); }
                    if (chk !== null && chk !== body.charAt(body.length - 1).toUpperCase()) { it.issues.push({ code: 'ISBN_KEY', sev: 'err', msg: fmt(T('ISBN : chiffre de contrôle faux (calcul : {0}, écrit : {1})', 'ISBN: wrong check digit (computed {0}, written {1})'), [chk, body.charAt(body.length - 1)]) }); }
                } else if (lab === 'issn') {
                    var im = /^(\d{4})[\-\u2010\u2011 ]?(\d{3})([\dXx])/.exec(t.substr(s));
                    if (!im) { continue; }
                    body = im[1] + im[2] + im[3].toUpperCase(); e = s + im[0].length; it.e = e; it.val = body;
                    chk = issnCheck(body.substr(0, 7));
                    if (chk !== body.charAt(7)) { it.issues.push({ code: 'ISSN_KEY', sev: 'err', msg: fmt(T('ISSN : chiffre de contrôle faux (calcul : {0}, écrit : {1})', 'ISSN: wrong check digit (computed {0}, written {1})'), [chk, body.charAt(7)]) }); }
                } else if (lab === 'ean') {
                    if (body.length === 8 || body.length === 12 || body.length === 13 || body.length === 14) {
                        chk = gs1Check(body.substr(0, body.length - 1));
                        if (chk !== body.charAt(body.length - 1)) { it.issues.push({ code: 'EAN_KEY', sev: 'err', msg: fmt(T('code EAN / GTIN : chiffre de contrôle faux (calcul : {0}, écrit : {1})', 'EAN / GTIN code: wrong check digit (computed {0}, written {1})'), [chk, body.charAt(body.length - 1)]) }); }
                    } else { it.issues.push({ code: 'EAN_LEN', sev: 'err', msg: fmt(T('code EAN / GTIN : {0} chiffres (8, 12, 13 ou 14 attendus)', 'EAN / GTIN code: {0} digits (8, 12, 13 or 14 expected)'), [body.length]) }); }
                } else if (lab === 'siren') {
                    if (body.length !== 9) { it.issues.push({ code: 'SIREN_LEN', sev: 'err', msg: fmt(T('SIREN : {0} chiffres au lieu de 9', 'SIREN: {0} digits instead of 9'), [body.length]) }); }
                    else if (!luhnValid(body)) { it.issues.push({ code: 'SIREN_KEY', sev: 'err', msg: T('SIREN : la clé de Luhn ne tombe pas juste — un chiffre est faux', 'SIREN: the Luhn check fails — one digit is wrong') }); }
                } else if (lab === 'siret') {
                    if (body.length !== 14) { it.issues.push({ code: 'SIRET_LEN', sev: 'err', msg: fmt(T('SIRET : {0} chiffres au lieu de 14', 'SIRET: {0} digits instead of 14'), [body.length]) }); }
                    else if (!siretValid(body)) { it.issues.push({ code: 'SIRET_KEY', sev: 'err', msg: T('SIRET : la clé de Luhn ne tombe pas juste — un chiffre est faux', 'SIRET: the Luhn check fails — one digit is wrong') }); }
                } else if (lab === 'tva') {
                    var pre = /FR[ \u00A0]?$/.exec(t.substring(Math.max(0, s - 3), s));
                    if (!pre || body.length !== 11) { continue; }
                    it.s = s - pre[0].length;
                    if (tvaFrKey(body.substr(2)) !== body.substr(0, 2)) { it.issues.push({ code: 'TVA_KEY', sev: 'err', msg: fmt(T('TVA FR : clé {0} fausse pour le SIREN {1} (attendu {2})', 'FR VAT: key {0} wrong for SIREN {1} (expected {2})'), [body.substr(0, 2), body.substr(2), tvaFrKey(body.substr(2))]) }); }
                }
                if (!it.issues.length) { it.ok = true; }
                out.push(it); markMask(mask, it.s, it.e);
            }
        }
        return out;
    }

