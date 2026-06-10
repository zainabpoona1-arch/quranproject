//C:\quran-similarity-app\backend\modules\coach\flashcard.routes.js
"use strict";

const express = require("express");
const router  = express.Router();
const auth    = require("../../middleware/authMiddleware");
const db      = require("../../config/database");

// GET /api/flashcards/user-sets — list user's custom sets
router.get("/user-sets", auth, async (req, res, next) => {
  try {
    const sets = await db.all(
      `SELECT id, name, created_at FROM flashcard_sets 
       WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: sets });
  } catch (err) { next(err); }
});

// POST /api/flashcards/user-sets — create a new set with cards
// Expects: { name: "Set Name", cards: [{front: "...", back: "..."}, ...] }
router.post("/user-sets", auth, async (req, res, next) => {
  try {
    const { name, cards } = req.body;
    
    // Validate inputs
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "name is required and must be a non-empty string." });
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ success: false, message: "cards must be a non-empty array." });
    }

    // Validate each card
    for (const card of cards) {
      if (!card.front || !card.back) {
        return res.status(400).json({ success: false, message: "Each card must have front and back properties." });
      }
    }

    // Insert the set
    const result = await db.run(
      "INSERT INTO flashcard_sets (user_id, name) VALUES (?, ?)",
      [req.user.id, name.trim()]
    );
    const setId = result.id;

    // Insert all cards
    for (const card of cards) {
      await db.run(
        "INSERT INTO flashcard_cards (set_id, front, back) VALUES (?, ?, ?)",
        [setId, card.front, card.back]
      );
    }

    // Return the created set with full details
    res.status(201).json({ 
      success: true, 
      data: { 
        id: setId, 
        name: name.trim(), 
        cardCount: cards.length,
        created_at: new Date().toISOString()
      } 
    });
  } catch (err) { next(err); }
});

// GET /api/flashcards/user-sets/:id — get cards in a set
router.get("/user-sets/:id", auth, async (req, res, next) => {
  try {
    const set = await db.get(
      "SELECT id, name FROM flashcard_sets WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!set) return res.status(404).json({ success: false, message: "Set not found." });

    const cards = await db.all(
      "SELECT id, front, back FROM flashcard_cards WHERE set_id = ? ORDER BY id ASC",
      [req.params.id]
    );
    res.json({ success: true, data: { ...set, cards } });
  } catch (err) { next(err); }
});

// DELETE /api/flashcards/user-sets/:id
router.delete("/user-sets/:id", auth, async (req, res, next) => {
  try {
    const result = await db.run(
      "DELETE FROM flashcard_sets WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.changes === 0)
      return res.status(404).json({ success: false, message: "Set not found." });
    res.json({ success: true, message: "Set deleted." });
  } catch (err) { next(err); }
});

// ✅ PATCH /api/flashcards/user-sets/:id — rename a flashcard set
// Expects: { name: "New Set Name" }
router.patch("/user-sets/:id", auth, async (req, res, next) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "name is required and must be a non-empty string." });
    }

    // Check set exists and belongs to user
    const set = await db.get(
      "SELECT id FROM flashcard_sets WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!set) {
      return res.status(404).json({ success: false, message: "Set not found." });
    }

    // Update the name
    const result = await db.run(
      "UPDATE flashcard_sets SET name = ? WHERE id = ? AND user_id = ?",
      [name.trim(), id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Set not found or no changes made." });
    }

    res.json({ 
      success: true, 
      data: { 
        id, 
        name: name.trim(),
        message: "Set renamed successfully."
      } 
    });
  } catch (err) { next(err); }
});

module.exports = router;