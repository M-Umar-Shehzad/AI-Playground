const express = require('express');
const db = require('../database');
const { requireAdmin, requireStudent, requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper function to fetch full details for a group
 * Fetches members and milestones for a given group ID
 */
function getGroupDetails(groupId) {
    const membersStmt = db.prepare(`
        SELECT u.name, u.email 
        FROM fyp_members fm 
        JOIN users u ON fm.student_id = u.id 
        WHERE fm.group_id = ?
    `);
    const milestonesStmt = db.prepare('SELECT * FROM fyp_milestones WHERE group_id = ? ORDER BY due_date ASC');
    
    return {
        members: membersStmt.all(groupId),
        milestones: milestonesStmt.all(groupId)
    };
}

/**
 * GET /api/fyp
 * Access: Admin or Student
 * Returns: All FYP groups for admins, or the student's specific FYP group. Includes nested members and milestones arrays.
 */
router.get('/', requireLogin, (req, res) => {
    try {
        let groups = [];

        if (req.session.user.role === 'admin') {
            const stmt = db.prepare('SELECT * FROM fyp_groups ORDER BY created_at DESC');
            groups = stmt.all();
        } else {
            const stmt = db.prepare(`
                SELECT fg.* 
                FROM fyp_groups fg
                JOIN fyp_members fm ON fg.id = fm.group_id
                WHERE fm.student_id = ?
            `);
            const group = stmt.get(req.session.user.id);
            if (group) groups = [group];
        }

        // Attach members and milestones to each group
        const enrichedGroups = groups.map(group => {
            const details = getGroupDetails(group.id);
            return {
                ...group,
                members: details.members,
                milestones: details.milestones
            };
        });

        res.json(enrichedGroups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch FYP groups' });
    }
});

/**
 * POST /api/fyp
 * Access: Student
 * Creates a new FYP group, adds the current student, and safely attempts to add other specified members.
 * Returns: Success message.
 */
router.post('/', requireStudent, (req, res) => {
    const { group_name, project_title, description, member_ids } = req.body;
    const studentId = req.session.user.id;

    if (!group_name || !project_title || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if student is already in a group
        const checkStmt = db.prepare('SELECT COUNT(*) as count FROM fyp_members WHERE student_id = ?');
        if (checkStmt.get(studentId).count > 0) {
            return res.status(400).json({ error: 'You are already in an FYP group' });
        }

        const tx = db.transaction((gName, pTitle, desc, mIds, sId) => {
            const insertGroupStmt = db.prepare(`
                INSERT INTO fyp_groups (group_name, project_title, description) 
                VALUES (?, ?, ?)
            `);
            const groupResult = insertGroupStmt.run(gName, pTitle, desc);
            const groupId = groupResult.lastInsertRowid;

            const insertMemberStmt = db.prepare('INSERT INTO fyp_members (group_id, student_id) VALUES (?, ?)');
            
            // Add creator
            insertMemberStmt.run(groupId, sId);

            // Add additional members if valid
            if (Array.isArray(mIds)) {
                for (let id of mIds) {
                    if (id !== sId) { // skip if they included themselves
                        try {
                            insertMemberStmt.run(groupId, id);
                        } catch (e) {
                            // Unique constraint failed (already in a group) or invalid student_id
                            console.log(`Failed to add member ${id}:`, e.message);
                        }
                    }
                }
            }
        });

        tx(group_name, project_title, description, member_ids, studentId);
        res.json({ success: true, message: 'FYP Group created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create FYP group' });
    }
});

/**
 * PUT /api/fyp/:id
 * Access: Admin
 * Updates group status, admin_feedback, and supervisor_name.
 * Returns: Success message.
 */
router.put('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status, admin_feedback, supervisor_name } = req.body;

    try {
        const updateStmt = db.prepare(`
            UPDATE fyp_groups 
            SET status = COALESCE(?, status), 
                admin_feedback = COALESCE(?, admin_feedback), 
                supervisor_name = COALESCE(?, supervisor_name)
            WHERE id = ?
        `);
        updateStmt.run(status, admin_feedback, supervisor_name, id);
        
        res.json({ success: true, message: 'FYP group updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update FYP group' });
    }
});

/**
 * GET /api/fyp/:id/milestones
 * Access: Any logged in user
 * Returns: All milestones for a specific group sorted by due date.
 */
router.get('/:id/milestones', requireLogin, (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('SELECT * FROM fyp_milestones WHERE group_id = ? ORDER BY due_date ASC');
        res.json(stmt.all(id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

/**
 * POST /api/fyp/:id/milestones
 * Access: Student
 * Adds a new milestone to a group.
 * Returns: Success message.
 */
router.post('/:id/milestones', requireStudent, (req, res) => {
    const { id } = req.params;
    const { title, description, due_date } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        // We should ideally check if the student belongs to this group
        const checkStmt = db.prepare('SELECT COUNT(*) as count FROM fyp_members WHERE group_id = ? AND student_id = ?');
        if (checkStmt.get(id, req.session.user.id).count === 0) {
            return res.status(403).json({ error: 'You do not belong to this FYP group' });
        }

        const insertStmt = db.prepare(`
            INSERT INTO fyp_milestones (group_id, title, description, due_date)
            VALUES (?, ?, ?, ?)
        `);
        insertStmt.run(id, title, description || null, due_date || null);
        
        res.json({ success: true, message: 'Milestone created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create milestone' });
    }
});

/**
 * PUT /api/fyp/milestones/:id
 * Access: Student
 * Updates the status of a specific milestone.
 * Returns: Success message.
 */
router.put('/milestones/:id', requireStudent, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const stmt = db.prepare('UPDATE fyp_milestones SET status = ? WHERE id = ?');
        stmt.run(status, id);
        
        res.json({ success: true, message: 'Milestone updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update milestone' });
    }
});

/**
 * PUT /api/fyp/:id/status
 * Access: Admin
 * Quick-update the status of a group.
 */
router.put('/:id/status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const stmt = db.prepare('UPDATE fyp_groups SET status = ? WHERE id = ?');
        stmt.run(status, id);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
