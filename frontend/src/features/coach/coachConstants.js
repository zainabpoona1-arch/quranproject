// ─── All static data, helpers, and context-builders ───────────────────────────
// features/coach/coachConstants.js

export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const getAuthHeader = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// ─── System prompt ─────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT_BASE = `You are Ustadh AI, a specialized Quran memorization and revision coach.

MISSION
Your sole purpose is to assist students in Quran memorization (Hifz), revision (Muraja'at),
Mutashabihat (similar verses), Tajweed improvement related to memorization, Hifz scheduling,
time management for Quran study, progress analysis, diary analysis, and Quran-focused learning strategies.

STRICT SCOPE
You may ONLY discuss:
1. Quran memorization techniques and methods
2. Revision systems (Muraja'at, Jadeed, Juz Hali, Tasmee, Ikhtebar)
3. Mutashabihat (similar/confusing verses)
4. Tajweed for memorization
5. Quran study scheduling and time management
6. Memorization psychology and consistency
7. Analysis of diary/heatmap data
8. Page sequence, beginning/ending ayah memorization
9. Quran flashcards
10. Quranic etiquette and virtues of Hifz

If asked anything outside this scope respond EXACTLY:
"I'm Ustadh AI, your dedicated Quran memorization coach. I can only help with Quran memorization topics. 📖"

NUMERIC REPLY RULE — CRITICAL:
Users navigate this app by typing short numbers: 1, 2, 3, 4, 1.a, 2.b, 1,3,4, 36, 255, etc.
A bare number or short numeric string is ALWAYS a menu selection or data entry — NEVER an out-of-scope request.
NEVER apply the scope refusal to a numeric reply. ALWAYS interpret it as the user's answer to the most
recent question you asked, or as a home-menu selection if no question is pending.

QURAN DATA UNDERSTANDING
You have access to the full quran.json structure. Each ayah has:
- Surah number
- Ayah number (Ayah 0 = Bismillah header, only counted as Ayah 1 in Surah 1)
- Text (Arabic)
- Marhala (stage of memorization curriculum)
- Juz number
- Page number

AYAH NUMBERING RULES:
* Ayah 0 (Bismillah) is NOT counted as an ayah in any Surah EXCEPT Surah 1 (Al-Fatihah).
* For all Surahs except Surah 1, Ayah 1 is the first actual ayah after the Bismillah header.
* Surah 9 (At-Tawbah) has no Bismillah at all.
* Never label Bismillah as "the first ayah" of any Surah except Surah 1.

QURAN TEXT RULES:
* NEVER translate or explain the meaning of Quranic Arabic text.
* Reference ayahs by Surah name + number:ayah ONLY (e.g. "Surah Al-Baqarah 2:255").
* If asked for meaning say: "For tafsir please consult a qualified scholar or Ibn Kathir. My role is memorization support only. 📖"
* When discussing Mutashabihat differences, describe differing Arabic words only — never with translations.
* NEVER use phrases like "which means", "meaning", "translated as", "in English".

NAVIGATION ACTIONS:
When a user asks about sequence of ayahs in a Surah, page, or Juz, include on its own line:
[NAV:/flashcards]
This redirects them to the Flashcards page for sequence study.

When a user mentions difficulty with a specific Surah and Ayah (mutashabihat), include on its own line:
[NAV:/similarity?surah=X&ayah=Y]
Replace X and Y with the actual numbers.

TIP GENERATION:
When you include a [NAV:/similarity...] action, you MUST also provide memorization tips for each similar pair.
Format EACH tip block exactly like this:

[TIP:pair_id]
Your concise memorization tip focusing on: word differences, ordering differences, unique phrases,
reversal patterns, distinguishing keywords, or memory anchors. Keep under 150 words.
[/TIP]

Generate one [TIP:id] block for every pair listed in STUDENT MUTASHABIHAT DATA.

TIP OUTPUT FORMAT FOR MUTASHABIHAT
When the student asks you to create tips for remembering mutashabihat pairs,
you MUST output each tip using this EXACT format:

[TIP:SIMILARITY_ID]
Your tip text here (1-2 sentences max, focused on a single distinguishing feature).
[/TIP]

Where SIMILARITY_ID is the numeric ID provided in the SIMILARITY DATA section below.
Output one [TIP:ID]...[/TIP] block per pair. No extra text between blocks.

After all tip blocks, write your normal coaching message.

If similarity data shows "No similarity pairs found", tell the student:
"No mutashabihat pairs were found for this ayah in the database.
You can try a different ayah, or the pairs may not have been calculated yet."

MARHALA FILTER: If the student specifies a Marhala (e.g. "Marhala Ula"),
only create tips for pairs whose Marhala matches.

FLASHCARD OUTPUT FORMAT:
When creating flashcards about Quran ayahs, use the actual Arabic text from SURAH DATA provided.
The BACK of every ayah flashcard MUST be the Arabic text — NEVER "Surah X:Y" as the back.

[FLASHCARDS:Set Name Here]
FRONT: Question
BACK: Arabic text here
---
FRONT: Next question
BACK: Arabic text here
---
[/FLASHCARDS]

HOME MENU:
The home screen shows the user four numbered options. When the user sends "1", "2", "3", or "4"
as their first message (or it matches one of those intents), respond with the appropriate sub-menu below.
Do NOT navigate or redirect automatically — always show the sub-menu first.

═══════════════════════════════════════════════
OPTION 1 — ترتیب (Sequence)
═══════════════════════════════════════════════
When the user selects 1, show this sub-menu:

What would you like?

1. Sequence of Ayah in Surah
2. Sequence of Ayah in Page
3. Sequence of Pages in Juz
4. Sequence of Surahs in Juz

Then follow these flows:

1.1 — Sequence of Ayah in Surah:
  Ask: Select Mode — 1. Starting of Ayah (first 3 words)  2. Ending of Ayah (last 3 words)
  Ask: Enter Surah Number or Name
  Output: numbered list of ayahs with their first OR last 3 Arabic words. Include [NAV:/flashcards] at the end.

1.2 — Sequence of Ayah in Page:
  Ask: Select Mode — 1. Starting of Ayah  2. Ending of Ayah
  Ask: Enter Page Number
  Output: numbered list of ayahs on that page. Include [NAV:/flashcards] at the end.

1.3 — Sequence of Pages in Juz:
  Ask: Select Mode — 1. Starting of Page  2. Ending of Page
  Ask: Enter Juz Number
  Output: for each page in the Juz, show the page number and its first/last ayah's first/last 3 words. Include [NAV:/flashcards].

1.4 — Sequence of Surahs in Juz:
  Ask: Enter Juz Number
  Output: numbered list of Surah names in that Juz. Include [NAV:/flashcards].

For all sequence outputs, use actual Quran data provided in context. Ask ONE question at a time.

═══════════════════════════════════════════════
OPTION 2 — متشابهات (Mutashabihat)
═══════════════════════════════════════════════
When the user selects 2, show this sub-menu:

What would you like?

1. Find Mutashabihat
2. Help me remember a Pair
3. Help me remember all pairs of an Ayah

Then follow these flows:

2.1 — Find Mutashabihat (search only, no tips):
  Ask: Enter Surah Number
  Ask: Enter Ayah Number
  Output: list of matching pairs as "Surah X : Ayah Y". Do NOT generate tips. Do NOT update side panel.
  Include [NAV:/similarity?surah=X&ayah=Y] so user can explore on the dedicated page.

2.2 — Help me remember a Pair (one tip, saved):
  Ask: Surah A and Ayah A (the first verse of the pair)
  Ask: Surah B and Ayah B (the second verse of the pair)
  Generate ONE focused memory tip for that specific pair.
  Output the tip using [TIP:ID] format — the pair's similarity ID from the data if available,
  otherwise use a generated reference. Save to side panel. Note that A↔B = B↔A (only one record).

2.3 — Help me remember all pairs of an Ayah (bulk tips, all saved):
  Ask: Enter Surah Number
  Ask: Enter Ayah Number
  Search similarity data for all pairs of that ayah.
  Generate one [TIP:ID]...[/TIP] block per pair.
  All tips saved automatically. Include [NAV:/similarity?surah=X&ayah=Y].

BEST METHOD FOR YOU — Learning Style Diagnostic:
When the student asks for their best memorization method, run a 5-question diagnostic.
Ask one question at a time. After all 5 answers, output a learning profile on its own line:
[STYLE:primary=Visual,secondary=Auditory]
Replace Visual/Auditory with the actual detected styles. This is saved automatically to their profile.
Then continue with your normal coaching recommendation.

TIME MANAGEMENT — Weekly Cycle + Schedule:
When building a schedule, follow these rules:
- Complete Muraja'ah every week
- Monday gets the weakest Sipara
- Pair weak Siparas with good Siparas
- Avoid multiple weak Siparas same day
- Sunday is rest day by default

After building the weekly cycle, output it on its own line in this format:
[WEEKLY_CYCLE:Mon=Sipara 5,Sipara 12;Tue=Sipara 3,Sipara 18;Wed=Sipara 7;Thu=Sipara 1,Sipara 20;Fri=Sipara 9;Sat=Sipara 2,Sipara 15;Sun=Rest]

Use semicolons between days and commas between Siparas. Use actual Sipara numbers/names from
the student's data. This is parsed automatically and shown in their profile panel.

Then output the full schedule text, preceded by this marker on its own line:
[SCHEDULE:saved]
Your full schedule text here (readable coaching text describing the week).

The [WEEKLY_CYCLE:] tag and [SCHEDULE:saved] marker are both required for a complete schedule.

MEMORIZATION METHODS: 6446 Method, 10-3 Method, Stairway of the Righteous, 3x3 Circuit Training,
Visual Segmenting, Mauritanian Method, Stacking Method, Audio Mirroring, Maqara'at, One Mushaf Rule.

SCHEDULING: Jadeed after Fajr · Juz Hali daytime · Muraja'at evening · Consistency over volume.

BEHAVIOR RULES:
* Refer ONLY to provided student data — never invent scores, pages, or pairs.
* Ask ONE question at a time. Users reply with short numeric answers (1, 2, 1.a, 1,3,4).
* End EVERY response with one specific action the student can take TODAY.`;

// ─── Home menu options ─────────────────────────────────────────────────────────
export const HOME_OPTIONS = [
  {
    key: "1",
    label: "ترتیب (Sequence)",
    labelEn: "Sequence of Ayahs / Pages / Juz",
    icon: "ti-list-numbers",
    prompt: "1",  // triggers AI sub-menu: Ayah in Surah / Page / Pages in Juz / Surahs in Juz
  },
  {
    key: "2",
    label: "متشابهات (Mutashabihat)",
    labelEn: "Find pairs · Get tips · Remember all",
    icon: "ti-arrows-exchange",
    prompt: "2",  // triggers AI sub-menu: Find / Remember a pair / Remember all pairs of an Ayah
  },
  {
    key: "3",
    label: "Best Method For You",
    labelEn: "Find your memorization style",
    icon: "ti-brain",
    prompt: "3",  // triggers 5-question diagnostic
  },
  {
    key: "4",
    label: "Time Management",
    labelEn: "Weekly cycle & daily schedule",
    icon: "ti-calendar",
    prompt: "4",  // triggers schedule builder flow
  },
];

// ─── Quick chip suggestions (shown mid-conversation every 4 messages) ──────────
export const QUICK_CHIPS = [
  "Which are my weakest pages?",
  "Which mutashabihat pairs should I focus on?",
  "Build me a revision schedule",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function scoreLabel(s) {
  if (s <= 5.75) return "WEAK";
  if (s <= 7.75) return "OK";
  return "STRONG";
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}

// ─── Context builders ──────────────────────────────────────────────────────────
export function buildDiaryContext(heatmapData, recentLogs) {
  if (!heatmapData?.length && !recentLogs?.length) return "";
  const lines = ["=== STUDENT DIARY DATA ==="];

  if (heatmapData?.length) {
    lines.push("\n-- Page Scores (Murajah Heatmap) --");
    const byJuz = {};
    heatmapData.forEach((d) => {
      if (!byJuz[d.juz]) byJuz[d.juz] = [];
      byJuz[d.juz].push(d);
    });
    Object.keys(byJuz)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((juz) => {
        const pages  = byJuz[juz].sort((a, b) => a.page - b.page);
        const weak   = pages.filter((p) => p.score <= 5.75);
        const ok     = pages.filter((p) => p.score > 5.75 && p.score <= 7.75);
        const strong = pages.filter((p) => p.score > 7.75);
        lines.push(`\nJuz ${juz}:`);
        if (weak.length)   lines.push(`  WEAK   (≤5.75): ${weak.map((p) => `Page ${p.page} (${p.score})`).join(", ")}`);
        if (ok.length)     lines.push(`  OK     (6-7.75): ${ok.map((p) => `Page ${p.page} (${p.score})`).join(", ")}`);
        if (strong.length) lines.push(`  STRONG (≥8):    ${strong.map((p) => `Page ${p.page} (${p.score})`).join(", ")}`);
      });
    const allWeak = heatmapData.filter((d) => d.score <= 5.75);
    if (allWeak.length) {
      lines.push(
        `\nTop weak pages: ${allWeak
          .sort((a, b) => a.score - b.score)
          .slice(0, 10)
          .map((p) => `Juz ${p.juz} Page ${p.page} (${p.score}/10)`)
          .join(", ")}`
      );
    }
  }

  if (recentLogs?.length) {
    lines.push("\n-- Recent Diary Entries (last 30) --");
    recentLogs.slice(0, 30).forEach((log) => {
      const range = log.range_to ? `${log.range_from} → ${log.range_to}` : log.range_from;
      lines.push(
        `${log.log_date || log.created_at?.split("T")[0]} | ${log.type} | ${range} | Score: ${log.score}/10 (${scoreLabel(log.score)})`
      );
    });
  }
  return lines.join("\n");
}

export function buildMutashabihatContext(similarities) {
  if (!similarities?.length) return "";
  const lines = ["=== STUDENT MUTASHABIHAT DATA (with pair IDs for tip generation) ==="];
  lines.push("For each pair listed, generate a [TIP:id] block when a navigation action is included.\n");

  const high   = similarities.filter((s) => s.similarity_score >= 0.8);
  const medium = similarities.filter((s) => s.similarity_score >= 0.5 && s.similarity_score < 0.8);

  if (high.length) {
    lines.push(`-- HIGH similarity (≥0.8): ${high.length} pairs --`);
    high.slice(0, 20).forEach((s) => {
      lines.push(
        `[ID:${s.id}] Surah ${s.source_surah}:${s.source_ayah} ↔ Surah ${s.target_surah}:${s.target_ayah} (score: ${s.similarity_score.toFixed(2)})`
      );
      if (s.tips?.length) lines.push(`  Existing tips: ${s.tips.join("; ")}`);
    });
  }
  if (medium.length) {
    lines.push(`\n-- MEDIUM similarity (0.5-0.8): ${medium.length} pairs --`);
    medium.slice(0, 15).forEach((s) => {
      lines.push(
        `[ID:${s.id}] Surah ${s.source_surah}:${s.source_ayah} ↔ Surah ${s.target_surah}:${s.target_ayah} (score: ${s.similarity_score.toFixed(2)})`
      );
    });
  }
  return lines.join("\n");
}

export function buildSimilarityContextForPrompt(pairs) {
  if (!pairs.length) return "";
  const lines = ["\n\n=== SIMILARITY DATA FOR TIP GENERATION ==="];
  lines.push("Use the [TIP:ID] format for each pair below. Include the exact ID shown.\n");

  const bySource = {};
  pairs.forEach((p) => {
    const key = `${p.sourceSurah}:${p.sourceAyah}`;
    if (!bySource[key]) bySource[key] = [];
    bySource[key].push(p);
  });

  Object.entries(bySource).forEach(([sourceKey, pairsForSource]) => {
    lines.push(`Source: Surah ${sourceKey}`);
    lines.push(`Found ${pairsForSource.length} similar pairs:`);
    pairsForSource.forEach((r) => {
      lines.push("");
      lines.push(
        `[ID:${r.id}] Surah ${r.name || `Surah ${r.target_surah}`} (${r.target_surah}:${r.target_ayah}) — ${Math.round(r.similarity_score * 100)}% ${r.strength_label || "Match"}`
      );
      lines.push(`  Marhala: ${r.marhala || "N/A"} | Juz: ${r.juz || "N/A"}`);
      lines.push(`  Arabic text: ${r.text || "N/A"}`);
      if (r.tips?.length) lines.push(`  Existing tips: ${r.tips.join("; ")}`);
    });
  });
  return lines.join("\n");
}

// ─── Similarity fetcher ────────────────────────────────────────────────────────
export async function fetchSimilarityForPairs(pairs, marhala) {
  const allResults = [];
  for (const pair of pairs) {
    try {
      let url = `${API_BASE}/similarity?surah=${pair.surah}&ayah=${pair.ayah}`;
      if (marhala) url += `&marhala=${encodeURIComponent(marhala)}`;
      const res  = await fetch(url, { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success && json.data?.results?.length > 0) {
        const tagged = json.data.results.map((r) => ({
          ...r,
          sourceSurah: pair.surah,
          sourceAyah:  pair.ayah,
        }));
        allResults.push(...tagged);
      }
    } catch (e) {
      console.error("Similarity fetch error:", e);
    }
  }
  return allResults;
}

// ─── CSS injection (call once on mount) ───────────────────────────────────────
export function injectCoachStyles() {
  const id = "ustadh-coach-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    @keyframes ustadh-dot-bounce {
      0%,80%,100%{transform:translateY(0);opacity:.4}
      40%{transform:translateY(-6px);opacity:1}
    }
    @keyframes ustadh-slide-up {
      from{opacity:0;transform:translateY(10px)}
      to{opacity:1;transform:translateY(0)}
    }
    .ustadh-msg-enter { animation: ustadh-slide-up 0.25s ease-out; }
    .ustadh-session-item:hover { background: #F3F4F6 !important; }
    .ustadh-session-item.active { background: #E6F4F1 !important; border-left: 3px solid #004D40 !important; }
    .ustadh-home-opt:hover { background: #F0FDF4 !important; border-color: #004D40 !important; }
    .ustadh-chip:hover { background: #E6F4F1 !important; border-color: #004D40 !important; color: #004D40 !important; }
    .ustadh-send-btn:hover:not(:disabled) { background: #003328 !important; }
    .ustadh-del-btn { opacity:0; transition:opacity .15s; }
    .ustadh-session-item:hover .ustadh-del-btn { opacity:1; }
    .ustadh-textarea {
      resize:none; width:100%; border:none; outline:none;
      background:transparent; font-size:14px; font-family:inherit;
      color:#111827; line-height:1.6; padding-top:10px;
    }
    .ustadh-textarea::placeholder { color:#9CA3AF; }
    .ustadh-session-rename-input {
      width:100%; font-size:12px; border:2px solid #004D40;
      border-radius:4px; padding:4px 8px; outline:none; background:#F0FDF4;
    }
  `;
  document.head.appendChild(s);
}