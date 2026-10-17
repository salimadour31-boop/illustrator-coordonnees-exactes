# CoordonneesExactes.jsx — contrôle des téléphones, e-mails, sites, comptes @ et codes à clé dans Illustrator

Script Adobe Illustrator (ExtendScript) qui **vérifie chaque coordonnée écrite dans un document** : le numéro de téléphone existe-t-il dans le plan de numérotation du pays ? Est-ce bien un mobile quand il est écrit « Mob » ? L'adresse e-mail est-elle bien écrite (`gmial.com`, `gmail.fr`, `.con`) ? Le site (`wwww.`, `http//`) ? Le compte `@` est-il possible sur la plateforme citée ? La clé du RIB, du RIP, du CCP, de l'IBAN ou de l'ISBN est-elle juste ? Le script **corrige ce qui est sûr**, lettre par lettre, en gardant la mise en forme.

> **Statut : non testé dans Illustrator.** Le moteur et le flux ont été testés avec Node.js sur des données simulées (voir plus bas). Travaillez sur une copie de votre fichier.

## À quoi ça sert

Sur une carte de visite, un en-tête de lettre, une affiche ou un flyer, le numéro de téléphone n'apparaît qu'**une seule fois**. S'il lui manque un chiffre (`0550 12 34 5`), si le 0 est resté après l'indicatif (`+213 0550…`, qui ne se compose pas depuis l'étranger), si le client a écrit `contact@gmial.com`, aucune relecture « par comparaison » ne le voit : tout « a l'air juste », et 1 000 cartes partent à la poubelle.

CoordonneesExactes lit tous les textes vivants (sélection, plan de travail actif ou document entier) et contrôle :

- **Téléphones**, en chiffres latins ou arabes (`٠٥٥٠ ١٢ ٣٤ ٥٦`), écrits `+213 …`, `00213 …`, `(0) …` ou en national :
  - longueur et préfixes **attribués** selon le plan de numérotation officiel de chaque pays (245 régions, données libphonenumber), avec le message « il manque probablement 1 chiffre (numéro mobile) » ou « 1 chiffre en trop » ;
  - **0 gardé après l'indicatif** (`+213 0550…`, `+33 06…`), notation `+33 (0)6…`, `+00213`, **0 oublié** en écriture nationale ;
  - **libellé ≠ type de ligne** : un mobile marqué « Fixe » ou « Fax », un fixe marqué « Mob » ou « WhatsApp » ;
  - libellés reconnus en français, anglais et arabe (`Tél`, `Mob`, `GSM`, `Port.`, `Fax`, `WhatsApp`, `هاتف`, `جوال`, `نقال`, `فاكس`, `واتساب`…) ; un pays par défaut pour les numéros sans indicatif (Algérie au départ, 29 pays dans la liste, n'importe quel code ISO sinon) ;
  - plusieurs numéros collés (`0550 12 34 56 / 0661 23 45 67`, `021 23 45 67 – 0550…`) séparés intelligemment ;
  - en option, **écriture standard** nationale ou internationale (`0550 12 34 56`, `+213 550 12 34 56`) avec espaces, points ou tirets.
- **E-mails** : faute de frappe sur les grandes messageries (`gmial`, `gamil`, `gmal`, `hotmial`, `yahooo`, `gmail.fr` qui n'existe pas…), virgule à la place du point, deux points de suite, espace, accent, extension inexistante (liste officielle IANA des domaines de premier niveau), `.con`, `.cpm`.
- **Sites** : `wwww.`, `ww.`, `www,`, `http//`, `https:/`, `htpp://`, espace après `www.`, extension inexistante, domaine du site différent de celui de l'e-mail sur le même document, liens `wa.me` mal formés, adresses de profils sociaux.
- **Comptes @** : règles de chaque plateforme citée à côté (Instagram, TikTok, X, Facebook, Snapchat, YouTube, Telegram, LinkedIn), par exemple `Instagram : @sarl-amal` (le tiret n'existe pas sur Instagram).
- **Codes à clé de contrôle** :
  - **IBAN** (modulo 97, longueur par pays) ;
  - **RIB / RIP algérien** (clé à 2 chiffres, `007 99999 …` d'Algérie Poste) ;
  - **CCP + clé** (`CCP : 1234567 clé 12`, `مفتاح`) ;
  - **ISBN-10/13, ISSN, EAN-13 / GTIN** ;
  - **SIREN / SIRET** (Luhn, avec l'exception de La Poste) et **TVA intracommunautaire française**.
- **Coordonnées coupées en fin de ligne** (un numéro ou une adresse à cheval sur deux lignes) : correction par **espace insécable** (attribut « insécable » sur les caractères du numéro), le texte ne change pas.

Les résultats sont présentés dans une **liste** (gravité, type, texte, problème, correction proposée), enregistrable en **rapport .txt**. Les textes à revoir sont **sélectionnés** et marqués de **repères** (cadre rouge pour une erreur, pointillé orange pour « à vérifier ») sur le calque **non imprimable** « Contrôle coordonnées », vidé à chaque passage. Le bouton **Appliquer les corrections cochées** fait les corrections sûres, cochées d'office (0 en trop après l'indicatif, `+00213` → `+213`, `gmial` → `gmail`, `.con` → `.com`, `wwww.` → `www.`, insécable…). Double-cliquez une ligne pour cocher ou décocher une correction. Les corrections qui relèvent d'un choix (écriture standard des numéros, retrait du `(0)`) sont proposées mais non cochées. **Un chiffre manquant ou une clé fausse ne sont jamais « corrigés »** : le script ne peut pas savoir quel chiffre est faux, seul le client le sait. Les textes verrouillés ne sont jamais modifiés.

## Pourquoi c'est nouveau (ce qui a été vérifié le 17/10/2026)

Recherches faites sur le web, GitHub, Adobe Community, Reddit, Graphic Design Stack Exchange, les listes de scripts connues (creold, Sergey Osokin, Alexander Ladygin, John Wundes, Hiroyuki Sato, sttk3, wckdtall, Kelso Cartography) et les boutiques de scripts payants :

- **Aucun script Illustrator ne contrôle la validité des coordonnées d'un document.** Illustrator n'a aucune fonction native de ce genre ; son correcteur orthographique ignore les numéros, les adresses e-mail et les clés.
- **Ce qui existe ne fait qu'une partie, ailleurs** :
  - Mapsoft PhoneNumberFormatter (InDesign) **met en forme** des numéros, sans vérifier qu'ils existent ;
  - Mapsoft URLFinder liste les URL d'un document (InDesign/Acrobat) sans les contrôler ;
  - les outils web-to-print (PrintUI…) valident les champs saisis dans un formulaire en ligne, pas un fichier Illustrator ;
  - des extensions Figma (MockShield, Guardrail) détectent ou masquent des données personnelles, sans les valider ;
  - les services de validation (Apify, IsValid…) sont des API en ligne : envoi des données, appel réseau ;
  - les contrôles de codes-barres (DeskPack, PageProof) lisent le code-barres dessiné, pas le numéro écrit en texte.
- Ce n'est pas non plus [VariantesCoquilles.jsx](https://github.com/salimadour31-boop/illustrator-variantes-coquilles) (formes différentes d'une même donnée dans un document), [CoherenceLangues.jsx](https://github.com/salimadour31-boop/illustrator-coherence-langues) (mêmes numéros d'une version linguistique à l'autre) ou [OrdreBidiArabe.jsx](https://github.com/salimadour31-boop/illustrator-ordre-bidi-arabe) (ordre d'affichage des numéros dans un texte arabe) : ces scripts comparent ou réordonnent, mais un numéro faux écrit partout de la même façon passe. Ici, une coordonnée, même **écrite une seule fois**, est vérifiée contre des règles officielles (plan de numérotation, liste IANA, clés de contrôle).
- Aucun outil trouvé ne gère les coordonnées algériennes (RIP, CCP + clé, numéros `05/06/07`, chiffres arabes) ni la correction dans le fichier en gardant la mise en forme de chaque lettre.

## Installation

1. Téléchargez `CoordonneesExactes.jsx` (le seul fichier nécessaire ; le dossier `src/` contient les mêmes sources, lisibles, et `tools/build.js` les assemble).
2. Au choix :
   - **Fichier > Scripts > Autre script…** (Ctrl+F12 / Cmd+F12), puis choisissez le fichier ;
   - ou copiez-le dans le dossier des scripts d'Illustrator, puis redémarrez Illustrator : il apparaît dans **Fichier > Scripts**.
     - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\fr_FR\Scripts\`
     - macOS : `/Applications/Adobe Illustrator <version>/Presets.localized/fr_FR/Scripts/`

## Utilisation

1. **Faites une copie de votre fichier.** Ouvrez-la.
2. Facultatif : sélectionnez des textes ou des groupes (ou placez le curseur dans un texte).
3. Lancez le script. La fenêtre de réglages propose :
   - **Portée** : sélection, plan de travail actif ou document ;
   - **Numéros sans indicatif** : le pays par défaut (ou un autre code ISO, par exemple `SN`) ;
   - **Contrôles** : téléphones (et numéros sans libellé commençant par 0), e-mails, sites, comptes @, codes à clé, coupures en fin de ligne ;
   - **Écriture standard des numéros** : aucune, nationale, internationale ou « garder la forme écrite », avec le séparateur (espaces, points, tirets) ;
   - **Résultat** : repères, sélection des textes à revoir, liste des coordonnées sans remarque ;
   - **Langue** : français ou anglais.
4. Cliquez sur **Analyser**. Cochez ou décochez les corrections (double-clic), puis **Appliquer les corrections cochées**. Le document est vérifié de nouveau et la nouvelle liste est affichée.
5. Supprimez le calque « Contrôle coordonnées » quand vous avez fini (il n'est pas imprimé de toute façon).

Messages explicites : « Aucun document ouvert… », « Rien n'est sélectionné… » (portée Sélection), « Aucun texte vivant visible… », « Aucune coordonnée reconnue… ». Les réglages sont mémorisés dans le dossier de préférences utilisateur (`CoordonneesExactes.cfg`). Les modifications se font sur les textes du document et s'annulent avec **Édition > Annuler** ; selon la version d'Illustrator, cela peut demander plusieurs annulations, d'où le conseil de travailler sur une copie.

**Aucun appel réseau, aucune collecte de données** : toutes les règles sont dans le script. Il ne peut donc pas savoir si un numéro ou une adresse **bien formés** appartiennent vraiment au client : « valide » veut dire « possible », pas « vérifié ».

## Limites connues

- Les textes vectorisés et les images ne sont pas lus : seuls les textes vivants visibles le sont. Les calques masqués et le calque de repères sont ignorés.
- Un chiffre **remplacé** par un autre (`0550 12 34 56` → `0550 12 43 56`) donne souvent un numéro qui existe : il ne peut pas être détecté sans la fiche du client.
- Les numéros courts (`3030`, `1548`, `15`, `17`) et les numéros spéciaux propres à un opérateur ne sont pas contrôlés.
- Le plan de numérotation est celui de libphonenumber au 17/10/2026. Un préfixe ouvert après cette date peut être signalé « non attribué » : mettez le script à jour ou ignorez la remarque.
- Les messageries connues sont une liste fixe (Gmail, Hotmail, Outlook, Live, Yahoo, iCloud, Proton, La Poste, Orange…). Un domaine d'entreprise mal écrit (`sarl-amal.dz` au lieu de `sarlamal.dz`) n'est signalé que s'il diffère du domaine du site du même document.
- Les NIF, NIS, RC et articles d'imposition algériens n'ont pas de clé publique documentée : ils sont reconnus pour ne pas être pris pour des téléphones, mais pas vérifiés.
- La détection des coupures de ligne utilise `story.lines` ; si Illustrator ne permet pas de lire les lignes d'un texte, le rapport le dit et cette vérification est sautée pour ce texte.

## Version cible et statut de test

- Cible : **Illustrator CC 2018 à 2026** (ExtendScript ES3, Windows et macOS).
- **Non testé dans Illustrator.** Aucun essai n'a été fait dans Illustrator lui-même. Le comportement réel du DOM (indices des caractères dans les textes chaînés, attribut insécable, lecture des lignes, annulation, couleurs des repères) reste à confirmer.

## Tests réellement effectués (hors Illustrator, Node.js 20)

Lancez `npm install` puis `npm test` (et `npm run syntax`).

- **Syntaxe** : le fichier `CoordonneesExactes.jsx` assemblé est analysé par acorn en mode **ECMAScript 3** et **ECMAScript 5**, sans erreur. Aucune fonction ES5+ (`forEach`, `map`, `JSON`, `trim`, `Object.keys`…) n'est utilisée ; les caractères non ASCII des chaînes et des expressions régulières sont échappés en `\uXXXX`.
- `tests/phones.ref.test.js` — **comparaison avec libphonenumber-js 1.13.15**, implémentation de référence indépendante (même source de données, code différent) :
  - 1 062 numéros d'exemple officiels (tous pays, tous types) : tous reconnus valides et du bon type ;
  - 39 821 numéros modifiés (chiffre supprimé, ajouté, remplacé, préfixe changé) : même verdict valide / invalide dans **99,97 %** des cas (10 écarts, tous sur l'île Norfolk, le Gabon et la Lituanie, non analysés en détail) ; même type de ligne 19 302 / 19 319 ;
  - 6 000 numéros nationaux aléatoires (Algérie, France, Maroc, Tunisie, Belgique, Suisse) : 6 000 / 6 000 identiques ;
  - écriture standard identique à libphonenumber-js : internationale 1 058 / 1 062, nationale 1 049 / 1 062.
- `tests/engine.test.js` (moteur, 7 128 vérifications) : cas écrits à la main (libellés FR/AR/EN, chiffres arabes, numéros collés, faux numéros : dates, prix, versions, RC, NIF, codes postaux), clés de contrôle sur des exemples publiés (IBAN, ISBN, ISSN `0378-5955` et `2434-561X`, SIRET de La Poste, TVA FR) et sur des milliers de codes générés puis altérés d'un chiffre, e-mails, sites, comptes @, distance de frappe, script de modifications lettre par lettre.
- `tests/corpus.test.js` — **3 000 cartes de visite synthétiques** (Algérie, France, Maroc, Tunisie ; français et arabe ; sur une ligne ou plusieurs ; bruit : adresse, RC, NIF, capital, prix, dates, horaires) générées par le test, dont 1 994 avec une erreur injectée de 13 sortes (chiffre supprimé ou ajouté, 0 après l'indicatif, mobile marqué « Fax », messagerie mal écrite, virgule dans le domaine, `wwww`, `http//`, `.con`, clé CCP, clé RIP, chiffre d'IBAN, tiret dans un compte Instagram) :
  - **1 994 / 1 994 erreurs trouvées**, 0 fausse alerte à côté ;
  - **0 fausse alerte sur les 1 006 cartes justes** ; 18 000 / 18 000 lignes de coordonnées reconnues ;
  - 4 000 lignes de bruit sans coordonnées (prix, dates, heures, RC, NIF, lots, versions, coordonnées GPS, numéros de commande, arabe) : 0 lue comme coordonnée.
  - Ce corpus est généré par le test lui-même : il mesure la cohérence du moteur, pas sa réussite sur de vrais fichiers de clients.
- `tests/dom.test.js` (47 vérifications) — flux complet sur un **DOM Illustrator et un ScriptUI simulés** (`tests/mockai.js`, pas Illustrator) : messages sans document, sans sélection, sans texte, sans coordonnée ; corrections appliquées avec la mise en forme d'origine gardée lettre par lettre ; textes verrouillés et calques masqués intacts ; correction ignorée si le texte a changé entre l'analyse et l'application ; insécable posé sur un numéro coupé par une composition simulée, puis plus de coupure ; texte chaîné lu une fois ; portée sélection (groupe, curseur) et plan de travail actif ; calque de repères non imprimable, verrouillé et retiré quand tout est juste ; deuxième passage sans effet ; dialogues de réglages et de résultats (double-clic, tout décocher, appliquer, rapport .txt UTF-8) ; réglages mémorisés et valeurs invalides refusées.
- `tests/mutations.js` : 12 erreurs volontaires dans le script (modulo 97, clé RIB, poids CCP, GS1, Luhn, exception La Poste, insécable, contrôle du texte modifié, textes verrouillés, calque imprimable, distance de frappe, 0 après l'indicatif) : **12 / 12 détectées** par les tests.

## Données et licences

- Code : © 2026 Amirouche Amwanes, licence MIT (voir `LICENSE`). Code original, aucun code repris d'une autre bibliothèque.
- Plan de numérotation : métadonnées de [libphonenumber](https://github.com/google/libphonenumber) (`data/PhoneNumberMetadata.xml`, © The Libphonenumber Authors, **licence Apache-2.0**, voir `NOTICE` et `data/LICENSE-libphonenumber`), converties en tableaux JavaScript par `tools/build_data.py`.
- Liste des domaines de premier niveau : IANA, version 2026101700 (`data/tlds.txt`).
- Longueurs d'IBAN : registre IBAN de SWIFT (`data/iban.json`).
- Pour régénérer les données : `python3 tools/build_data.py data/PhoneNumberMetadata.xml data/tlds.txt data/iban.json`, puis `node tools/build.js`.

---

## English summary

**CoordonneesExactes.jsx** checks every contact detail written in an Illustrator document — phone numbers against each country's official numbering plan (length, assigned prefixes, fixed vs mobile vs the "Mob/Fax" label, trunk 0 kept after `+213`, Latin or Arabic digits), misspelt e-mails and websites (`gmial.com`, `gmail.fr`, `.con`, `wwww.`, `http//`, unknown TLD per IANA), @handles impossible on the platform named next to them, and check-digit codes (IBAN, Algerian RIB/RIP, CCP key, ISBN, ISSN, EAN, SIREN/SIRET, French VAT) — plus contact details split across two lines. Safe fixes are applied letter by letter keeping each character's formatting; missing digits and wrong keys are reported, never guessed. Non-printing marker layer, .txt report, FR/EN interface, no network access.

Why it is new: no Illustrator script or built-in feature validates contact details; existing tools only format phone numbers (Mapsoft, InDesign), list URLs, validate web-to-print form fields, mask personal data in Figma, or call online validation APIs. **Not tested in Illustrator**: tested with Node.js only (comparison with libphonenumber-js on 40 000+ numbers, synthetic corpus of 3 000 cards, simulated Illustrator DOM, mutation tests). Install via **File > Scripts > Other Script…** or copy into `Presets/<locale>/Scripts`. Target: Illustrator CC 2018–2026. MIT licence; numbering data Apache-2.0 (libphonenumber).
