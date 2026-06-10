// features/coach/CoachPage.jsx
// ─── Main orchestrator — all state, API calls, and layout ─────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildQuranContext } from "./quranContextBuilder";
import { parseTipsFromResponse } from "./tipParser";

import {
  API_BASE,
  getAuthHeader,
  SYSTEM_PROMPT_BASE,
  HOME_OPTIONS,
  buildDiaryContext,
  buildMutashabihatContext,
  buildSimilarityContextForPrompt,
  fetchSimilarityForPairs,
  injectCoachStyles,
} from "./coachConstants";

import {
  TypingIndicator,
  MessageBubble,
  HomeScreen,
  QuickChips,
  NavBanner,
  FlashcardBanner,
} from "./CoachComponents";

import { SessionSidebar, InfoPanel } from "./CoachSidebar";

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CoachPage() {
  const navigate = useNavigate();

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages,          setMessages]          = useState([]);
  const [input,             setInput]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");

  // ── Session state ───────────────────────────────────────────────────────────
  const [sessions,          setSessions]          = useState([]);
  const [activeSessionId,   setActiveSessionId]   = useState(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [infoPanelOpen,     setInfoPanelOpen]     = useState(true);
  const [navigating,        setNavigating]        = useState(false);
  const [flashcardSaved,    setFlashcardSaved]    = useState(null);

  // ── Data from API ───────────────────────────────────────────────────────────
  const [heatmapData,       setHeatmapData]       = useState([]);
  const [recentLogs,        setRecentLogs]        = useState([]);
  const [similarities,      setSimilarities]      = useState([]);
  const [dataLoaded,        setDataLoaded]        = useState(false);
  const [remainingMessages, setRemainingMessages] = useState(null);
  const [isUnlimited,       setIsUnlimited]       = useState(false);

  // ── Side panel state (persisted across messages in this session) ─────────────
  const [learningStyle,     setLearningStyle]     = useState(null);   // { primary, secondary }
  const [progress,          setProgress]          = useState(null);   // { marhala, sipara, page, totalPages, percent }
  const [weeklyCycle,       setWeeklyCycle]       = useState([]);     // [{ day, siparas }]
  const [latestSchedule,    setLatestSchedule]    = useState(null);   // { text, generatedAt }
  const [memoryTips,        setMemoryTips]        = useState([]);     // [{ pair, text }]

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  // ── CSS injection ───────────────────────────────────────────────────────────
  useEffect(() => { injectCoachStyles(); }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Load all data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [heatRes, logsRes, simRes, remRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/heatmap`,                         { headers: getAuthHeader() }),
          fetch(`${API_BASE}/analytics/deep-dive?type=murajah&range=1m`, { headers: getAuthHeader() }),
          fetch(`${API_BASE}/similarity?surah=2&ayah=1`,                 { headers: getAuthHeader() }),
          fetch(`${API_BASE}/coach/remaining`,                            { headers: getAuthHeader() }),
        ]);
        const [heatJson, logsJson, simJson, remJson] = await Promise.all([
          heatRes.json(), logsRes.json(), simRes.json(), remRes.json(),
        ]);
        if (heatJson.success) setHeatmapData(heatJson.data || []);
        if (logsJson.success) setRecentLogs(logsJson.data || []);
        if (simJson.success)  setSimilarities(simJson.data?.results || []);
        if (remJson.success) {
          setRemainingMessages(remJson.data.remaining);
          setIsUnlimited(remJson.data.unlimited);
        }
      } catch (e) { console.error("Data load error:", e); }
      finally { setDataLoaded(true); }
    };
    load();
  }, []);

  // ── Sessions ────────────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/coach/sessions`, { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) setSessions(json.data || []);
    } catch (e) { console.error("Sessions fetch error:", e); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadSession = useCallback(async (sessionId) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    setError("");
    setInput("");
    try {
      const res  = await fetch(`${API_BASE}/coach/sessions/${sessionId}/messages`, { headers: getAuthHeader() });
      const json = await res.json();
      if (json.success) {
        setMessages(json.data.map((m) => ({
          role:      m.role,
          content:   m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        })));
      }
    } catch (e) { console.error("Load session error:", e); }
  }, []);

  const createSession = useCallback(async (title = "New Session") => {
    try {
      const res  = await fetch(`${API_BASE}/coach/sessions`, {
        method: "POST", headers: getAuthHeader(),
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => [json.data, ...prev]);
        setActiveSessionId(json.data.id);
        setMessages([]);
        setError("");
        setInput("");
        return json.data.id;
      }
    } catch (e) { console.error("Create session error:", e); }
    return null;
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await fetch(`${API_BASE}/coach/sessions/${sessionId}`, { method: "DELETE", headers: getAuthHeader() });
      await loadSessions();
      if (activeSessionId === sessionId) { setActiveSessionId(null); setMessages([]); }
    } catch (e) { console.error("Delete session error:", e); }
  }, [activeSessionId, loadSessions]);

  const renameSession = useCallback((sessionId, newTitle) => {
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, title: newTitle } : s));
  }, []);

  const saveMessage = useCallback(async (sessionId, role, content) => {
    try {
      await fetch(`${API_BASE}/coach/sessions/${sessionId}/messages`, {
        method: "POST", headers: getAuthHeader(),
        body: JSON.stringify({ role, content }),
      });
    } catch (e) { console.error("Save message error:", e); }
  }, []);

  // ── Special-block parsers ───────────────────────────────────────────────────

  /**
   * Extract [STYLE:primary=X,secondary=Y] and save to the info panel.
   * Returns the text with the tag removed.
   */
  const parseStyleBlock = useCallback((text) => {
    const match = text.match(/\[STYLE:([^\]]+)\]/);
    if (!match) return text;
    const parts = {};
    match[1].split(",").forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k && v) parts[k.trim()] = v.trim();
    });
    if (parts.primary) setLearningStyle({ primary: parts.primary, secondary: parts.secondary || null });
    return text.replace(match[0], "").trim();
  }, []);

  /**
   * Extract [WEEKLY_CYCLE:Mon=Sipara 5,Sipara 12;Tue=…] and populate weeklyCycle.
   * Returns the text with the tag removed.
   *
   * Format: day=Sipara A,Sipara B — days separated by semicolons.
   */
  const parseWeeklyCycleBlock = useCallback((text) => {
    const match = text.match(/\[WEEKLY_CYCLE:([^\]]+)\]/);
    if (!match) return text;

    const cycle = [];
    const daySegments = match[1].split(";");
    daySegments.forEach((segment) => {
      const eqIdx = segment.indexOf("=");
      if (eqIdx === -1) return;
      const day     = segment.slice(0, eqIdx).trim();
      const siparas = segment.slice(eqIdx + 1).split(",").map((s) => s.trim()).filter(Boolean);
      if (day && siparas.length) cycle.push({ day, siparas });
    });

    if (cycle.length) setWeeklyCycle(cycle);
    return text.replace(match[0], "").trim();
  }, []);

  /**
   * Extract [SCHEDULE:saved] and save the schedule text that follows it to the
   * info panel. Only the text between the marker and the next double newline
   * (or end of string) is treated as the schedule body — the rest of the
   * coaching message is preserved unchanged.
   *
   * Returns the full text with the marker stripped (schedule text stays inline).
   */
  const parseScheduleBlock = useCallback((text) => {
    const markerRegex = /\[SCHEDULE:saved\]\n?/;
    const match = text.match(markerRegex);
    if (!match) return text;

    // Everything after the marker
    const afterMarker = text.slice(match.index + match[0].length);

    // The schedule body ends at the first blank line (paragraph break) or EOS.
    // This means a coaching sign-off that follows a blank line is NOT included.
    const doubleNewline = afterMarker.search(/\n\s*\n/);
    const scheduleBody  = doubleNewline !== -1
      ? afterMarker.slice(0, doubleNewline).trim()
      : afterMarker.trim();

    if (scheduleBody) {
      setLatestSchedule({
        text:        scheduleBody,
        generatedAt: new Date().toLocaleDateString("en-GB"),
      });
    }

    // Strip only the marker tag; keep the schedule text visible in chat
    return text.replace(markerRegex, "").trim();
  }, []);

  /**
   * Extract [FLASHCARDS:…] … [/FLASHCARDS] blocks, resolve ayah references,
   * POST to the flashcard API, and replace the raw block with a confirmation line.
   */
  const parseAndSaveFlashcards = useCallback(async (text) => {
    let match = text.match(/\[FLASHCARDS:([^\]]+)\]([\s\S]*?)\[\/FLASHCARDS\]/);
    if (!match) match = text.match(/\[FLASHCARDS:([^\]]+)\]([\s\S]*?)(?=\n\n[^F]|$)/);
    if (!match) return text;

    const setName    = match[1].trim();
    const rawBlock   = match[2].trim();
    const cardBlocks = rawBlock.split(/\n?---\n?/).map((b) => b.trim()).filter(Boolean);

    let cards = cardBlocks.map((block) => {
      const frontMatch = block.match(/FRONT:\s*([\s\S]+?)(?=\nBACK:|$)/i);
      const backMatch  = block.match(/BACK:\s*([\s\S]+?)$/i);
      return { front: frontMatch?.[1]?.trim() || "", back: backMatch?.[1]?.trim() || "" };
    }).filter((c) => c.front && c.back);

    if (!cards.length)
      return text.replace(/\[FLASHCARDS:[^\]]+\][\s\S]*?(?:\[\/FLASHCARDS\]|$)/, "").trim();

    // Resolve ayah references to actual Arabic text
    cards = await Promise.all(cards.map(async (card) => {
      const refMatch = card.back.match(/\((\d+):(\d+)\)/);
      if (refMatch) {
        try {
          const res  = await fetch(`${API_BASE}/ayah/${refMatch[1]}/${refMatch[2]}`, { headers: getAuthHeader() });
          const json = await res.json();
          if (json.success && json.data?.text) return { ...card, back: json.data.text };
        } catch (e) { /* keep original */ }
      }
      return card;
    }));

    try {
      const res  = await fetch(`${API_BASE}/flashcards/user-sets`, {
        method: "POST", headers: getAuthHeader(),
        body: JSON.stringify({ name: setName, cards }),
      });
      const json = await res.json();
      if (json.success) setFlashcardSaved({ name: setName, count: cards.length, id: json.data?.id ?? null });
    } catch (e) { console.error("Flashcard save error:", e); }

    return text
      .replace(/\[FLASHCARDS:[^\]]+\][\s\S]*?(?:\[\/FLASHCARDS\]|$)/, `✅ **${cards.length} flashcards saved** to "${setName}"`)
      .trim();
  }, []);

  // ── Build system prompt ─────────────────────────────────────────────────────
  const buildSystemPrompt = useCallback(() => {
    let prompt = SYSTEM_PROMPT_BASE;
    const diary = buildDiaryContext(heatmapData, recentLogs);
    const muta  = buildMutashabihatContext(similarities);
    if (diary) prompt += `\n\n${diary}`;
    if (muta)  prompt += `\n\n${muta}`;
    if (!diary && !muta) prompt += `\n\nNote: No diary or mutashabihat data available yet.`;
    if (learningStyle?.primary) {
      prompt += `\n\nSTUDENT LEARNING STYLE: Primary=${learningStyle.primary}${
        learningStyle.secondary ? `, Secondary=${learningStyle.secondary}` : ""
      }. Tailor memorization method recommendations accordingly.`;
    }
    return prompt;
  }, [heatmapData, recentLogs, similarities, learningStyle]);

  // ── Core send logic ─────────────────────────────────────────────────────────
  const sendMessageWithHistory = useCallback(async (userText, historyMessages, sessionId) => {
    setError("");
    const now     = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: userText.trim(), timestamp: now };

    setMessages([...historyMessages, userMsg]);
    setLoading(true);
    await saveMessage(sessionId, "user", userText.trim());

    const apiMessages = [...historyMessages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const { context: quranContext, intent } = await buildQuranContext(userText);
      let freshPairs = [];
      const isTipRequest = intent.wantsSimilar || /tip|mutasha/i.test(userText);

      if (isTipRequest && intent.allAyahPairs?.length > 0) {
        freshPairs = await fetchSimilarityForPairs(intent.allAyahPairs, intent.marhala);
      } else if (isTipRequest && intent.surahNum) {
        freshPairs = await fetchSimilarityForPairs(
          [{ surah: intent.surahNum, ayah: intent.ayahNum || 1 }],
          intent.marhala
        );
      }

      const simContext = freshPairs.length > 0 ? buildSimilarityContextForPrompt(freshPairs) : "";
      const fullSystem = buildSystemPrompt() + (quranContext || "") + simContext;

      const aiRes = await fetch(`${API_BASE}/coach/chat`, {
        method: "POST", headers: getAuthHeader(),
        body: JSON.stringify({ system: fullSystem, messages: apiMessages }),
      });

      if (!aiRes.ok) {
        const errJson = await aiRes.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `API error ${aiRes.status}`);
      }

      const aiData   = await aiRes.json();
      const rawReply = aiData.content?.map((b) => (b.type === "text" ? b.text : "")).join("") ||
        "Sorry, I could not generate a response.";

      // ── Parse tip blocks → save to DB, collect nav pairs ──────────────────
      const { cleanedText, navPairs, count: tipCount } = await parseTipsFromResponse(rawReply, freshPairs);

      // Save new tips to the info panel
      if (navPairs?.length > 0) {
        const newTips = navPairs
          .filter((p) => p.tip)
          .map((p) => ({
            pair: `${p.sourceSurah ?? "?"}:${p.sourceAyah ?? "?"} ↔ ${p.targetSurah}:${p.targetAyah}`,
            text: p.tip,
          }));
        if (newTips.length > 0) {
          setMemoryTips((prev) => {
            const existingPairs = new Set(prev.map((t) => t.pair));
            const fresh = newTips.filter((t) => !existingPairs.has(t.pair));
            return [...fresh, ...prev].slice(0, 20);
          });
        }
      }

      // ── Parse remaining special blocks in order ────────────────────────────
      let processed = parseStyleBlock(cleanedText);
      processed     = parseWeeklyCycleBlock(processed);
      processed     = parseScheduleBlock(processed);
      processed     = await parseAndSaveFlashcards(processed);

      // Strip [NAV:] from display but capture the target
      const navMatch  = processed.match(/\[NAV:([^\]]+)\]/);
      const displayText = navMatch
        ? processed.replace(/\[NAV:[^\]]+\]\n?/g, "").trim()
        : processed;

      const replyTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [...prev, { role: "assistant", content: displayText, timestamp: replyTime }]);
      await saveMessage(sessionId, "assistant", displayText);
      loadSessions();
      if (!isUnlimited) setRemainingMessages((prev) => Math.max(0, (prev ?? 10) - 1));

      // ── Navigation ─────────────────────────────────────────────────────────
      if (tipCount > 0 && navPairs?.length > 0 && intent.allAyahPairs?.length > 0) {
        const coachTipsMap = {};
        navPairs.forEach((p) => { coachTipsMap[`${p.targetSurah}:${p.targetAyah}`] = p.tip; });
        const primary = intent.allAyahPairs[0];
        setNavigating(true);
        setTimeout(() => {
          setNavigating(false);
          navigate("/similarity", {
            state: { autoSearch: true, surah: primary.surah, ayah: primary.ayah, coachTips: coachTipsMap },
          });
        }, 1800);
      } else if (navMatch) {
        setNavigating(true);
        setTimeout(() => { setNavigating(false); navigate(navMatch[1]); }, 1500);
      }

    } catch (err) {
      setError(err.message || "Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    buildSystemPrompt, saveMessage, loadSessions,
    parseStyleBlock, parseWeeklyCycleBlock, parseScheduleBlock, parseAndSaveFlashcards,
    isUnlimited, navigate,
  ]);

  // ── Send new message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || loading) return;
    if (!isUnlimited && remainingMessages === 0) {
      setError("You have used all 10 coach messages for today. Come back tomorrow! 📖");
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(userText.trim().slice(0, 50));
      if (!sessionId) { setError("Could not create session. Please try again."); return; }
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    await sendMessageWithHistory(userText, messages, sessionId);
  }, [messages, loading, activeSessionId, isUnlimited, remainingMessages, createSession, sendMessageWithHistory]);

  // ── Handle home screen option selection ─────────────────────────────────────
  // All four options open a chat sub-menu — no immediate redirects.
  const handleHomeOption = useCallback(async (opt) => {
    await sendMessage(opt.prompt);
  }, [sendMessage]);

  // ── Edit & resend ───────────────────────────────────────────────────────────
  const handleEditMessage = useCallback(async (messageIndex, newText) => {
    if (!newText.trim() || loading) return;
    if (!isUnlimited && remainingMessages === 0) {
      setError("You have used all 10 coach messages for today. Come back tomorrow! 📖");
      return;
    }
    if (!activeSessionId) return;
    const historyBefore = messages.slice(0, messageIndex).map((m) => ({ ...m }));
    await sendMessageWithHistory(newText, historyBefore, activeSessionId);
  }, [messages, loading, activeSessionId, isUnlimited, remainingMessages, sendMessageWithHistory]);

  // ── Input handlers ──────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const limitReached = !isUnlimited && remainingMessages === 0;
  const inputActive  = input.trim() && !loading && !limitReached;
  const weakCount    = heatmapData.filter((d) => d.score <= 5.75).length;
  const totalPages   = heatmapData.length;
  const simCount     = similarities.length;
  const showHome     = !activeSessionId && messages.length === 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", height: "100%", minHeight: 520,
      background: "white", borderRadius: 16,
      border: "1px solid #E5E7EB", overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    }}>

      {/* ── Left: Session sidebar ── */}
      {sidebarOpen && (
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          dataLoaded={dataLoaded}
          weakCount={weakCount}
          totalPages={totalPages}
          simCount={simCount}
          remainingMessages={remainingMessages}
          isUnlimited={isUnlimited}
          onCreateSession={() => createSession()}
          onLoadSession={loadSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
        />
      )}

      {/* ── Centre: Chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid #F3F4F6",
          display: "flex", alignItems: "center", gap: 10,
          background: "white", flexShrink: 0,
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide sessions" : "Show sessions"}
            style={{
              background: sidebarOpen ? "#E6F4F1" : "#F3F4F6",
              border: "1px solid #D1D5DB", borderRadius: 8,
              padding: "5px 10px", cursor: "pointer", color: "#004D40",
              fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}
          >
            <i className={`ti ${sidebarOpen ? "ti-layout-sidebar-left-collapse" : "ti-layout-sidebar-left-expand"}`} style={{ fontSize: 14 }} />
            <span>{sidebarOpen ? "Hide" : "Sessions"}</span>
          </button>

          {/* Avatar + title */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: "#004D40",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <i className="ti ti-star-filled" style={{ fontSize: 16, color: "#F2C94C" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Ustadh AI</div>
            <div style={{ fontSize: 11, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: dataLoaded ? "#10B981" : "#F59E0B",
                display: "inline-block",
              }} />
              {dataLoaded ? "Ready · data loaded" : "Loading your data..."}
            </div>
          </div>

          {/* Message counter */}
          {!isUnlimited && remainingMessages !== null && (
            <div style={{
              fontSize: 11,
              background: remainingMessages <= 3 ? "#FEF2F2" : "#F0FDF4",
              color:      remainingMessages <= 3 ? "#991B1B" : "#166534",
              borderRadius: 20, padding: "2px 10px", fontWeight: 600, flexShrink: 0,
            }}>
              💬 {remainingMessages}/10
            </div>
          )}

          {/* Info panel toggle */}
          <button
            onClick={() => setInfoPanelOpen((v) => !v)}
            title={infoPanelOpen ? "Hide profile panel" : "Show profile panel"}
            style={{
              background: infoPanelOpen ? "#E6F4F1" : "#F3F4F6",
              border: "1px solid #D1D5DB", borderRadius: 8,
              padding: "5px 10px", cursor: "pointer", color: "#004D40",
              fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            }}
          >
            <i className={`ti ${infoPanelOpen ? "ti-layout-sidebar-right-collapse" : "ti-layout-sidebar-right-expand"}`} style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px 16px 8px",
          display: "flex", flexDirection: "column",
        }}>
          {showHome && (
            <HomeScreen
              onSelect={handleHomeOption}
              dataLoaded={dataLoaded}
              weakCount={weakCount}
              totalPages={totalPages}
              simCount={simCount}
            />
          )}

          {messages.map((msg, i) => (
            <div key={i} className="ustadh-msg-enter">
              <MessageBubble
                msg={msg}
                onEdit={msg.role === "user" ? (newText) => handleEditMessage(i, newText) : undefined}
              />
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", background: "#004D40",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
              }}>
                <i className="ti ti-star-filled" style={{ fontSize: 16, color: "#F2C94C" }} />
              </div>
              <TypingIndicator />
            </div>
          )}

          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
              padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15 }} />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips — every 4 messages */}
        {messages.length > 0 && messages.length % 4 === 0 && !loading && (
          <QuickChips onSend={sendMessage} />
        )}

        {navigating   && <NavBanner text="Opening page and saving data…" />}
        {flashcardSaved && (
          <FlashcardBanner
            saved={flashcardSaved}
            onView={() => navigate("/flashcards")}
            onDismiss={() => setFlashcardSaved(null)}
          />
        )}

        {/* Input area */}
        <div style={{
          padding: "12px 16px 16px", borderTop: "1px solid #F3F4F6",
          background: "white", flexShrink: 0,
        }}>
          {limitReached && (
            <div style={{
              textAlign: "center", padding: "10px", fontSize: 13,
              color: "#991B1B", background: "#FEF2F2", borderRadius: 10, marginBottom: 10,
            }}>
              📖 Daily limit reached (10/10). Come back tomorrow!
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: "#F9FAFB", borderRadius: 22,
            padding: "8px 8px 8px 16px", border: "1px solid #E5E7EB",
          }}>
            <textarea
              ref={textareaRef}
              className="ustadh-textarea"
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                limitReached
                  ? "Daily limit reached. Come back tomorrow."
                  : "Type 1, 2, 3, 4 — or ask anything about your Hifz…"
              }
              style={{ height: 44, maxHeight: 140, overflowY: "auto" }}
              disabled={loading || limitReached}
            />
            <button
              className="ustadh-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!inputActive}
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: inputActive ? "#004D40" : "#E5E7EB", border: "none",
                cursor: inputActive ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background .15s",
              }}
            >
              <i className="ti ti-arrow-up" style={{ fontSize: 17, color: inputActive ? "#fff" : "#9CA3AF" }} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: "8px 0 0" }}>
            Enter to send · Shift+Enter for new line · Hover messages to edit & resend
          </p>
        </div>
      </div>

      {/* ── Right: Info panel ── */}
      {infoPanelOpen && (
        <InfoPanel
          learningStyle={learningStyle}
          progress={progress}
          weeklyCycle={weeklyCycle}
          latestSchedule={latestSchedule}
          memoryTips={memoryTips}
        />
      )}
    </div>
  );
}