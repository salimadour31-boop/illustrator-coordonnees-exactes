    /* ================================================================== */
    /* E-MAILS, SITES, COMPTES @ / E-MAILS, WEBSITES, @HANDLES            */
    /* ================================================================== */
    function isTld(t) { return TLD_LIST.indexOf('|' + String(t).toLowerCase() + '|') >= 0; }
    var COMMON_TLDS = ['com', 'fr', 'dz', 'net', 'org', 'info', 'biz', 'ma', 'tn', 'eu', 'be', 'ch', 'ca', 'de', 'es', 'it', 'uk', 'us', 'io', 'co', 'me', 'app', 'shop', 'store', 'online', 'site', 'pro', 'edu', 'gov', 'tv', 'ly', 'eg', 'sa', 'ae', 'qa', 'tr', 'pt', 'nl'];
    var TLD_TYPOS = { con: 'com', cpm: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', coom: 'com', cim: 'com', cok: 'com', comn: 'com', coml: 'com', 'c0m': 'com', frr: 'fr', rf: 'fr', dzz: 'dz', zd: 'dz', nett: 'net', ent: 'net', nte: 'net', ogr: 'org', orgg: 'org', rog: 'org', inof: 'info', ifno: 'info' };
    function tldSuggestion(t) {
        var i, best = null, bd = 9, dd;
        t = String(t).toLowerCase();
        if (has(TLD_TYPOS, t)) { return TLD_TYPOS[t]; }
        for (i = 0; i < COMMON_TLDS.length; i++) {
            dd = editDistance(t, COMMON_TLDS[i]);
            if (dd < bd) { bd = dd; best = COMMON_TLDS[i]; } else if (dd === bd) { best = null; }
        }
        return bd === 1 ? best : null;
    }
    // Messageries grand public : domaines qui existent vraiment / consumer mail providers: real domains
    var PROVIDERS = [
        { b: 'gmail', ok: ['gmail.com'], strict: true },
        { b: 'googlemail', ok: ['googlemail.com'], strict: true },
        { b: 'hotmail', ok: ['hotmail.com', 'hotmail.fr', 'hotmail.co.uk', 'hotmail.it', 'hotmail.es', 'hotmail.de', 'hotmail.be'] },
        { b: 'outlook', ok: ['outlook.com', 'outlook.fr', 'outlook.es', 'outlook.it', 'outlook.de', 'outlook.be'] },
        { b: 'live', ok: ['live.com', 'live.fr', 'live.co.uk', 'live.be', 'live.ca', 'live.it', 'live.nl'] },
        { b: 'yahoo', ok: ['yahoo.com', 'yahoo.fr', 'yahoo.co.uk', 'yahoo.es', 'yahoo.it', 'yahoo.de', 'yahoo.ca'] },
        { b: 'ymail', ok: ['ymail.com'], strict: true },
        { b: 'icloud', ok: ['icloud.com'], strict: true },
        { b: 'protonmail', ok: ['protonmail.com', 'protonmail.ch'] },
        { b: 'proton', ok: ['proton.me'] },
        { b: 'laposte', ok: ['laposte.net'] },
        { b: 'wanadoo', ok: ['wanadoo.fr'] },
        { b: 'orange', ok: ['orange.fr'] },
        { b: 'yandex', ok: ['yandex.com', 'yandex.ru'] },
        { b: 'aol', ok: ['aol.com', 'aol.fr'] },
        { b: 'msn', ok: ['msn.com'], strict: true }
    ];
    // Libellés réels proches d'une marque, jamais signalés / real labels close to a brand, never flagged
    var NEAR_OK = '|email|mail|gmx|live|me|mac|ymail|msn|aim|free|sfr|neuf|bbox|zoho|proton|post|hotel|outlet|look|yahoo|';
    function providerCheck(domain) {
        var parts = domain.toLowerCase().split('.'), label = parts[0], tld = parts.slice(1).join('.'), i, P, dd;
        if (parts.length < 2) { return null; }
        for (i = 0; i < PROVIDERS.length; i++) {
            P = PROVIDERS[i];
            if (label === P.b) {
                if (inList(P.ok, domain.toLowerCase())) { return null; }
                if (P.strict || tld === 'dz' || tld === 'ma' || tld === 'tn' || !isTld(parts[parts.length - 1])) {
                    return { sev: 'err', to: P.ok[0], msg: fmt(T('« {0} » n’existe pas pour {1} : seul {2} reçoit les messages', '"{0}" does not exist for {1}: only {2} receives mail'), [domain, P.b, P.ok.join(' / ')]) };
                }
                return { sev: 'warn', to: null, msg: fmt(T('« {0} » : domaine inhabituel pour {1} (connus : {2})', '"{0}": unusual domain for {1} (known: {2})'), [domain, P.b, P.ok.join(', ')]) };
            }
        }
        if (NEAR_OK.indexOf('|' + label + '|') >= 0) { return null; }
        for (i = 0; i < PROVIDERS.length; i++) {
            P = PROVIDERS[i];
            if (P.b.length < 5) { continue; }
            dd = editDistance(label, P.b);
            if ((dd === 1 && label.charAt(0) === P.b.charAt(0)) || (dd === 2 && label.length >= 6 && label.substr(0, 2) === P.b.substr(0, 2))) {
                return { sev: 'err', to: inList(P.ok, P.b + '.' + tld) ? P.b + '.' + tld : P.ok[0], msg: fmt(T('« {0} » ressemble à une faute de frappe pour {1}', '"{0}" looks like a typo for {1}'), [domain, inList(P.ok, P.b + '.' + tld) ? P.b + '.' + tld : P.ok[0]]) };
            }
        }
        return null;
    }
    function isFreeProvider(domain) {
        var label = domain.toLowerCase().split('.')[0], i;
        for (i = 0; i < PROVIDERS.length; i++) { if (PROVIDERS[i].b === label) { return true; } }
        return NEAR_OK.indexOf('|' + label + '|') >= 0;
    }
    // Contrôle d'un nom de domaine (hôte) / host name check
    // Renvoie [{code, sev, msg, to?}] où to est l'hôte corrigé / returns issues, to = fixed host
    function hostIssues(host, ctx) {
        var out = [], h = host, labels, i, lab, tld, sug, fixedH;
        if (/,/.test(h)) {
            fixedH = h.replace(/,/g, '.');
            out.push({ code: 'COMMA', sev: 'err', msg: T('virgule à la place du point', 'comma instead of a dot'), to: fixedH });
            h = fixedH;
        }
        if (/\.\./.test(h)) {
            fixedH = h.replace(/\.{2,}/g, '.');
            out.push({ code: 'DOTS', sev: 'err', msg: T('deux points à la suite', 'two dots in a row'), to: fixedH });
            h = fixedH;
        }
        if (/^\./.test(h) || /\.$/.test(h)) { fixedH = h.replace(/^\.+|\.+$/g, ''); out.push({ code: 'DOTS', sev: 'err', msg: T('point au début ou à la fin du domaine', 'dot at the start or end of the domain'), to: fixedH }); h = fixedH; }
        labels = h.split('.');
        if (labels.length < 2) {
            out.push({ code: 'NOTLD', sev: 'err', msg: fmt(T('« {0} » sans extension (.com, .dz, .fr…)', '"{0}" has no extension (.com, .dz, .fr…)'), [h]) });
            return out;
        }
        for (i = 0; i < labels.length; i++) {
            lab = labels[i];
            if (!lab.length) { continue; }
            if (/_/.test(lab)) { out.push({ code: 'CHARS', sev: 'err', msg: T('« _ » interdit dans un nom de domaine', '"_" is not allowed in a domain name') }); }
            if (/^-|-$/.test(lab)) { out.push({ code: 'CHARS', sev: 'err', msg: T('tiret au début ou à la fin d’une partie du domaine', 'hyphen at the start or end of a domain label') }); }
            if (/[^A-Za-z0-9\-_]/.test(lab)) { out.push({ code: 'IDN', sev: 'warn', msg: T('lettres accentuées ou non latines dans le domaine : vérifier qu’il est enregistré ainsi', 'accented or non-Latin letters in the domain: check it is registered that way') }); break; }
        }
        tld = labels[labels.length - 1];
        if (!isTld(tld)) {
            sug = tldSuggestion(tld);
            out.push({ code: 'TLD', sev: 'err', msg: fmt(T('extension « .{0} » inexistante', 'extension ".{0}" does not exist'), [tld]) + (sug ? fmt(T(' (.{0} ?)', ' (.{0}?)'), [sug]) : ''), to: sug ? labels.slice(0, labels.length - 1).join('.') + '.' + sug : null });
        }
        return out;
    }
    var EMAIL_LOCAL = /[A-Za-z0-9._%+'\-!#$&*=?\^`{|}~\u00C0-\u024F]/;
    var HOST_CH = /[A-Za-z0-9\-.,\u00C0-\u024F_]/;
    function isLocalCh(ch) { return EMAIL_LOCAL.test(ch); }
    function isHostCh(ch) { return HOST_CH.test(ch); }
    // Trouve les e-mails de t (déjà en chiffres ASCII) / finds the e-mails of t (ASCII digits)
    function scanEmails(t, mask) {
        var out = [], i = 0, at, s, e, ls, le, hs, he, sp1 = false, sp2 = false, local, host, k;
        while ((at = t.indexOf('@', i)) >= 0) {
            i = at + 1;
            if (mask[at]) { continue; }
            ls = at; sp1 = false; sp2 = false;
            k = at - 1;
            if (k >= 0 && t.charAt(k) === ' ' && k - 1 >= 0 && isLocalCh(t.charAt(k - 1))) { sp1 = true; k--; }
            while (k >= 0 && isLocalCh(t.charAt(k)) && !mask[k]) { k--; }
            ls = k + 1; le = sp1 ? at - 1 : at;
            k = at + 1;
            if (k < t.length && t.charAt(k) === ' ' && k + 1 < t.length && isHostCh(t.charAt(k + 1))) { sp2 = true; k++; }
            hs = k;
            while (k < t.length && isHostCh(t.charAt(k)) && !mask[k]) { k++; }
            he = k;
            while (he > hs && /[.,\-_]/.test(t.charAt(he - 1))) { he--; }
            while (ls < le && /[.'\-]/.test(t.charAt(ls)) && t.charAt(ls) !== '.') { ls++; }
            local = t.substring(ls, le); host = t.substring(hs, he);
            if (!local.length || !host.length) { continue; }
            // « Instagram @nom » : un libellé suivi d'un compte n'est pas un e-mail
            // "Instagram @name": a label followed by a handle is not an e-mail
            if (sp1 && !/[.,]/.test(host)) { continue; }
            if (sp1 && /[.,]/.test(host) && SOCIAL_RX.test(local)) { continue; }
            if (!/[.,]/.test(host) && !providerCheck(host + '.com') && !sp2) {
                // « nom@societe » sans extension : signalé seulement si le local ressemble à un e-mail
                if (!/^(contact|info|infos|commercial|direction|admin|support|sales|rh|hr|service|compta|accueil)$/i.test(local) && !inList(['gmail', 'hotmail', 'yahoo', 'outlook'], host.toLowerCase())) { continue; }
            }
            s = ls; e = he;
            out.push({ kind: 'email', s: s, e: e, local: local, host: host, sp1: sp1, sp2: sp2 });
            for (k = s; k < e; k++) { mask[k] = true; }
            i = e;
        }
        return out;
    }
    function checkEmail(it, raw) {
        var issues = [], local = it.local, host = it.host, fixedLocal = local, fixedHost = host, hi, i, pc, to, fixable = true, hasErrFix = false;
        if (it.sp1 || it.sp2) { issues.push({ code: 'SPACE', sev: 'err', msg: T('espace autour de « @ »', 'space around "@"') }); hasErrFix = true; }
        if (/\.\./.test(local)) { fixedLocal = fixedLocal.replace(/\.{2,}/g, '.'); issues.push({ code: 'DOTS', sev: 'err', msg: T('deux points à la suite avant « @ »', 'two dots in a row before "@"') }); hasErrFix = true; }
        if (/^\./.test(local) || /\.$/.test(local)) { fixedLocal = fixedLocal.replace(/^\.+|\.+$/g, ''); issues.push({ code: 'DOTS', sev: 'err', msg: T('point juste avant « @ » ou au début', 'dot right before "@" or at the start') }); hasErrFix = true; }
        if (/[\u00C0-\u024F]/.test(local)) { issues.push({ code: 'ACCENT', sev: 'warn', msg: T('lettre accentuée avant « @ » : refusée par la plupart des messageries', 'accented letter before "@": rejected by most mail servers') }); }
        if (local.length > 64) { issues.push({ code: 'LONG', sev: 'err', msg: T('plus de 64 caractères avant « @ »', 'more than 64 characters before "@"') }); }
        if (!/[.,]/.test(host)) {
            pc = providerCheck(host + '.com');
            to = inList(['gmail', 'hotmail', 'yahoo', 'outlook', 'icloud', 'ymail'], host.toLowerCase()) ? host.toLowerCase() + '.com' : null;
            issues.push({ code: 'NOTLD', sev: 'err', msg: fmt(T('« {0} » sans extension', '"{0}" has no extension'), [host]) + (to ? ' (' + to + ' ?)' : '') });
            if (to) { fixedHost = to; hasErrFix = true; } else { fixable = false; }
        } else {
            hi = hostIssues(host, {});
            for (i = 0; i < hi.length; i++) {
                issues.push(hi[i]);
                if (hi[i].to) { fixedHost = hi[i].to; if (hi[i].sev === 'err') { hasErrFix = true; } }
                else if (hi[i].sev === 'err') { fixable = false; }
            }
            pc = providerCheck(fixedHost);
            if (pc) {
                issues.push({ code: 'PROVIDER', sev: pc.sev, msg: pc.msg });
                if (pc.to) { fixedHost = pc.to; if (pc.sev === 'err') { hasErrFix = true; } }
            }
        }
        it.fixed = fixable && (fixedLocal !== local || fixedHost !== host || it.sp1 || it.sp2) ? fixedLocal + '@' + fixedHost : null;
        it.fixOn = hasErrFix;
        it.domain = fixedHost.toLowerCase();
        return issues;
    }

    // Réseaux sociaux : règles de noms d'utilisateur publiées (2026, à revérifier)
    // Social networks: published username rules (2026, to re-check)
    var SOCIAL = {
        instagram: { name: 'Instagram', re: /^[A-Za-z0-9._]{1,30}$/, noEndDot: true, noDouble: true, hint: ['lettres, chiffres, « . » et « _ », 30 au plus', 'letters, digits, "." and "_", 30 max'] },
        tiktok: { name: 'TikTok', re: /^[A-Za-z0-9._]{2,24}$/, noEndDot: true, hint: ['lettres, chiffres, « . » et « _ », 2 à 24', 'letters, digits, "." and "_", 2 to 24'] },
        x: { name: 'X (Twitter)', re: /^[A-Za-z0-9_]{1,15}$/, hint: ['lettres, chiffres et « _ », 15 au plus, pas de point', 'letters, digits and "_", 15 max, no dot'] },
        facebook: { name: 'Facebook', re: /^[A-Za-z0-9.]{5,50}$/, hint: ['lettres, chiffres et « . », 5 au moins', 'letters, digits and ".", at least 5'] },
        snapchat: { name: 'Snapchat', re: /^[A-Za-z][A-Za-z0-9._\-]{2,14}$/, hint: ['3 à 15, commence par une lettre', '3 to 15, starts with a letter'] },
        youtube: { name: 'YouTube', re: /^[A-Za-z0-9._\-]{3,30}$/, hint: ['lettres, chiffres, « . », « - », « _ », 3 à 30', 'letters, digits, ".", "-", "_", 3 to 30'] },
        telegram: { name: 'Telegram', re: /^[A-Za-z][A-Za-z0-9_]{4,31}$/, hint: ['5 à 32, lettres, chiffres et « _ »', '5 to 32, letters, digits and "_"'] },
        linkedin: { name: 'LinkedIn', re: /^[A-Za-z0-9\-]{3,100}$/, hint: ['lettres, chiffres et « - »', 'letters, digits and "-"'] }
    };
    var SOCIAL_RX = /^(instagram|insta|ig|tiktok|facebook|fb|twitter|x|snapchat|snap|threads|youtube|yt|telegram|linkedin)$/i;
    function socialKey(word) {
        var w = String(word).toLowerCase().replace(/[\s.\-]/g, '');
        if (/^(instagram|insta|ig|threads|انستغرام|انستقرام|إنستغرام|انستا)$/.test(w)) { return 'instagram'; }
        if (/^(tiktok|تيكتوك)$/.test(w)) { return 'tiktok'; }
        if (/^(twitter|x|تويتر)$/.test(w)) { return 'x'; }
        if (/^(facebook|fb|فيسبوك|فايسبوك)$/.test(w)) { return 'facebook'; }
        if (/^(snapchat|snap|سناب|سنابشات)$/.test(w)) { return 'snapchat'; }
        if (/^(youtube|yt|يوتيوب)$/.test(w)) { return 'youtube'; }
        if (/^(telegram|تيليغرام|تلغرام|تليجرام)$/.test(w)) { return 'telegram'; }
        if (/^(linkedin)$/.test(w)) { return 'linkedin'; }
        return null;
    }
    function checkHandle(name, platform) {
        var issues = [], P = platform ? SOCIAL[platform] : null;
        if (P) {
            if (!P.re.test(name) || (P.noEndDot && /\.$/.test(name)) || (P.noDouble && /\.\./.test(name))) {
                issues.push({ code: 'HANDLE', sev: 'warn', msg: fmt(T('« {0} » impossible sur {1} ({2})', '"{0}" impossible on {1} ({2})'), [name, P.name, T(P.hint[0], P.hint[1])]) });
            }
        } else if (/[^A-Za-z0-9._\-]/.test(name)) {
            issues.push({ code: 'HANDLE', sev: 'warn', msg: fmt(T('« {0} » : accents, espaces ou symboles refusés par les réseaux sociaux', '"{0}": accents, spaces or symbols are rejected by social networks'), [name]) });
        } else if (/-/.test(name)) {
            issues.push({ code: 'HANDLE', sev: 'info', msg: fmt(T('« {0} » : le tiret est refusé par Instagram, TikTok, X et Facebook', '"{0}": hyphens are rejected by Instagram, TikTok, X and Facebook'), [name]) });
        }
        return issues;
    }

    // Jetons ressemblant à des adresses web / tokens that look like web addresses
    var FILE_EXT = '|png|jpg|jpeg|gif|pdf|ai|eps|psd|svg|tif|tiff|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp3|mp4|mov|avi|indd|cdr|exe|js|jsx|css|html|htm|php|webp|heic|csv|json|xml|';
    var BARE_TLDS = '|com|net|org|info|biz|fr|dz|ma|tn|eu|be|ch|ca|de|es|it|uk|us|io|co|me|app|shop|store|online|site|pro|tv|ly|eg|sa|ae|qa|tr|pt|nl|tech|agency|studio|design|art|blog|news|travel|immo|lu|mc|sn|ci|cm|mr|ml|'; 
    function scanUrls(t, mask) {
        var out = [], re = /[^\s\u00A0\u2009\u202F\r\n\u0003<>\u00AB\u00BB"]+/g, m, tok, s, e, low, k, nx, sch, isUrl, host, hs, path, ok;
        while ((m = re.exec(t)) !== null) {
            tok = m[0]; s = m.index; e = s + tok.length;
            // Ponctuation autour / surrounding punctuation
            while (tok.length && /^[(\[{'\u2018\u201C:;]/.test(tok)) { tok = tok.substr(1); s++; }
            while (tok.length && /[)\]}'\u2019\u201D.,;:!?]$/.test(tok)) { tok = tok.substr(0, tok.length - 1); e--; }
            if (!tok.length) { continue; }
            ok = true;
            for (k = s; k < e; k++) { if (mask[k]) { ok = false; break; } }
            if (!ok) { continue; }
            low = tok.toLowerCase();
            // « www. site.dz » : espace après www. / space after www.
            if (/^w{2,4}$/.test(low) && /^[.,]$/.test(t.charAt(e))) { tok = t.substring(s, e + 1); e++; low = tok.toLowerCase(); }
            if (/^w{2,4}[.,]$/.test(low)) {
                nx = /^[ ]([A-Za-z0-9\-\u00C0-\u024F]+[.,][^\s]+)/.exec(t.substr(e));
                if (nx) { tok = tok + ' ' + nx[1]; e = e + 1 + nx[1].length; while (/[)\]}'\u2019\u201D.,;:!?]$/.test(tok)) { tok = tok.substr(0, tok.length - 1); e--; } low = tok.toLowerCase(); re.lastIndex = e; }
            }
            sch = /^(h{1,2}t{1,3}p{1,2}s?)(:\/\/|:\/|\/\/|:\\\\|:\\|:|\/)/.exec(low);
            isUrl = false;
            if (sch && tok.length > sch[0].length + 3) { isUrl = true; }
            else if (/^w{2,4}[.,]/.test(low) && /[.,]/.test(low.substr(4))) { isUrl = true; }
            else if (/^[a-z0-9\-\u00C0-\u024F]{2,}(\.[a-z0-9\-]{2,})+(\/|$)/.test(low) && low.indexOf('@') < 0) {
                hs = low.split('/')[0].split('.');
                if ((BARE_TLDS.indexOf('|' + hs[hs.length - 1] + '|') >= 0 || has(TLD_TYPOS, hs[hs.length - 1])) && FILE_EXT.indexOf('|' + hs[hs.length - 1] + '|') < 0 && !/^\d+$/.test(hs[0])) { isUrl = true; }
            }
            if (!isUrl) { continue; }
            out.push({ kind: 'url', s: s, e: e, tok: tok });
            for (k = s; k < e; k++) { mask[k] = true; }
        }
        return out;
    }
    function checkUrl(it, opts) {
        var tok = it.tok, issues = [], low = tok.toLowerCase(), sch = /^(h{1,2}t{1,3}p{1,2}s?)(:\/\/|:\/|\/\/|:\\\\|:\\|:|\/)/.exec(low), scheme = '', rest = tok, fixedScheme = '', host, path = '', p, hi, i, fixedHost, wm, fixable = true, hasErrFix = false, seg, sk, hnd;
        if (sch) {
            scheme = tok.substr(0, sch[0].length); rest = tok.substr(sch[0].length);
            fixedScheme = (/s$/.test(sch[1]) ? 'https' : 'http') + '://';
            if (sch[1] !== 'http' && sch[1] !== 'https') { issues.push({ code: 'SCHEME', sev: 'err', msg: fmt(T('« {0} » mal écrit (http:// ou https://)', '"{0}" misspelt (http:// or https://)'), [sch[1]]) }); hasErrFix = true; }
            else if (sch[2] !== '://') { issues.push({ code: 'SCHEME', sev: 'err', msg: fmt(T('« {0} » au lieu de « {1} »', '"{0}" instead of "{1}"'), [scheme, fixedScheme]) }); hasErrFix = true; }
            else { fixedScheme = scheme; }
        }
        p = rest.search(/[\/?#]/);
        host = p >= 0 ? rest.substr(0, p) : rest; path = p >= 0 ? rest.substr(p) : '';
        fixedHost = host;
        wm = /^(w{2,4})([.,]+)( ?)/i.exec(host);
        if (wm && (wm[1].toLowerCase() !== 'www' || wm[2] !== '.' || wm[3])) {
            issues.push({ code: 'WWW', sev: 'err', msg: wm[1].toLowerCase() === 'www' && wm[2] === '.' ? T('espace après « www. »', 'space after "www."') : fmt(T('« {0} » au lieu de « www. »', '"{0}" instead of "www."'), [trim(wm[0])]) });
            fixedHost = 'www.' + host.substr(wm[0].length); hasErrFix = true;
        }
        hi = hostIssues(fixedHost.replace(/^www\./i, '') === fixedHost ? fixedHost : fixedHost, {});
        for (i = 0; i < hi.length; i++) {
            issues.push(hi[i]);
            if (hi[i].to) { fixedHost = hi[i].to; if (hi[i].sev === 'err') { hasErrFix = true; } }
            else if (hi[i].sev === 'err') { fixable = false; }
        }
        it.domain = fixedHost.toLowerCase().replace(/^www\./, '');
        // Profils de réseaux sociaux et liens WhatsApp / social profiles and WhatsApp links
        seg = path.split('/');
        sk = socialKey(it.domain.replace(/\.(com|me)$/, '').replace(/^(m|web|fr)\./, '').replace(/^instagr$/, 'instagram'));
        if (it.domain === 'x.com' || it.domain === 'twitter.com') { sk = 'x'; }
        if (it.domain === 'fb.com' || it.domain === 'fb.me') { sk = 'facebook'; }
        if (it.domain === 't.me') { sk = 'telegram'; }
        if (sk && seg.length > 1 && seg[1] && !/^(p|reel|reels|watch|groups|pages|profile\.php|share|channel|c|in|company|stories|explore|hashtag|events)$/i.test(seg[1])) {
            hnd = seg[1].replace(/^@/, '');
            if (sk === 'linkedin') { hnd = null; }
            if (hnd) { it.handle = hnd.toLowerCase(); issues = issues.concat(checkHandle(hnd, sk)); }
        } else if (sk === 'linkedin' && seg.length > 2 && /^(in|company)$/i.test(seg[1]) && seg[2]) {
            issues = issues.concat(checkHandle(seg[2], 'linkedin'));
        }
        if ((it.domain === 'wa.me' || it.domain === 'api.whatsapp.com') && seg.length > 1) {
            var waNum = /phone=([^&]+)/.exec(path), w = waNum ? waNum[1] : seg[1];
            if (/^(\+|00|0)/.test(w) && it.domain === 'wa.me') { issues.push({ code: 'WAME', sev: 'err', msg: T('lien wa.me : numéro international sans « + », « 00 » ni 0 national (ex. wa.me/213550123456)', 'wa.me link: international number without "+", "00" or trunk 0 (e.g. wa.me/213550123456)') }); }
            else if (/^\d{6,}$/.test(w)) {
                var pr = parsePhone('+' + w, { region: opts.region });
                for (i = 0; i < pr.issues.length; i++) { if (pr.issues[i].sev !== 'info') { issues.push({ code: 'WAME', sev: pr.issues[i].sev, msg: T('lien WhatsApp : ', 'WhatsApp link: ') + pr.issues[i].msg }); } }
                if (pr.status === 'ok' && pr.type === 'F') { issues.push({ code: 'WAME', sev: 'info', msg: T('lien WhatsApp vers un numéro fixe (WhatsApp Business seulement)', 'WhatsApp link to a landline (WhatsApp Business only)') }); }
            }
        }
        it.fixed = fixable && (fixedScheme !== scheme || fixedHost !== host) ? fixedScheme + fixedHost + path : null;
        it.fixOn = hasErrFix;
        return issues;
    }

