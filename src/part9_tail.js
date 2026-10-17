    return {
        VERSION: VERSION, MARK_LAYER: MARK_LAYER, T: T, setLang: setLang,
        asciiDigits: asciiDigits, digitsLike: digitsLike, editDistance: editDistance, mod97: mod97, editOps: editOps, applyOpsToString: applyOpsToString,
        PHONE_REGIONS: PHONE_REGIONS, PHONE_CODES: PHONE_CODES, isTld: isTld,
        classify: classify, parsePhone: parsePhone, formatNational: formatNational, formatIntl: formatIntl, codeOf: codeOf,
        providerCheck: providerCheck, hostIssues: hostIssues, scanEmails: scanEmails, checkEmail: checkEmail, scanUrls: scanUrls, checkUrl: checkUrl, checkHandle: checkHandle, socialKey: socialKey,
        ibanValid: ibanValid, ibanCheckDigits: ibanCheckDigits, ribKeyDZ: ribKeyDZ, ccpKey: ccpKey, gs1Check: gs1Check, isbn10Check: isbn10Check, issnCheck: issnCheck, luhnValid: luhnValid, siretValid: siretValid, tvaFrKey: tvaFrKey, scanCodes: scanCodes,
        labelOf: labelOf, splitRun: splitRun, scanPhones: scanPhones, analyzeText: analyzeText, crossChecks: crossChecks, lineStarts: lineStarts, lineSplits: lineSplits, engineDefaults: engineDefaults,
        analyzeStories: analyzeStories, reportLines: reportLines, collect: collect, applyFixes: applyFixes, replaceRange: replaceRange, drawMarkers: drawMarkers, selectIssues: selectIssues, getMarkLayer: getMarkLayer,
        defaults: defaults, serialize: serialize, deserialize: deserialize, settingsDialog: settingsDialog, resultsDialog: resultsDialog, run: run, main: main
    };
}());

if (typeof module !== 'undefined' && module.exports) { module.exports = CEX; }
else { CEX.main(); }
