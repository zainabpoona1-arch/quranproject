const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getAuthHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export function detectIntent(text) {
  const t = text.toLowerCase();
  const pageMatch = text.match(/\b(?:page|pg\.?)\s*(?:number\s*)?(\d{1,3})\b/i);
  const surahNumMatch =
    text.match(/\bsurah\s+(\d{1,3})\b/i) ||
    text.match(/\bsurah\s+[\w-]+\s*\((\d{1,3})\)/i) ||
    text.match(/\((\d{1,3})\)/);
  const ayahMatch =
    text.match(/\b(\d{1,3})\s*[:/]\s*(\d{1,3})\b/) ||
    text.match(/surah\s*(\d{1,3})\s*ayah\s*(\d{1,3})/i);
  const juzMatch = text.match(/\b(?:juz|juzz|para|sipara|siparah)\s*(\d{1,2})\b/i);
  const marhalaMatch = text.match(/marhala\s+(\w+)/i);

  const allAyahPairs = [];
  const ayahRegex = /\b(\d{1,3})\s*[:/]\s*(\d{1,3})\b/g;
  let am;
  while ((am = ayahRegex.exec(text)) !== null) {
    allAyahPairs.push({ surah: parseInt(am[1]), ayah: parseInt(am[2]) });
  }

  const wantsFlashcards = /flashcard|flash card/i.test(t);
  const wantsSequence   = /sequence|order|arrange|flow|chain|first word/i.test(t);
  const wantsSimilar    = /similar|mutasha|confus|mix|same|like|tip.*remember|remember.*tip/i.test(t);
  const wantsSchedule   = /schedule|plan|daily|routine|when|time/i.test(t);
  const wantsWeak       = /weak|struggle|difficult|hard|forget|revise|revision/i.test(t);

  return {
    pageNum:  pageMatch    ? parseInt(pageMatch[1])                                          : null,
    surahNum: surahNumMatch ? parseInt(surahNumMatch[surahNumMatch.length - 1])              : null,
    ayahNum:  ayahMatch    ? parseInt(ayahMatch[2])                                          : null,
    juzNum:   juzMatch     ? parseInt(juzMatch[1])                                           : null,
    marhala:  marhalaMatch ? marhalaMatch[1]                                                 : null,
    allAyahPairs: allAyahPairs.length > 0
      ? allAyahPairs
      : (ayahMatch ? [{ surah: parseInt(ayahMatch[1]), ayah: parseInt(ayahMatch[2]) }] : []),
    wantsFlashcards,
    wantsSequence,
    wantsSimilar,
    wantsSchedule,
    wantsWeak,
  };
}

async function fetchPageData(pageNum) {
  try {
    const res  = await fetch(`${API_BASE}/ayah/page/${pageNum}/full`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) { 
    console.error("fetchPageData error:", e);
    return null;
  }
}

async function fetchSurahData(surahNum) {
  try {
    const res  = await fetch(`${API_BASE}/ayah/${surahNum}/full`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) { 
    console.error("fetchSurahData error:", e);
    return null;
  }
}

async function fetchJuzData(juzNum) {
  try {
    const res  = await fetch(`${API_BASE}/ayah/juz/${juzNum}/full`, { headers: getAuthHeader() });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (e) { 
    console.error("fetchJuzData error:", e);
    return null;
  }
}

async function fetchSimilarityData(surah, ayah, marhala) {
  try {
    let url = `${API_BASE}/similarity?surah=${surah}&ayah=${ayah}`;
    if (marhala) url += `&marhala=${encodeURIComponent(marhala)}`;
    const res  = await fetch(url, { headers: getAuthHeader() });
    const json = await res.json();
    return json.success && json.data ? json.data : null;
  } catch (e) { 
    console.error("fetchSimilarityData error:", e);
    return null;
  }
}

function formatPageContext(data) {
  try {
    if (!data) return "";
    return `=== PAGE ${data.page || "N/A"} DATA ===\nPage data loaded.`;
  } catch (e) {
    console.error("formatPageContext error:", e);
    return "";
  }
}

function formatSurahContext(data) {
  try {
    if (!data) return "";
    return `=== SURAH ${data.name || data.surah || "N/A"} DATA ===\nSurah data loaded.`;
  } catch (e) {
    console.error("formatSurahContext error:", e);
    return "";
  }
}

function formatSimilarityContext(data, surah, ayah) {
  try {
    if (!data) return "";
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      return `=== SIMILARITY DATA FOR ${surah}:${ayah} ===\nNo similarity pairs found.`;
    }
    
    let output = `=== SIMILARITY DATA FOR ${surah}:${ayah} ===\nFound ${data.results.length} similar pairs.\n`;
    return output;
  } catch (e) {
    console.error("formatSimilarityContext error:", e);
    return `=== SIMILARITY DATA FOR ${surah}:${ayah} ===\nError loading similarity data.`;
  }
}

function formatJuzContext(data) {
  try {
    if (!data) return "";
    return `=== JUZ ${data.juz || "N/A"} DATA ===\nJuz data loaded.`;
  } catch (e) {
    console.error("formatJuzContext error:", e);
    return "";
  }
}

export async function buildQuranContext(userText) {
  try {
    const intent   = detectIntent(userText);
    const sections = [];
    const fetches  = [];

    if (intent.pageNum && intent.pageNum >= 1 && intent.pageNum <= 604) {
      fetches.push(
        fetchPageData(intent.pageNum).then(data => {
          try {
            if (data) sections.push(formatPageContext(data));
          } catch (e) {
            console.error("Error in page section:", e);
          }
        }).catch(e => console.error("Page fetch error:", e))
      );
    }

    if (intent.surahNum && intent.surahNum >= 1 && intent.surahNum <= 114) {
      fetches.push(
        fetchSurahData(intent.surahNum).then(data => {
          try {
            if (data) sections.push(formatSurahContext(data));
          } catch (e) {
            console.error("Error in surah section:", e);
          }
        }).catch(e => console.error("Surah fetch error:", e))
      );
    }

    if (intent.wantsFlashcards && intent.allAyahPairs.length > 0) {
      const uniqueSurahs = [...new Set(intent.allAyahPairs.map(p => p.surah))]
        .filter(s => s !== intent.surahNum && s >= 1 && s <= 114);
      for (const s of uniqueSurahs) {
        fetches.push(
          fetchSurahData(s).then(data => {
            try {
              if (data) sections.push(formatSurahContext(data));
            } catch (e) {
              console.error("Error in surah section:", e);
            }
          }).catch(e => console.error("Surah fetch error:", e))
        );
      }
    }

    if (intent.wantsSimilar) {
      if (intent.allAyahPairs.length > 0) {
        for (const pair of intent.allAyahPairs) {
          if (pair.surah >= 1 && pair.surah <= 114) {
            fetches.push(
              fetchSimilarityData(pair.surah, pair.ayah, intent.marhala).then(data => {
                try {
                  if (data) sections.push(formatSimilarityContext(data, pair.surah, pair.ayah));
                } catch (e) {
                  console.error("Error in similarity section:", e);
                }
              }).catch(e => console.error("Similarity fetch error:", e))
            );
          }
        }
      } else if (intent.surahNum) {
        const ayah = intent.ayahNum || 1;
        fetches.push(
          fetchSimilarityData(intent.surahNum, ayah, intent.marhala).then(data => {
            try {
              if (data) sections.push(formatSimilarityContext(data, intent.surahNum, ayah));
            } catch (e) {
              console.error("Error in similarity section:", e);
            }
          }).catch(e => console.error("Similarity fetch error:", e))
        );
      }
    }

    if (intent.juzNum && intent.juzNum >= 1 && intent.juzNum <= 30) {
      fetches.push(
        fetchJuzData(intent.juzNum).then(data => {
          try {
            if (data) sections.push(formatJuzContext(data));
          } catch (e) {
            console.error("Error in juz section:", e);
          }
        }).catch(e => console.error("Juz fetch error:", e))
      );
    }

    await Promise.all(fetches);
    return { context: sections.join("\n\n"), intent };
  } catch (e) {
    console.error("[buildQuranContext] Fatal error:", e);
    return { context: "", intent: {} };
  }
}
