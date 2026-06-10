// C:\quran-similarity-app\backend\modules\ayah\ayah.controller.js
const AyahModel = require("./ayah.model");
const { formatSuccess, formatError } = require("../../utils/responseFormatter");

// FIX: Skip Quranic symbols (e.g. ۞) and return the first actual Arabic word
function extractFirstWord(text) {
    if (!text) return "";

    // Unicode ranges/chars to skip at the start of a token:
    // U+06DD  Arabic End of Ayah (۝)
    // U+06DE  Arabic Start of Rub El Hizb (۞)
    // U+06D6–U+06DC  Arabic small high signs
    // U+06DF–U+06E4  More Arabic combining marks
    // U+06E7–U+06ED  Arabic prayer marks
    // Also skip common dingbats/bullets and zero-width chars
    const symbolPrefix = /^[\u06D6-\u06ED\u06DD\u06DE\u2766\u2767\u2764\u274C\u25A0\u25AB\u25B2\u25BC\u25CF\u25CB\s\u200B\u200C\u200D\uFEFF]+/;

    const words = text.trim().split(/\s+/);

    for (const word of words) {
        const clean = word.replace(symbolPrefix, "").trim();
        // Accept the token only if it contains at least one Arabic letter
        if (clean && /[\u0600-\u06FF]/.test(clean)) {
            return clean;
        }
    }

    return "";
}

exports.getSurahs = async (req, res, next) => {
    try {
        const surahs = await AyahModel.getAllSurahs();
        res.status(200).json(formatSuccess(surahs));
    } catch (err) { next(err); }
};

exports.getAyahsBySurah = async (req, res, next) => {
    try {
        const ayahs = await AyahModel.getAyahsBySurah(req.params.surah);
        res.status(200).json(formatSuccess(ayahs));
    } catch (err) { next(err); }
};

// ✅ NEW: Get a single ayah by surah and ayah number
exports.getSingleAyah = async (req, res, next) => {
    try {
        const { surah, ayah } = req.params;
        
        if (!surah || !ayah) {
            return res.status(400).json(formatError("surah and ayah params are required."));
        }

        const ayahData = await AyahModel.getAyah(surah, ayah);
        
        if (!ayahData) {
            return res.status(404).json(formatError(`Ayah ${surah}:${ayah} not found.`));
        }

        res.status(200).json(formatSuccess(ayahData));
    } catch (err) { next(err); }
};

exports.getAyahContext = async (req, res, next) => {
    try {
        const { surah, ayah } = req.query;
        if (!surah || !ayah) {
            return res.status(400).json(formatError("surah and ayah query params are required."));
        }
        const context = await AyahModel.getAyahContext(surah, ayah);
        res.status(200).json(formatSuccess(context));
    } catch (err) { next(err); }
};

exports.getPageDetails = async (req, res, next) => {
    try {
        const { page } = req.query;
        if (!page) return res.status(400).json(formatError("page query param is required."));
        const details = await AyahModel.getPageDetails(page);
        if (!details) return res.status(404).json(formatError("Page not found."));
        res.status(200).json(formatSuccess(details));
    } catch (err) { next(err); }
};

// FIX: was "getJuzzPages" in routes but "getJuzPages" in controller — unified to getJuzPages
exports.getJuzPages = async (req, res, next) => {
    try {
        const { juz } = req.query;
        if (!juz) return res.status(400).json(formatError("juz query param is required."));
        const pages = await AyahModel.getPagesByJuz(juz);
        res.status(200).json(formatSuccess(pages.map((p) => p.page)));
    } catch (err) { next(err); }
};

exports.getPagesInRange = async (req, res, next) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json(formatError("start and end query params are required."));
        }
        const pages = await AyahModel.getPagesInRange(start, end);
        res.status(200).json(formatSuccess(pages));
    } catch (err) { next(err); }
};

exports.getAyahsByPage = async (req, res, next) => {
    try {
        const { surah } = req.params;
        const ayahs = await AyahModel.getFullAyahsBySurah(surah);
        res.status(200).json(formatSuccess(ayahs));
    } catch (err) { next(err); }
};

exports.getFirstWords = async (req, res, next) => {
    try {
        const { surah } = req.params;
        const surahNum  = parseInt(surah);
        const ayahs     = await AyahModel.getFullAyahsBySurah(surah);

        // Ayah 0 = Bismillah header — only counted in Surah 1 (Al-Fatihah)
        // Surah 9 (At-Tawbah) has no Bismillah at all
        const filtered = ayahs.filter(a =>
            surahNum === 1 ? true : a.ayah !== 0
        );

        const withFirstWords = filtered.map(a => ({
            ayah:      a.ayah,
            text:      a.text,
            firstWord: extractFirstWord(a.text),  // FIX: skip Quranic symbols
        }));

        res.status(200).json(formatSuccess(withFirstWords));
    } catch (err) { next(err); }
};

// GET /api/ayah/page/:page/full  — ALL ayahs on a specific page (for page sequence)
exports.getPageFull = async (req, res, next) => {
    try {
        const { page } = req.params;
        if (!page) return res.status(400).json(formatError("page param required."));
  
        const ayahs = await AyahModel.getAyahsByPage(page);
        if (!ayahs || ayahs.length === 0) return res.status(404).json(formatError("No ayahs found for this page."));
  
        // Return as flat list of all ayahs on this page
        const withFirstWords = ayahs.map(a => ({
            ayah:      `${a.surah}:${a.ayah}`,
            text:      a.text,
            firstWord: extractFirstWord(a.text),  // FIX: skip Quranic symbols
        }));
  
        res.status(200).json(formatSuccess({
            page:       Number(page),
            totalAyahs: ayahs.length,
            ayahs:      withFirstWords,
        }));
    } catch (err) { next(err); }
};
 
// GET /api/ayah/:surah/full  — all ayahs for a surah with full data
exports.getSurahFull = async (req, res, next) => {
    try {
        const { surah } = req.params;
        const ayahs = await AyahModel.getFullAyahsBySurah(surah);
        if (!ayahs || ayahs.length === 0) return res.status(404).json(formatError("Surah not found."));
  
        const withFirstWords = ayahs.map(a => ({
            ayah:      a.ayah,
            text:      a.text,
            firstWord: extractFirstWord(a.text),  // FIX: skip Quranic symbols
        }));
  
        res.status(200).json(formatSuccess({
            surah:      Number(surah),
            totalAyahs: ayahs.length,
            ayahs:      withFirstWords,
        }));
    } catch (err) { next(err); }
};
 
// GET /api/ayah/juz/:juz/full  — FIRST AYAH OF EACH PAGE in a Juz (Sipara)
// Used for memorization sequences like "Juz 1" or "Sipara 1"
exports.getJuzFull = async (req, res, next) => {
    try {
        const { juz } = req.params;
        const pageFirstAyahs = await AyahModel.getFirstAyahOfEachPageInJuz(juz);
        
        if (!pageFirstAyahs || pageFirstAyahs.length === 0) {
            return res.status(404).json(formatError("Juz not found."));
        }
  
        const withFirstWords = pageFirstAyahs.map(a => ({
            ayah:      `${a.surah}:${a.ayah}`,
            text:      a.text,
            firstWord: extractFirstWord(a.text),  // FIX: skip Quranic symbols
            page:      a.page,
        }));
  
        res.status(200).json(formatSuccess({
            juz:        Number(juz),
            totalPages: pageFirstAyahs.length,
            ayahs:      withFirstWords,
        }));
    } catch (err) { next(err); }
};
