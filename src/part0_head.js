/*
 * CoordonneesExactes.jsx — v1.0.0
 * Contrôle les coordonnées écrites dans un document Illustrator : numéros de téléphone (plan de
 * numérotation officiel de chaque pays), e-mails, sites, comptes @ et codes à clé (IBAN, RIB/RIP
 * algérien, CCP + clé, ISBN, ISSN, EAN/GTIN, SIREN/SIRET, TVA FR). Corrige ce qui est sûr.
 * Checks the contact details written in an Illustrator document: phone numbers (each country's
 * official numbering plan), e-mails, websites, @handles and check-digit codes (IBAN, Algerian
 * RIB/RIP, CCP + key, ISBN, ISSN, EAN/GTIN, SIREN/SIRET, French VAT). Fixes what is safe.
 *
 * FR : Sur une carte de visite, un numéro n'apparaît qu'une fois : s'il lui manque un chiffre,
 *      aucune relecture par comparaison ne le voit, et 1 000 cartes partent à la poubelle. Le script
 *      lit tous les textes vivants (sélection, plan de travail ou document), reconnaît les numéros
 *      (chiffres latins ou arabes ٠١٢, +213 / 00213 / 0, libellés Tél, Mob, Fax, WhatsApp, هاتف,
 *      جوال, فاكس…) et les vérifie contre le plan de numérotation du pays (longueur, préfixes
 *      attribués, fixe / mobile) ; il trouve le 0 gardé après l'indicatif (+213 0550…), le zéro
 *      oublié, le mobile marqué « Fixe » ou « Fax », les e-mails et sites mal écrits (gmial.com,
 *      gmail.fr, .con, http//, wwww., virgule à la place du point, extension inexistante), le
 *      domaine du site différent de celui de l'e-mail, les @comptes impossibles sur la plateforme
 *      citée, les clés fausses (IBAN, RIB, RIP, CCP, ISBN, EAN…) et les coordonnées coupées en fin
 *      de ligne. Repères sur calque non imprimable, rapport .txt, corrections lettre par lettre.
 * EN : On a business card a number appears only once: if a digit is missing, no comparison-based
 *      proofreading can see it. The script reads every live text, recognises phone numbers (Latin
 *      or Arabic digits, labels) and validates them against the country's numbering plan; it finds
 *      the trunk 0 kept after the country code, the forgotten 0, mobiles labelled "Fax", misspelt
 *      e-mails and websites, website/e-mail domain mismatches, impossible @handles, wrong check
 *      digits and contact details split across lines. Non-printing markers, .txt report,
 *      letter-by-letter fixes that keep the formatting.
 *
 * Auteur / Author : Amirouche Amwanes — Licence MIT (2026). Code original / original code.
 * Données / Data : métadonnées de numérotation de libphonenumber (Google, licence Apache-2.0,
 * données seulement, aucun code repris), liste IANA des TLD, longueurs IBAN du registre SWIFT.
 * Cible / Target : Illustrator CC 2018 – 2026 (ExtendScript ES3). NON TESTÉ DANS ILLUSTRATOR / NOT TESTED IN ILLUSTRATOR.
 * Conseil : travaillez sur une copie du fichier. Tip: work on a copy. Édition > Annuler / Edit > Undo.
 * Aucun appel réseau, aucune collecte de données. No network access, no data collection.
 */

//@target illustrator

var CEX = (function () {
    var VERSION = '1.0.0';
    var MARK_LAYER = 'Contr\u00F4le coordonn\u00E9es';
    var CFG_NAME = 'CoordonneesExactes.cfg';

    var FR = true;
    try { FR = String(app.locale).substr(0, 2).toLowerCase() !== 'en'; } catch (eLoc) { FR = true; }
    function T(fr, en) { return FR ? fr : en; }
    function setLang(isFr) { FR = !!isFr; }

    /* ================================================================== */
    /* OUTILS / UTILITIES                                                 */
    /* ================================================================== */
    function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
    function indexOf(a, v) { var i; for (i = 0; i < a.length; i++) { if (a[i] === v) { return i; } } return -1; }
    function trim(s) { return String(s).replace(/^[\s\u00A0\u2009\u202F\u200E\u200F\u061C\uFEFF]+|[\s\u00A0\u2009\u202F\u200E\u200F\u061C\uFEFF]+$/g, ''); }
    function repeat(s, n) { var r = ''; while (n-- > 0) { r += s; } return r; }
    function shorten(s, n) { s = trim(String(s).replace(/[\r\n\u0003\t]+/g, ' ')); return s.length > n ? s.substr(0, n - 1) + '\u2026' : s; }
    function fmt(s, a) { return String(s).replace(/\{(\d)\}/g, function (m, d) { return a[Number(d)] === undefined ? m : String(a[Number(d)]); }); }

    // Chiffres arabes-indiens, persans et pleine chasse → ASCII, longueur conservée
    // Arabic-Indic, Persian and full-width digits → ASCII, same length
    function asciiDigits(s) {
        var out = '', i, c;
        s = String(s);
        for (i = 0; i < s.length; i++) {
            c = s.charCodeAt(i);
            if (c >= 0x0660 && c <= 0x0669) { out += String.fromCharCode(48 + c - 0x0660); }
            else if (c >= 0x06F0 && c <= 0x06F9) { out += String.fromCharCode(48 + c - 0x06F0); }
            else if (c >= 0xFF10 && c <= 0xFF19) { out += String.fromCharCode(48 + c - 0xFF10); }
            else if (c === 0xFF0B) { out += '+'; }
            else if (c === 0xFF20) { out += '@'; }
            else { out += s.charAt(i); }
        }
        return out;
    }
    // Écrit les chiffres ASCII de s dans l'écriture de ref (latine, arabe ou persane)
    // Writes the ASCII digits of s in the script used by ref (Latin, Arabic or Persian)
    function digitsLike(s, ref) {
        var base = 48, i, c, out = '';
        for (i = 0; i < ref.length; i++) {
            c = ref.charCodeAt(i);
            if (c >= 0x0660 && c <= 0x0669) { base = 0x0660; break; }
            if (c >= 0x06F0 && c <= 0x06F9) { base = 0x06F0; break; }
            if (c >= 48 && c <= 57) { break; }
        }
        if (base === 48) { return s; }
        for (i = 0; i < s.length; i++) {
            c = s.charCodeAt(i);
            out += (c >= 48 && c <= 57) ? String.fromCharCode(base + c - 48) : s.charAt(i);
        }
        return out;
    }
    function isDigit(ch) { return ch >= '0' && ch <= '9'; }
    function isLatinLetter(ch) { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '\u00C0' && ch <= '\u024F' && ch !== '\u00D7' && ch !== '\u00F7'); }
    function isArabicLetter(ch) { return ch >= '\u0620' && ch <= '\u064A'; }
    function isLetter(ch) { return isLatinLetter(ch) || isArabicLetter(ch); }
    function isAlnum(ch) { return isDigit(ch) || isLetter(ch); }
    function isSpace(ch) { return ch === ' ' || ch === '\u00A0' || ch === '\u2007' || ch === '\u2009' || ch === '\u202F' || ch === '\t' || ch === '\u2002' || ch === '\u2003' || ch === '\u2005' || ch === '\u2006' || ch === '\u2008' || ch === '\u200A'; }
    function isBidi(ch) { return ch === '\u200E' || ch === '\u200F' || ch === '\u061C' || (ch >= '\u202A' && ch <= '\u202E') || (ch >= '\u2066' && ch <= '\u2069') || ch === '\uFEFF'; }
    function isBreak(ch) { return ch === '\r' || ch === '\n' || ch === '\u0003' || ch === '\u2028' || ch === '\u2029'; }

    // Distance de Damerau-Levenshtein (transpositions adjacentes) / Damerau-Levenshtein distance
    function editDistance(a, b) {
        var n = a.length, m = b.length, d = [], i, j, c;
        if (Math.abs(n - m) > 3) { return 9; }
        for (i = 0; i <= n; i++) { d[i] = [i]; }
        for (j = 1; j <= m; j++) { d[0][j] = j; }
        for (i = 1; i <= n; i++) {
            for (j = 1; j <= m; j++) {
                c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
                if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) { d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
            }
        }
        return d[n][m];
    }
    // Reste modulo 97 d'une longue chaîne de chiffres / mod 97 of a long digit string
    function mod97(s) { var r = 0, i; for (i = 0; i < s.length; i++) { r = (r * 10 + (s.charCodeAt(i) - 48)) % 97; } return r; }
    // Modifications minimales from → to (préfixe et suffixe communs gardés)
    // Minimal edit from → to (common prefix and suffix kept)
    function minimalEdit(from, to) {
        var p = 0, s = 0;
        while (p < from.length && p < to.length && from.charAt(p) === to.charAt(p)) { p++; }
        while (s < from.length - p && s < to.length - p && from.charAt(from.length - 1 - s) === to.charAt(to.length - 1 - s)) { s++; }
        return { at: p, del: from.length - p - s, ins: to.substr(p, to.length - p - s) };
    }

    // Script de modifications par plus longue sous-suite commune : les caractères gardés restent
    // en place (et gardent leur mise en forme). Renvoie [{pos, del, ins}] croissants (positions de from).
    // Edit script from the longest common subsequence: kept characters stay in place (and keep their
    // formatting). Returns ascending [{pos, del, ins}] (positions in from).
    function editOps(from, to) {
        var n = from.length, m = to.length, L = [], i, j, ops = [], cur = null;
        for (i = 0; i <= n; i++) { L[i] = []; for (j = 0; j <= m; j++) { L[i][j] = 0; } }
        for (i = n - 1; i >= 0; i--) {
            for (j = m - 1; j >= 0; j--) {
                L[i][j] = from.charAt(i) === to.charAt(j) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
            }
        }
        i = 0; j = 0;
        function op() { if (!cur) { cur = { pos: i, del: 0, ins: '' }; } return cur; }
        function flush() { if (cur) { ops.push(cur); cur = null; } }
        while (i < n || j < m) {
            if (i < n && j < m && from.charAt(i) === to.charAt(j)) { flush(); i++; j++; }
            else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { op().ins += to.charAt(j); j++; }
            else { op().del++; i++; }
        }
        flush();
        return ops;
    }
    function applyOpsToString(s, ops) {
        var k, o;
        for (k = ops.length - 1; k >= 0; k--) { o = ops[k]; s = s.substr(0, o.pos) + o.ins + s.substr(o.pos + o.del); }
        return s;
    }

