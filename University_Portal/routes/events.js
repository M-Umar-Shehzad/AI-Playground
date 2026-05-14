const express = require('express');
const db = require('../database');
const { requireAdmin, requireStudent, requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/events
 * Access: Admin or Student
 * Returns: All events sorted by date. For students, dynamically appends isRegistered and seatsAvailable. For admins, appends seatsAvailable.
 */
router.get('/', requireLogin, (req, res) => {
    try {
        const eventsStmt = db.prepare('SELECT * FROM events ORDER BY date ASC');
        const events = eventsStmt.all();
        const userId = req.session.user.id;
        const role = req.session.user.role;

        // Map events to attach dynamic availability and registration status
        const enrichedEvents = events.map(event => {
            const seatsAvailable = event.total_seats - event.registered_seats;
            let isRegistered = false;

            if (role === 'student') {
                const regStmt = db.prepare('SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND student_id = ?');
                isRegistered = regStmt.get(event.id, userId).count > 0;
            }

            return {
                ...event,
                seatsAvailable,
                ...(role === 'student' && { isRegistered })
            };
        });

        res.json(enrichedEvents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

/**
 * POST /api/events
 * Access: Admin
 * Inserts a new event using the admin's session ID as created_by.
 * Returns: Success message.
 */
router.post('/', requireAdmin, (req, res) => {
    const { title, description, date, venue, category, total_seats } = req.body;
    const adminId = req.session.user.id;

    if (!title || !description || !date || !venue || !total_seats) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const insertStmt = db.prepare(`
            INSERT INTO events (title, description, date, venue, category, total_seats, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(title, description, date, venue, category || 'Other', total_seats, adminId);
        
        res.json({ success: true, message: 'Event created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

/**
 * DELETE /api/events/:id
 * Access: Admin
 * Deletes all registrations for an event, then deletes the event itself.
 * Returns: Success message.
 */
router.delete('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;

    try {
        // Begin a transaction to ensure both deletions succeed or fail together
        const deleteEventTx = db.transaction((eventId) => {
            db.prepare('DELETE FROM event_registrations WHERE event_id = ?').run(eventId);
            db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
        });
        
        deleteEventTx(id);
        res.json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

/**
 * POST /api/events/:id/register
 * Access: Student
 * Registers a student for an event if capacity allows and they are not already registered.
 * Returns: Success message.
 */
router.post('/:id/register', requireStudent, (req, res) => {
    const { id } = req.params;
    const studentId = req.session.user.id;

    try {
        const getEventStmt = db.prepare('SELECT total_seats, registered_seats FROM events WHERE id = ?');
        const event = getEventStmt.get(id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (event.registered_seats >= event.total_seats) {
            return res.status(400).json({ error: 'Event is full' });
        }

        const checkRegStmt = db.prepare('SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND student_id = ?');
        if (checkRegStmt.get(id, studentId).count > 0) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }

        // Transaction to add registration and increment count safely
        const registerTx = db.transaction((eventId, sId) => {
            db.prepare('INSERT INTO event_registrations (event_id, student_id) VALUES (?, ?)').run(eventId, sId);
            db.prepare('UPDATE events SET registered_seats = registered_seats + 1 WHERE id = ?').run(eventId);
        });

        registerTx(id, studentId);
        res.json({ success: true, message: 'Registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * GET /api/events/:id/registrations
 * Access: Admin
 * Returns: A list of all students registered for an event, joined with users table.
 */
router.get('/:id/registrations', requireAdmin, (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare(`
            SELECT u.name, u.email, er.registered_at 
            FROM event_registrations er
            JOIN users u ON er.student_id = u.id
            WHERE er.event_id = ?
            ORDER BY er.registered_at ASC
        `);
        const registrations = stmt.all(id);
        
        res.json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

module.exports = router;
