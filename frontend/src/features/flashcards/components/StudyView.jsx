import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export default function StudyView({ category }) {
  const [displayCards, setDisplayCards] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If category has direct cards (user flashcards), use them
    if (category.cards && category.cards.length > 0) {
      setDisplayCards(category.cards.map((card, i) => ({
        id: i,
        front: card.front,
        back: card.back,
      })));
      return;
    }

    // If it's a built-in category with study HTML, try to parse ayah references
    if (category.study) {
      setLoading(true);
      parseAndFetchAyahs(category.study);
    }
  }, [category]);

  const parseAndFetchAyahs = async (htmlContent) => {
    try {
      // Extract ayah references like "2:142" from HTML
      const ayahRegex = /(\d+):(\d+)/g;
      const matches = [...htmlContent.matchAll(ayahRegex)];
      
      if (matches.length === 0) {
        setDisplayCards([]);
        setLoading(false);
        return;
      }

      const uniqueAyahs = [...new Set(matches.map(m => `${m[1]}:${m[2]}`))];
      const cards = [];

      for (const ayahRef of uniqueAyahs) {
        const [surah, ayah] = ayahRef.split(':');
        try {
          const res = await fetch(
            `${API_BASE}/ayah/${surah}/${ayah}`,
            { headers: getAuthHeader() }
          );
          const json = await res.json();
          if (json.success && json.data) {
            cards.push({
              id: ayahRef,
              front: ayahRef,
              back: json.data.text,
            });
          }
        } catch (e) {
          console.error(`Failed to fetch ayah ${ayahRef}:`, e);
        }
      }

      setDisplayCards(cards);
    } catch (e) {
      console.error('Error parsing ayahs:', e);
      setDisplayCards([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading ayahs…</div>;
  }

  if (displayCards.length === 0) {
    return (
      <div className="study-view-container" dangerouslySetInnerHTML={{ __html: category.study }} />
    );
  }

  return (
    <div className="study-view-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayCards.map((card, i) => (
          <div key={card.id} style={{ 
            background: 'white', 
            border: '1px solid #E5E7EB', 
            borderRadius: 12, 
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '16px'
          }}>
            <div style={{ 
              background: '#F0FDF4', 
              borderBottom: '1px solid #D1FAE5', 
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13, 
              fontWeight: 700, 
              color: '#065F46'
            }}>
              Ayah {card.front}
            </div>
            <div style={{ 
              fontSize: 16, 
              fontWeight: 600,
              color: '#111827', 
              lineHeight: 1.8,
              textAlign: 'right',
              direction: 'rtl',
              fontFamily: "'Traditional Arabic', 'Amiri', serif"
            }}>
              {card.back}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}