// features/coach/CoachComponents.jsx
// ─── Pure UI components used by CoachPage ─────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { HOME_OPTIONS, QUICK_CHIPS } from "./coachConstants";

// ─── Typing indicator (three bouncing dots) ────────────────────────────────────
export function TypingIndicator() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "14px 18px", background: "#F9FAFB",
      borderRadius: "6px 18px 18px 18px", maxWidth: 80,
      border: "1px solid #F3F4F6",
    }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: "50%", background: "#9CA3AF",
            display: "inline-block",
            animation: `ustadh-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Formatted text (markdown bold/italic + line breaks) ──────────────────────
export function FormattedText({ text }) {
  return (
    <div>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const html = line
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>");
        return (
          <p
            key={i}
            style={{ margin: "0 0 4px 0", lineHeight: 1.65 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}

// ─── Message bubble (user + assistant, with inline edit & resend) ─────────────
export function MessageBubble({ msg, onEdit }) {
  const isUser = msg.role === "user";
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);
  const editRef               = useRef(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editVal.length, editVal.length);
    }
  }, [editing]);

  // Always resend even if text unchanged — user clicked Resend intentionally
  const handleSave = () => {
    const trimmed = editVal.trim();
    if (trimmed) onEdit(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setEditVal(msg.content); setEditing(false); }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, alignItems: "flex-start", marginBottom: 16,
    }}>
      {/* AI avatar */}
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: "#004D40",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: 2,
        }}>
          <i className="ti ti-star-filled" style={{ fontSize: 16, color: "#F2C94C" }} />
        </div>
      )}

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 4, maxWidth: "78%",
      }}>
        {editing ? (
          /* ── Edit mode ── */
          <div style={{ width: "100%", minWidth: 260 }}>
            <textarea
              ref={editRef}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              style={{
                width: "100%", border: "2px solid #004D40", borderRadius: 10,
                padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
                resize: "vertical", outline: "none", lineHeight: 1.6,
                background: "#F0FDF4",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setEditVal(msg.content); setEditing(false); }}
                style={{
                  background: "#F3F4F6", border: "none", borderRadius: 6,
                  padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#6B7280",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: "#004D40", border: "none", borderRadius: 6,
                  padding: "5px 14px", cursor: "pointer", fontSize: 12,
                  fontWeight: 600, color: "#fff",
                }}
              >
                ✓ Resend
              </button>
            </div>
          </div>
        ) : (
          /* ── Display mode: pencil inline to left, never clipped ── */
          <div
            style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}
            onMouseEnter={() => isUser && setHovered(true)}
            onMouseLeave={() => isUser && setHovered(false)}
          >
            {isUser && (
              <button
                onClick={() => { setEditVal(msg.content); setEditing(true); }}
                title="Edit & resend"
                style={{
                  visibility: hovered ? "visible" : "hidden",
                  background: "#fff", border: "1px solid #D1D5DB",
                  borderRadius: 7, width: 30, height: 30,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", color: "#6B7280",
                  transition: "border-color .15s, color .15s, box-shadow .15s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#004D40";
                  e.currentTarget.style.color = "#004D40";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,77,64,0.18)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#D1D5DB";
                  e.currentTarget.style.color = "#6B7280";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                }}
              >
                <i className="ti ti-pencil" style={{ fontSize: 13, pointerEvents: "none" }} />
              </button>
            )}

            <div style={{
              padding: "13px 17px",
              borderRadius: isUser ? "18px 6px 18px 18px" : "6px 18px 18px 18px",
              background: isUser ? "#004D40" : "#F9FAFB",
              color: isUser ? "#fff" : "#111827",
              fontSize: 14,
              border: isUser ? "none" : "1px solid #F3F4F6",
              wordBreak: "break-word",
            }}>
              <FormattedText text={msg.content} />
              {msg.timestamp && (
                <div style={{
                  fontSize: 11,
                  color: isUser ? "rgba(255,255,255,0.55)" : "#9CA3AF",
                  marginTop: 6,
                  textAlign: isUser ? "right" : "left",
                }}>
                  {msg.timestamp}
                  {msg.edited && <span style={{ marginLeft: 6, opacity: 0.7 }}>(edited)</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Home screen (shown when no session is active) ────────────────────────────
export function HomeScreen({ onSelect, dataLoaded, weakCount, totalPages, simCount }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px", textAlign: "center",
    }}>
      {/* Avatar */}
      <div style={{
        width: 60, height: 60, borderRadius: "50%", background: "#004D40",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
      }}>
        <i className="ti ti-star-filled" style={{ fontSize: 26, color: "#F2C94C" }} />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
        Ustadh AI — Your Hifz Coach
      </h2>
      <p style={{ fontSize: 13, color: "#6B7280", maxWidth: 380, margin: "0 0 16px", lineHeight: 1.6 }}>
        What would you like to work on today?
      </p>

      {/* Data status chips */}
      {dataLoaded && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {totalPages > 0 && (
            <span style={{
              fontSize: 11, background: "#F0FDF4", color: "#166534",
              borderRadius: 20, padding: "3px 10px", border: "1px solid #BBF7D0", fontWeight: 500,
            }}>
              📖 {totalPages} pages · {weakCount} weak
            </span>
          )}
          <span style={{
            fontSize: 11, background: "#EFF6FF", color: "#1E40AF",
            borderRadius: 20, padding: "3px 10px", border: "1px solid #BFDBFE", fontWeight: 500,
          }}>
            🔗 {simCount > 0 ? `${simCount} similar pairs` : "No pairs yet"}
          </span>
        </div>
      )}

      {/* 4 Option cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10, width: "100%", maxWidth: 480,
      }}>
        {HOME_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className="ustadh-home-opt"
            onClick={() => onSelect(opt)}
            style={{
              background: "white", border: "1.5px solid #E5E7EB",
              borderRadius: 12, padding: "14px 12px",
              cursor: "pointer", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 6,
              transition: "border-color .15s, background .15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: "#E6F4F1",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <i className={`ti ${opt.icon}`} style={{ fontSize: 16, color: "#004D40" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#004D40" }}>{opt.key}.</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, lineHeight: 1.4 }}>
                {opt.labelEn}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 16 }}>
        Reply with <strong>1</strong>, <strong>2</strong>, <strong>3</strong>, or <strong>4</strong> — or type your question directly
      </p>
    </div>
  );
}

// ─── Quick chips (shown mid-conversation every 4 messages) ────────────────────
export function QuickChips({ onSend }) {
  return (
    <div style={{
      padding: "8px 16px 4px", display: "flex", gap: 8,
      flexWrap: "wrap", borderTop: "1px solid #F3F4F6", flexShrink: 0,
    }}>
      {QUICK_CHIPS.map((q) => (
        <button
          key={q}
          className="ustadh-chip"
          onClick={() => onSend(q)}
          style={{
            background: "#F9FAFB", border: "1px solid #E5E7EB",
            borderRadius: 20, padding: "5px 12px", fontSize: 12,
            cursor: "pointer", color: "#374151", whiteSpace: "nowrap",
            transition: "all .15s",
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

// ─── Navigation notice banner ──────────────────────────────────────────────────
export function NavBanner({ text }) {
  return (
    <div style={{
      background: "#E6F4F1", border: "1px solid #004D40", borderRadius: 10,
      padding: "10px 16px", margin: "0 16px 8px", fontSize: 13, color: "#004D40",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <i className="ti ti-arrow-right" /> {text}
    </div>
  );
}

// ─── Flashcard saved banner ────────────────────────────────────────────────────
export function FlashcardBanner({ saved, onView, onDismiss }) {
  return (
    <div style={{
      background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10,
      padding: "10px 16px", margin: "0 16px 8px", fontSize: 13, color: "#166534",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    }}>
      <span>✅ {saved.count} flashcards saved to "{saved.name}"</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onView}
          style={{
            background: "#004D40", border: "none", color: "#fff",
            fontWeight: 600, cursor: "pointer", fontSize: 12,
            padding: "4px 12px", borderRadius: 6,
          }}
        >
          View →
        </button>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}