# FR : Génère src/part1_data.js : plan de numérotation (libphonenumber, Apache-2.0), liste IANA des
#      domaines de premier niveau, longueurs d'IBAN par pays (registre SWIFT, via Wikipédia).
# EN : Builds src/part1_data.js: numbering plans (libphonenumber, Apache-2.0), IANA top-level domain
#      list, IBAN lengths per country (SWIFT registry, via Wikipedia).
# Usage : python3 tools/build_data.py data/PhoneNumberMetadata.xml data/tlds.txt data/iban.json
import re, sys, json
import xml.etree.ElementTree as ET
xmlf, tldf, ibanf = sys.argv[1], sys.argv[2], sys.argv[3]
root = ET.parse(xmlf).getroot()
TYPES = [('fixedLine','F'),('mobile','M'),('voip','V'),('tollFree','T'),('premiumRate','P'),('sharedCost','S'),('uan','U'),('personalNumber','N'),('pager','G'),('voicemail','W')]
def clean(p): return re.sub(r'\s+', '', p or '')
def lengths(s):
    r = []
    for part in (s or '').split(','):
        part = part.strip()
        if not part: continue
        m = re.match(r'\[(\d+)-(\d+)\]', part)
        if m: r += list(range(int(m.group(1)), int(m.group(2)) + 1))
        else: r.append(int(part))
    return r
regions = {}; codes = {}
ver = root.find('territories')
for t in ver:
    rid = t.get('id'); cc = t.get('countryCode')
    if rid == '001': continue
    if t.get('mainCountryForCode') == 'true': codes.setdefault(cc, []).insert(0, rid)
    else: codes.setdefault(cc, []).append(rid)
    gd = t.find('generalDesc')
    d = {'c': cc, 'np': t.get('nationalPrefix') or '', 'g': clean(gd.findtext('nationalNumberPattern'))}
    if t.get('leadingDigits'): d['ld'] = t.get('leadingDigits')
    allL = set()
    for tag, k in TYPES:
        e = t.find(tag)
        if e is None: continue
        pat = clean(e.findtext('nationalNumberPattern'))
        if not pat or pat == 'NA': continue
        pl = e.find('possibleLengths')
        L = lengths(pl.get('national')) if pl is not None else []
        if not L:
            pl2 = gd.find('possibleLengths') if gd is not None else None
            if pl2 is not None: L = lengths(pl2.get('national'))
        if not L and t.find('fixedLine') is not None and t.find('fixedLine').find('possibleLengths') is not None:
            L = lengths(t.find('fixedLine').find('possibleLengths').get('national'))
        allL |= set(L)
        d[k] = [pat, L]
    d['L'] = sorted(allL)
    fmts = []
    af = t.find('availableFormats')
    npr = t.get('nationalPrefixFormattingRule')
    if af is not None:
        for nf in af.findall('numberFormat'):
            lds = nf.findall('leadingDigits')
            ld = clean(lds[-1].text) if lds else ''
            rule = nf.get('nationalPrefixFormattingRule')
            if rule is None: rule = npr or ''
            intl = nf.findtext('intlFormat')
            f = [nf.get('pattern'), ld, nf.findtext('format'), rule]
            if intl: f.append(intl)
            fmts.append(f)
    d['f'] = fmts
    regions[rid] = d
tlds = [l.strip().lower() for l in open(tldf) if l.strip() and not l.startswith('#')]
iban = json.load(open(ibanf))
hdr = open(tldf).readline().strip()
out = []
out.append('    /* ================================================================== */')
out.append('    /* DONNÉES GÉNÉRÉES / GENERATED DATA (tools/build_data.py)            */')
out.append('    /* Plans de numérotation : libphonenumber (Google, Apache-2.0)         */')
out.append('    /* https://github.com/google/libphonenumber — métadonnées seules,      */')
out.append('    /* aucun code repris / metadata only, no code reused.                  */')
out.append('    /* TLD : IANA ' + hdr.replace('#', '').strip()[:52].ljust(52) + ' */')
out.append('    /* IBAN : longueurs du registre SWIFT (via Wikipédia, déc. 2024).      */')
out.append('    /* ================================================================== */')
out.append('    var PHONE_REGIONS = ' + json.dumps(regions, separators=(',', ':'), ensure_ascii=True, sort_keys=True) + ';')
out.append('    var PHONE_CODES = ' + json.dumps(codes, separators=(',', ':'), sort_keys=True) + ';')
out.append("    var TLD_LIST = '|" + '|'.join(tlds) + "|';")
out.append('    var IBAN_LEN = ' + json.dumps(iban['official'], separators=(',', ':'), sort_keys=True) + ';')
out.append('    var IBAN_LEN_EXP = ' + json.dumps(iban['aspirational'], separators=(',', ':'), sort_keys=True) + ';')
open('src/part1_data.js', 'w').write('\n'.join(out) + '\n')
print(len(regions), 'régions', len(codes), 'indicatifs', len(tlds), 'TLD', len(iban['official']), '+', len(iban['aspirational']), 'IBAN')
