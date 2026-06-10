// C:\quran-similarity-app\frontend\src\features\flashcards\FlashcardsPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import StudyView from './components/StudyView';
import TestView from './components/TestView';
import SequenceFlowchart from './components/SequenceFlowchart';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getAuthHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// ─── User Set Viewer ───────────────────────────────────────────────────────────
function UserSetViewer({ set, onBack, onDelete, onRenameSuccess }) {
  const [mode, setMode] = useState('study');
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(set.name);
  const [renameSaving, setRenameSaving] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res  = await fetch(`${API_BASE}/flashcards/user-sets/${set.id}`, { headers: getAuthHeader() });
        const json = await res.json();
        if (json.success) setCards(json.data.cards || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCards();
  }, [set.id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${set.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/flashcards/user-sets/${set.id}`, {
        method: 'DELETE', headers: getAuthHeader(),
      });
      onDelete(set.id);
    } catch (e) { console.error(e); setDeleting(false); }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === set.name) {
      setRenaming(false);
      setNewName(set.name);
      return;
    }
    setRenameSaving(true);
    try {
      const res = await fetch(`${API_BASE}/flashcards/user-sets/${set.id}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: newName })
      });
      const json = await res.json();
      if (json.success) {
        // ✅ FIX: Call parent callback to update list, then exit rename mode
        if (onRenameSuccess) {
          onRenameSuccess(set.id, newName);
        }
        setRenaming(false);
      } else {
        console.error('Rename failed:', json);
        setNewName(set.name);
        setRenaming(false);
      }
    } catch (e) { 
      console.error('Rename error:', e);
      setNewName(set.name);
      setRenaming(false);
    } finally {
      setRenameSaving(false);
    }
  };

  return (
    <div className="flashcards-main-content">
      {/* Back + title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack}
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
          {renaming ? (
            <input autoFocus value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === "Enter") { 
                  e.preventDefault();
                  handleRename();
                }
                if (e.key === "Escape") { 
                  setRenaming(false); 
                  setNewName(set.name); 
                }
              }}
              onBlur={() => {
                // Only exit rename mode if not saving
                if (!renameSaving) {
                  setRenaming(false);
                  setNewName(set.name);
                }
              }}
              disabled={renameSaving}
              style={{ fontSize: 16, fontWeight: 600, border: '2px solid #004D40', borderRadius: 6, padding: '4px 12px', outline: 'none', width: 300 }} />
          ) : (
            <h1 style={{ margin: 0, fontSize: 22, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
              {set.name}
              <button onClick={() => {
                setRenaming(true);
                setNewName(set.name);
              }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9CA3AF', padding: 0 }} title="Rename set">
                ✏️
              </button>
            </h1>
          )}
        </div>
        <button onClick={handleDelete} disabled={deleting}
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
          {deleting ? 'Deleting…' : '🗑 Delete Set'}
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading cards…</div>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>No cards found.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => { setMode('study'); setCardIndex(0); setFlipped(false); }}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mode === 'study' ? '#004D40' : '#F3F4F6', color: mode === 'study' ? '#fff' : '#111827' }}>
              📖 Study
            </button>
            <button
              onClick={() => { setMode('test'); setCardIndex(0); setFlipped(false); }}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mode === 'test' ? '#004D40' : '#F3F4F6', color: mode === 'test' ? '#fff' : '#111827' }}>
              🧠 Test Yourself
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#9CA3AF', alignSelf: 'center' }}>
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Sequence Memory Aid button ── */}
          <SequenceFlowchart setName={set.name} />

          {mode === 'study' ? (
            /* Study: show all cards as a list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cards.map((card, i) => (
                <div key={card.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '12px 16px', background: '#F0FDF4', borderBottom: '1px solid #D1FAE5', fontSize: 13, fontWeight: 700, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#004D40', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{i + 1}</span>
                    {card.front}
                  </div>
                  <div style={{ padding: '12px 16px', fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line', direction: 'rtl', textAlign: 'right', fontFamily: "'Traditional Arabic', 'Amiri', serif" }}>
                    {card.back}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Test: flip card */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                Card {cardIndex + 1} of {cards.length}
              </div>
              <div
                onClick={() => setFlipped(f => !f)}
                style={{
                  width: '100%', maxWidth: 520, minHeight: 200, borderRadius: 16,
                  background: flipped ? '#004D40' : 'white',
                  border: '2px solid #004D40', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '28px 32px', textAlign: 'center', transition: 'background .25s',
                  boxShadow: '0 4px 20px rgba(0,77,64,0.12)',
                }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, color: flipped ? 'rgba(255,255,255,.55)' : '#9CA3AF' }}>
                    {flipped ? 'ANSWER' : 'QUESTION'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: flipped ? '#fff' : '#111827', lineHeight: 1.6, whiteSpace: 'pre-line', direction: flipped ? 'rtl' : 'ltr', fontFamily: flipped ? "'Traditional Arabic', 'Amiri', serif" : 'inherit' }}>
                    {flipped ? cards[cardIndex].back : cards[cardIndex].front}
                  </div>
                  {!flipped && (
                    <div style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
                      Click to reveal answer
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
                  disabled={cardIndex === 0}
                  style={{ padding: '9px 22px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: cardIndex === 0 ? 'not-allowed' : 'pointer', color: '#374151', fontWeight: 600, fontSize: 13 }}>
                  ← Prev
                </button>
                <button onClick={() => { setCardIndex(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
                  disabled={cardIndex === cards.length - 1}
                  style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#004D40', cursor: cardIndex === cards.length - 1 ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 600, fontSize: 13 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const flashcardsData = useMemo(() => require('./data/flashcardsData').flashcardsData, []);

  // Built-in category state
  const [selectedCategory, setSelectedCategory] = useState(flashcardsData[0].id);
  const [mode, setMode]                         = useState('study');

  // User sets state
  const [userSets, setUserSets]         = useState([]);
  const [setsLoading, setSetsLoading]   = useState(true);
  const [activeUserSet, setActiveUserSet] = useState(null); // {id, name}

  const activeCategory = flashcardsData.find(c => c.id === selectedCategory);

  // Load user's AI-generated flashcard sets
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${API_BASE}/flashcards/user-sets`, { headers: getAuthHeader() });
        const json = await res.json();
        if (json.success) setUserSets(json.data || []);
      } catch (e) { console.error(e); }
      finally { setSetsLoading(false); }
    };
    load();
  }, []);

  const handleDeleteSet = (deletedId) => {
    setUserSets(prev => prev.filter(s => s.id !== deletedId));
    setActiveUserSet(null);
  };

  const handleRenameSet = (setId, newName) => {
    // ✅ FIX: Update the userSets list with new name
    setUserSets(prev => prev.map(s => s.id === setId ? { ...s, name: newName } : s));
    // ✅ FIX: Update active set too
    if (activeUserSet?.id === setId) {
      setActiveUserSet({ ...activeUserSet, name: newName });
    }
  };

  // ── Showing a user set ────────────────────────────────────────────────────
  if (activeUserSet) {
    return (
      <div className="flashcards-page-wrapper">
        <div className="flashcards-sidebar">
          <h2 style={{ marginBottom: 20, color: '#004D40' }}>📚 Flashcards</h2>

          {/* AI Sets section */}
          {userSets.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
                My AI Sets
              </div>
              {userSets.map(set => (
                <button key={set.id}
                  className={`sidebar-btn ${activeUserSet?.id === set.id ? 'active' : ''}`}
                  onClick={() => setActiveUserSet(set)}>
                  ✨ {set.name}
                </button>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '16px 0' }} />
            </>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
            Built-in Categories
          </div>
          {flashcardsData.map(cat => (
            <button key={cat.id}
              className="sidebar-btn"
              onClick={() => { setActiveUserSet(null); setSelectedCategory(cat.id); setMode('study'); }}>
              {cat.title}
            </button>
          ))}
        </div>

        <UserSetViewer
          set={activeUserSet}
          onBack={() => setActiveUserSet(null)}
          onDelete={handleDeleteSet}
          onRenameSuccess={handleRenameSet}
        />
      </div>
    );
  }

  // ── Normal built-in view ──────────────────────────────────────────────────
  return (
    <div className="flashcards-page-wrapper">
      <div className="flashcards-sidebar">
        <h2 style={{ marginBottom: 20, color: '#004D40' }}>📚 Flashcards</h2>

        {/* My AI-generated sets */}
        {!setsLoading && userSets.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
              My AI Sets ({userSets.length})
            </div>
            {userSets.map(set => (
              <button key={set.id}
                className="sidebar-btn"
                onClick={() => setActiveUserSet(set)}>
                ✨ {set.name}
              </button>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '16px 0' }} />
          </>
        )}

        {/* Loading state */}
        {setsLoading && (
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>Loading your sets…</div>
        )}

        {/* No AI sets yet */}
        {!setsLoading && userSets.length === 0 && (
          <div style={{ fontSize: 12, color: '#9CA3AF', background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', marginBottom: 16, lineHeight: 1.5 }}>
            💡 Ask <strong>Ustadh AI</strong> to "create flashcards for Surah X" — they'll appear here automatically.
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
          Built-in Categories
        </div>
        {flashcardsData.map(cat => (
          <button
            key={cat.id}
            className={`sidebar-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => { setSelectedCategory(cat.id); setMode('study'); }}>
            {cat.title}
          </button>
        ))}
      </div>

      <div className="flashcards-main-content">
        <h1>{activeCategory.title}</h1>

        <div className="mode-toggle">
          <button className={mode === 'study' ? 'active' : ''} onClick={() => setMode('study')}>📖 Study Material</button>
          <button className={mode === 'test'  ? 'active' : ''} onClick={() => setMode('test')}>🧠 Test Yourself</button>
        </div>

        {mode === 'study'
          ? <StudyView category={activeCategory} />
          : <TestView  cards={activeCategory.cards} />
        }
      </div>
    </div>
  );
}
