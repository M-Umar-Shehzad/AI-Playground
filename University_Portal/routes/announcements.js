const express = require('express');
const db = require('../database');
const { requireAdmin, requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/announcements
 * Access: Any logged in user
 * Returns: All announcements joined with the creator's name, sorted newest first.
 */
router.get('/', requireLogin, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT a.*, u.name as creator_name
            FROM announcements a
            JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
        `);
        const announcements = stmt.all();
        
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

/**
 * POST /api/announcements
 * Access: Admin
 * Inserts a new announcement using the admin's session ID as created_by.
 * Returns: Success message.
 */
router.post('/', requireAdmin, (req, res) => {
    const { title, content, priority } = req.body;
    const adminId = req.session.user.id;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO announcements (title, content, priority, created_by)
            VALUES (?, ?, ?, ?)
        `);
        // If priority isn't provided, SQLite DEFAULT constraint will catch it if we passed undefined, 
        // but better-sqlite3 requires explicit values or omitting the column.
        // We'll pass 'Normal' if undefined.
        stmt.run(title, content, priority || 'Normal', adminId);
        
        res.json({ success: true, message: 'Announcement created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * DELETE /api/announcements/:id
 * Access: Admin
 * Deletes the specified announcement.
 * Returns: Success message.
 */
router.delete('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare('DELETE FROM announcements WHERE id = ?');
        stmt.run(id);
        
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

module.exports = router;
