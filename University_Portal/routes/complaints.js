const express = require('express');
const db = require('../database');
const { requireAdmin, requireStudent, requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/complaints
 * Access: Admin or Student
 * Returns: All complaints joined with the student's name for admins, or only the specific student's complaints if requested by a student. Sorted newest first.
 */
router.get('/', requireLogin, (req, res) => {
    try {
        let stmt;
        if (req.session.user.role === 'admin') {
            // Admin fetches all complaints joined with user name
            stmt = db.prepare(`
                SELECT c.*, u.name as student_name 
                FROM complaints c 
                JOIN users u ON c.student_id = u.id 
                ORDER BY c.created_at DESC
            `);
            const complaints = stmt.all();
            res.json(complaints);
        } else {
            // Student fetches only their own complaints
            stmt = db.prepare(`
                SELECT * FROM complaints 
                WHERE student_id = ? 
                ORDER BY created_at DESC
            `);
            const complaints = stmt.all(req.session.user.id);
            res.json(complaints);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

/**
 * GET /api/complaints/stats
 * Access: Admin
 * Returns: Counts for total, pending, in progress, and resolved complaints.
 */
router.get('/stats', requireAdmin, (req, res) => {
    try {
        // Fetch total and group by status
        const stmt = db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM complaints 
            GROUP BY status
        `);
        const rows = stmt.all();
        
        let stats = {
            total: 0,
            Pending: 0,
            'In Progress': 0,
            Resolved: 0
        };

        rows.forEach(row => {
            stats[row.status] = row.count;
            stats.total += row.count;
        });

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * POST /api/complaints
 * Access: Student
 * Adds a new complaint. Checks if the student already has an active (Pending/In Progress) complaint.
 * Returns: Success message.
 */
router.post('/', requireStudent, (req, res) => {
    const { title, category, priority, description } = req.body;
    const studentId = req.session.user.id;

    if (!title || !category || !priority || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if student has an active complaint
        const checkStmt = db.prepare(`
            SELECT COUNT(*) as count 
            FROM complaints 
            WHERE student_id = ? AND status IN ('Pending', 'In Progress')
        `);
        const activeCount = checkStmt.get(studentId).count;

        if (activeCount > 0) {
            return res.status(400).json({ error: 'You must wait for your active complaint to be resolved before submitting another.' });
        }

        // Insert new complaint
        const insertStmt = db.prepare(`
            INSERT INTO complaints (student_id, title, category, priority, description)
            VALUES (?, ?, ?, ?, ?)
        `);
        insertStmt.run(studentId, title, category, priority, description);

        res.json({ success: true, message: 'Complaint submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

/**
 * PUT /api/complaints/:id
 * Access: Admin
 * Updates the status and admin_response of a complaint, and sets updated_at.
 * Returns: Success message.
 */
router.put('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        // Update complaint
        const updateStmt = db.prepare(`
            UPDATE complaints 
            SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        updateStmt.run(status, admin_response || null, id);

        res.json({ success: true, message: 'Complaint updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

/**
 * DELETE /api/complaints/:id
 * Access: Admin
 * Deletes a complaint.
 * Returns: Success message.
 */
router.delete('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    try {
        const deleteStmt = db.prepare('DELETE FROM complaints WHERE id = ?');
        deleteStmt.run(id);
        res.json({ success: true, message: 'Complaint deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});

module.exports = router;
