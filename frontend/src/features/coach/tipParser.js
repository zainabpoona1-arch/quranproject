// ════════════════════════════════════════════════════════════════════
// frontend/src/features/coach/tipParser.js
// Parses [TIP:id] blocks from AI response, saves to DB, returns clean text
// ════════════════════════════════════════════════════════════════════

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getAuthHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Parse [TIP:similarityId] blocks from AI text, save each tip to the DB,
 * and return cleaned display text + the list of pairs that got tips saved.
 *
 * Supported formats:
 *
 * Format A (preferred — explicit open/close tags):
 *   [TIP:8265]
 *   Tip text here...
 *   [/TIP]
 *
 * Format B (single-line, no closing tag):
 *   [TIP:8265] Tip text here
 *
 * Format C (fallback — AI used PAIR1: / PAIR2: labels):
 *   PAIR1: tip text
 *   PAIR2: tip text
 *
 * The backend endpoint is:
 *   PATCH /similarity/by-pair/tips
 *   Body: { source_surah, source_ayah, target_surah, target_ayah, tips: string[] }
 * The backend merges the supplied tips array with any existing tips, so we
 * do NOT need to prefetch existing tips before saving.
 */
export async function parseTipsFromResponse(text, similarityPairs) {
  /** @type {{ similarityId:number, sourceSurah:number, sourceAyah:number, targetSurah:number, targetAyah:number, tip:string }[]} */
  const savedTips = [];
  let cleanedText = text;

  // ── Format A: [TIP:id] … [/TIP] ────────────────────────────────────────────
  const blockRegex = /\[TIP:(\d+)\]\s*([\s\S]*?)\[\/TIP\]/g;
  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const similarityId = parseInt(m[1], 10);
    const tipText      = m[2].trim();
    const pair         = similarityPairs?.find((p) => p.id === similarityId);
    if (pair && tipText) {
      savedTips.push({
        similarityId,
        sourceSurah: pair.source_surah ?? pair.sourceSurah,
        sourceAyah:  pair.source_ayah  ?? pair.sourceAyah,
        targetSurah: pair.target_surah,
        targetAyah:  pair.target_ayah,
        tip:         tipText,
      });
    }
    cleanedText = cleanedText.replace(m[0], `💡 *Tip saved for pair ${similarityId}*`);
  }

  // ── Format B: [TIP:id] single-line (only if Format A found nothing) ─────────
  if (savedTips.length === 0) {
    // Replace already-handled Format A remnants so they don't double-match
    const singleRegex = /\[TIP:(\d+)\]\s*([^\[]+?)(?=\[TIP:|\[NAV:|$)/gs;
    let m2;
    const workText = cleanedText; // iterate over already-cleaned text
    while ((m2 = singleRegex.exec(workText)) !== null) {
      const similarityId = parseInt(m2[1], 10);
      const tipText      = m2[2].trim();
      const pair         = similarityPairs?.find((p) => p.id === similarityId);
      if (pair && tipText) {
        savedTips.push({
          similarityId,
          sourceSurah: pair.source_surah ?? pair.sourceSurah,
          sourceAyah:  pair.source_ayah  ?? pair.sourceAyah,
          targetSurah: pair.target_surah,
          targetAyah:  pair.target_ayah,
          tip:         tipText,
        });
        cleanedText = cleanedText.replace(m2[0], `💡 *Tip saved for pair ${similarityId}*\n`);
      }
    }
  }

  // ── Format C: PAIR1: … PAIR2: … (AI deviated from instructions) ────────────
  if (savedTips.length === 0 && similarityPairs?.length > 0) {
    const pairRegex = /PAIR(\d+):\s*(.+?)(?=PAIR\d+:|$)/gs;
    let pm;
    while ((pm = pairRegex.exec(text)) !== null) {
      const idx  = parseInt(pm[1], 10) - 1; // PAIR1 → index 0
      const tip  = pm[2].trim();
      const pair = similarityPairs[idx];
      if (pair && tip) {
        savedTips.push({
          similarityId: pair.id,
          sourceSurah:  pair.source_surah ?? pair.sourceSurah,
          sourceAyah:   pair.source_ayah  ?? pair.sourceAyah,
          targetSurah:  pair.target_surah,
          targetAyah:   pair.target_ayah,
          tip,
        });
      }
    }
    if (savedTips.length > 0) {
      cleanedText = text.replace(/PAIR\d+:\s*.+?(?=PAIR\d+:|$)/gs, "").trim();
      cleanedText += `\n\n✅ ${savedTips.length} tip(s) saved to the Mutashabihat page.`;
    }
  }

  // ── Save all found tips to DB via PATCH /similarity/by-pair/tips ────────────
  // The backend merges supplied tips with existing ones — no prefetch needed.
  const navPairs = [];

  await Promise.allSettled(
    savedTips.map(async (saved) => {
      try {
        const res = await fetch(`${API_BASE}/similarity/by-pair/tips`, {
          method:  "PATCH",
          headers: getAuthHeader(),
          body:    JSON.stringify({
            source_surah: saved.sourceSurah,
            source_ayah:  saved.sourceAyah,
            target_surah: saved.targetSurah,
            target_ayah:  saved.targetAyah,
            tips:         [saved.tip],   // backend merges; send just the new tip
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.error("Tip save failed:", errJson);
          return;
        }

        navPairs.push({
          sourceSurah: saved.sourceSurah,
          sourceAyah:  saved.sourceAyah,
          targetSurah: saved.targetSurah,
          targetAyah:  saved.targetAyah,
          tip:         saved.tip,
        });
      } catch (e) {
        console.error("Failed to save tip:", saved.similarityId, e);
      }
    })
  );

  return { cleanedText, navPairs, count: savedTips.length };
}