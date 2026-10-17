    /* ================================================================== */
    /* TÉLÉPHONES : PLAN DE NUMÉROTATION / PHONES: NUMBERING PLAN         */
    /* ================================================================== */
    var RX = {};
    function rx(p, full) {
        var k = (full ? 'F' : 'P') + p;
        if (!has(RX, k)) { RX[k] = new RegExp('^(?:' + p + ')' + (full ? '$' : '')); }
        return RX[k];
    }
    var TYPE_ORDER = ['F', 'M', 'V', 'T', 'P', 'S', 'U', 'N', 'G', 'W'];
    function typeName(t) {
        switch (t) {
            case 'F': return T('fixe', 'landline');
            case 'M': return T('mobile', 'mobile');
            case 'FM': return T('fixe ou mobile', 'landline or mobile');
            case 'V': return T('VoIP / fixe sans fil', 'VoIP');
            case 'T': return T('numéro gratuit', 'toll-free');
            case 'P': return T('numéro surtaxé', 'premium-rate');
            case 'S': return T('numéro à coût partagé', 'shared-cost');
            case 'U': return T('numéro unique (entreprise)', 'universal access');
            case 'N': return T('numéro personnel', 'personal number');
            case 'G': return T('bipeur', 'pager');
            case 'W': return T('messagerie vocale', 'voicemail');
        }
        return t;
    }
    function codeOf(digits) {
        var k, c;
        for (k = 1; k <= 3 && k <= digits.length; k++) { c = digits.substr(0, k); if (has(PHONE_CODES, c)) { return c; } }
        return null;
    }
    function inList(a, v) { return indexOf(a, v) >= 0; }
    // Classe un numéro national significatif (sans indicatif ni préfixe national)
    // Classifies a national significant number (no country code, no trunk prefix)
    function classify(cc, nsn, prefer) {
        var regs = PHONE_CODES[cc], i, k, d, t, r, possible = false, lens = [], order = [], best = null;
        if (!regs) { return { status: 'nocc' }; }
        if (prefer && inList(regs, prefer)) { order.push(prefer); }
        for (i = 0; i < regs.length; i++) { if (regs[i] !== prefer) { order.push(regs[i]); } }
        for (i = 0; i < order.length; i++) {
            r = order[i]; d = PHONE_REGIONS[r];
            if (!d) { continue; }
            for (k = 0; k < d.L.length; k++) { if (!inList(lens, d.L[k])) { lens.push(d.L[k]); } }
            if (inList(d.L, nsn.length)) { possible = true; }
            if (d.ld && !rx(d.ld, false).test(nsn)) { continue; }
            for (k = 0; k < TYPE_ORDER.length; k++) {
                t = TYPE_ORDER[k];
                if (!d[t] || !inList(d[t][1], nsn.length) || !rx(d[t][0], true).test(nsn)) { continue; }
                if (t === 'F' && d.M && inList(d.M[1], nsn.length) && rx(d.M[0], true).test(nsn)) { t = 'FM'; }
                best = { status: 'ok', type: t, region: r, data: d };
                break;
            }
            if (best) { return best; }
        }
        lens.sort(function (a, b) { return a - b; });
        if (!possible) { return { status: 'len', lens: lens, n: nsn.length }; }
        return { status: 'unassigned', lens: lens, n: nsn.length };
    }
    function applyFormat(nsn, f, nationalRule, np) {
        var re = rx(f[0], true), form = f[2], rule, k;
        if (nationalRule !== null) {
            rule = String(nationalRule).replace(/\$CC ?/, '');
            if (rule) {
                rule = rule.split('$NP').join(np).split('$FG').join('$1');
                k = form.indexOf('$1');
                if (k >= 0) { form = form.substr(0, k) + rule + form.substr(k + 2); }
            }
        }
        return nsn.replace(re, form);
    }
    function findFormat(nsn, d, intl) {
        var i, f, list = d.f;
        // Pays sans formats propres (ex. Caraïbes +1) : formats du pays principal de l'indicatif
        // Regions without their own formats (e.g. Caribbean +1): formats of the code's main region
        if (!list.length && PHONE_CODES[d.c]) { list = PHONE_REGIONS[PHONE_CODES[d.c][0]].f; }
        for (i = 0; i < list.length; i++) {
            f = list[i];
            if (intl && f[4] === 'NA') { continue; }
            if (f[1] && !rx(f[1], false).test(nsn)) { continue; }
            if (!rx(f[0], true).test(nsn)) { continue; }
            return f;
        }
        return null;
    }
    function formatNational(nsn, d) {
        var f = findFormat(nsn, d, false);
        if (!f) { return d.np + nsn; }
        return applyFormat(nsn, f, f[3], d.np);
    }
    function formatIntl(cc, nsn, d) {
        var f = findFormat(nsn, d, true), g;
        if (!f) { return '+' + cc + ' ' + nsn; }
        g = f[4] && f[4] !== 'NA' ? [f[0], f[1], f[4]] : f;
        return '+' + cc + ' ' + applyFormat(nsn, g, null, '');
    }
    function lenMessage(cls, given) {
        var mn = cls.lens[0], mx = cls.lens[cls.lens.length - 1], d;
        if (given < mn) { d = mn - given; return d === 1 ? T('il manque 1 chiffre', '1 digit missing') : fmt(T('il manque {0} chiffres', '{0} digits missing'), [d]); }
        if (given > mx) { d = given - mx; return d === 1 ? T('1 chiffre en trop', '1 digit too many') : fmt(T('{0} chiffres en trop', '{0} digits too many'), [d]); }
        return fmt(T('{0} chiffres : longueur impossible (attendu {1})', '{0} digits: impossible length (expected {1})'), [given, cls.lens.join(T(' ou ', ' or '))]);
    }
    // Remplace dans raw les chiffres d'indices donnés (indices dans la suite des chiffres) par ''
    // Removes from raw the digits whose ranks (in the digit sequence) are given
    function removeDigitRanks(raw, ranks) {
        var out = '', i, r = -1, a = asciiDigits(raw);
        for (i = 0; i < raw.length; i++) {
            if (isDigit(a.charAt(i))) { r++; if (inList(ranks, r)) { continue; } }
            out += raw.charAt(i);
        }
        return out;
    }
    function insertBeforeFirstDigit(raw, s) {
        var a = asciiDigits(raw), i;
        for (i = 0; i < a.length; i++) { if (isDigit(a.charAt(i))) { return raw.substr(0, i) + digitsLike(s, raw) + raw.substr(i); } }
        return raw;
    }
    function hasBidi(s) { var i; for (i = 0; i < s.length; i++) { if (isBidi(s.charAt(i))) { return true; } } return false; }
    function cleanSpaces(s) { return trim(s.replace(/[ \u00A0\u2009\u202F]{2,}/g, ' ')); }

    // Analyse complète d'un numéro écrit / full analysis of a written number
    // o : { region, label, format: 'none'|'national'|'intl'|'keep', sep: ' '|'.'|'-' }
    function parsePhone(raw, o) {
        var a = asciiDigits(raw), D = a.replace(/[^0-9]/g, ''), res = { raw: raw, digits: D, issues: [] }, lead, plus, off = 0, cc, rest, d, np, cls, nsn,
            fixed = raw, trunkRanks = [], hadNp = false, m, std, cmpA, lab = o.label || '', reg = o.region || 'DZ', regD = PHONE_REGIONS[reg] || PHONE_REGIONS.DZ, i;
        lead = a.substr(0, a.search(/[0-9]/));
        plus = lead.indexOf('+') >= 0;
        res.intl = plus || D.substr(0, 2) === '00';
        if (res.intl) {
            if (plus && D.substr(0, 2) === '00') {
                res.issues.push({ code: 'PLUS00', sev: 'err', msg: T('« + » et « 00 » ensemble : l’un des deux suffit', '"+" and "00" together: one of them is enough'), safe: true });
                fixed = removeDigitRanks(fixed, [0, 1]);
                off = 2;
            } else if (!plus) { off = 2; }
            cc = codeOf(D.substr(off));
            if (!cc) {
                res.status = 'nocc';
                res.issues.push({ code: 'NOCC', sev: 'err', msg: fmt(T('indicatif +{0} inexistant', 'country code +{0} does not exist'), [D.substr(off, 3)]) });
                return res;
            }
            rest = D.substr(off + cc.length);
            d = PHONE_REGIONS[PHONE_CODES[cc][0]]; np = d.np;
            cls = classify(cc, rest, null);
            if (cls.status !== 'ok' && np && rest.indexOf(np) === 0 && classify(cc, rest.substr(np.length), null).status !== 'len') {
                m = /\(\s*0\s*\)/.exec(a);
                if (np === '0' && m) {
                    res.issues.push({ code: 'PAREN0', sev: 'info', msg: T('notation « (0) » : à l’international le 0 ne se compose pas (norme E.123 : l’omettre)', '"(0)" notation: the 0 is not dialled internationally (E.123: omit it)'), safe: true });
                    fixed = cleanSpaces(fixed.substr(0, m.index) + ' ' + fixed.substr(m.index + m[0].length)).replace(/^\+ /, '+');
                } else {
                    for (i = 0; i < np.length; i++) { trunkRanks.push(off + cc.length + i); }
                    res.issues.push({ code: 'TRUNK0', sev: 'err', msg: fmt(T('« {0} » gardé après l’indicatif +{1} : il ne se compose pas depuis l’étranger', '"{0}" kept after country code +{1}: it is not dialled from abroad'), [np, cc]), safe: true });
                    fixed = removeDigitRanks(fixed, trunkRanks);
                }
                rest = rest.substr(np.length);
                cls = classify(cc, rest, null);
            }
            nsn = rest;
        } else {
            cc = regD.c; np = regD.np;
            if (np && D.indexOf(np) === 0) { nsn = D.substr(np.length); hadNp = true; } else { nsn = D; }
            cls = classify(cc, nsn, reg);
            if (cls.status !== 'ok' && hadNp) {
                // Numéro national sans préfixe (ex. Espagne, Italie) / national number without prefix
                if (classify(cc, D, reg).status === 'ok') { nsn = D; hadNp = false; cls = classify(cc, D, reg); }
            }
            if (!hadNp && np === '0' && cls.status === 'ok' && lab) {
                res.issues.push({ code: 'NONP', sev: 'warn', msg: T('le 0 du début semble oublié', 'the leading 0 seems to be missing'), safe: false });
                fixed = insertBeforeFirstDigit(fixed, '0');
            }
        }
        res.cc = cc; res.nsn = nsn; res.status = cls.status;
        if (cls.status === 'len') {
            res.issues.push({ code: 'LEN', sev: lab || res.intl ? 'err' : 'warn', msg: lenMessage(cls, nsn.length) + fmt(T(' pour un numéro {0}', ' for a {0} number'), [regionLabel(cls, cc, reg, res.intl)]) + nearMissText(nearMiss(cc, nsn, res.intl ? null : reg)) });
        } else if (cls.status === 'unassigned') {
            m = nearMiss(cc, nsn, res.intl ? null : reg);
            if (m.add.length || m.del.length) {
                res.issues.push({ code: 'UNASSIGNED', sev: lab || res.intl ? 'err' : 'warn', msg: fmt(T('aucun numéro {0} ne s’écrit ainsi', 'no {0} number is written like this'), [regionLabel(cls, cc, reg, res.intl)]) + nearMissText(m) });
            } else {
                res.issues.push({ code: 'UNASSIGNED', sev: 'warn', msg: fmt(T('début « {0} » non attribué dans le plan de numérotation {1}', 'prefix "{0}" not assigned in the {1} numbering plan'), [nsn.substr(0, 3), regionLabel(cls, cc, reg, res.intl)]) });
            }
        } else if (cls.status === 'ok') {
            res.type = cls.type; res.region = cls.region;
            if (/mob/.test(lab) && (cls.type === 'F' || cls.type === 'T' || cls.type === 'P' || cls.type === 'S')) {
                res.issues.push({ code: 'LBL_MOB', sev: 'warn', msg: fmt(T('libellé « mobile » mais numéro {0}', '"mobile" label but {0} number'), [typeName(cls.type)]) });
            } else if (/fax/.test(lab) && cls.type === 'M') {
                res.issues.push({ code: 'LBL_FAX', sev: 'warn', msg: T('libellé « fax » mais numéro mobile', '"fax" label but mobile number') });
            } else if (/fixe/.test(lab) && cls.type === 'M') {
                res.issues.push({ code: 'LBL_FIX', sev: 'warn', msg: T('libellé « fixe » mais numéro mobile', '"landline" label but mobile number') });
            } else if (/wa/.test(lab) && cls.type === 'F') {
                res.issues.push({ code: 'LBL_WA', sev: 'info', msg: T('WhatsApp sur un numéro fixe : possible seulement avec WhatsApp Business', 'WhatsApp on a landline: only possible with WhatsApp Business') });
            }
            if (o.format && o.format !== 'none' && !hasBidi(raw)) {
                d = cls.data;
                std = (o.format === 'intl' || (o.format === 'keep' && res.intl)) ? formatIntl(cc, nsn, d) : formatNational(nsn, d);
                if (o.sep && o.sep !== ' ') { std = std.replace(/^(\+\d+) /, '$1\u0001').replace(/ /g, o.sep).replace('\u0001', ' '); }
                std = digitsLike(std, raw);
                cmpA = trim(raw).replace(/[\u00A0\u2009\u202F]/g, ' ');
                if (cmpA !== std) {
                    res.issues.push({ code: 'FORMAT', sev: 'info', msg: fmt(T('écriture standard : {0}', 'standard form: {0}'), [std]), formatTo: std, safe: false });
                }
            }
        }
        res.fixed = fixed;
        return res;
    }
    // Un chiffre de moins ou de plus rendrait-il le numéro valide ? / would one digit less or more make it valid?
    function nearMiss(cc, nsn, prefer) {
        var add = [], del = [], i, dg, c, x;
        for (i = 0; i <= nsn.length; i++) {
            for (dg = 0; dg <= 9; dg++) {
                x = nsn.substr(0, i) + dg + nsn.substr(i);
                c = classify(cc, x, prefer);
                if (c.status === 'ok' && !inList(add, c.type)) { add.push(c.type); }
            }
        }
        for (i = 0; i < nsn.length; i++) {
            x = nsn.substr(0, i) + nsn.substr(i + 1);
            c = classify(cc, x, prefer);
            if (c.status === 'ok' && !inList(del, c.type)) { del.push(c.type); }
        }
        return { add: add, del: del, n: nsn.length };
    }
    function typeList(a) { var out = [], i; for (i = 0; i < a.length; i++) { out.push(typeName(a[i])); } return out.join(T(' ou ', ' or ')); }
    function nearMissText(m) {
        if (m.add.length && !m.del.length) { return fmt(T(' — il manque probablement 1 chiffre (numéro {0})', ' — probably 1 digit missing ({0} number)'), [typeList(m.add)]); }
        if (m.del.length && !m.add.length) { return fmt(T(' — probablement 1 chiffre en trop (numéro {0})', ' — probably 1 digit too many ({0} number)'), [typeList(m.del)]); }
        if (m.add.length && m.del.length) { return T(' — un chiffre manque ou est en trop', ' — one digit is missing or extra'); }
        return '';
    }
    function regionLabel(cls, cc, reg, intl) {
        var r = cls && cls.region ? cls.region : (intl ? (PHONE_CODES[cc] ? PHONE_CODES[cc][0] : '?') : reg);
        return r + ' (+' + cc + ')';
    }

