const express = require('express');
const session = require('express-session');
const path = require('path');
// Import database.js to trigger database setup
const db = require('./database');

// Import routes and middleware
const authRoutes = require('./routes/auth');
const complaintsRoutes = require('./routes/complaints');
const eventsRoutes = require('./routes/events');
const fypRoutes = require('./routes/fyp');
const announcementsRoutes = require('./routes/announcements');
const { requireLogin, requireAdmin, requireStudent } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// Setup express-session
app.use(session({
    secret: 'super-secret-key-for-campus-portal',
    resave: false,
    saveUninitialized: false
}));

// Prevent browser caching of sensitive pages
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount auth routes
app.use('/auth', authRoutes);

// Mount API routes
app.use('/api/complaints', complaintsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/fyp', fypRoutes);
app.use('/api/announcements', announcementsRoutes);

/**
 * Handles the root route (Login Page)
 * Redirects logged-in users to their respective dashboards
 * Otherwise, serves the login HTML page
 */
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

/**
 * Registration Page
 */
app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

/**
 * Admin Dashboard Page
 * Protected by requireAdmin middleware
 */
app.get('/admin-dashboard', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

/**
 * Student Dashboard Page
 * Protected by requireStudent middleware
 */
app.get('/student-dashboard', requireStudent, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

/**
 * Complaints Page
 * Protected by requireLogin middleware
 */
app.get('/complaints', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'complaints.html'));
});

/**
 * Events Page
 * Protected by requireLogin middleware
 */
app.get('/events', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'events.html'));
});

/**
 * FYP Page
 * Protected by requireLogin middleware
 */
app.get('/fyp', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'fyp.html'));
});

/**
 * Announcements Page
 * Protected by requireLogin middleware
 */
app.get('/announcements', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'announcements.html'));
});

/**
 * API route to get current logged-in user data
 * Protected by requireLogin middleware
 */
app.get('/api/me', requireLogin, (req, res) => {
    res.json(req.session.user);
});

/**
 * API route to get total count of students
 * Protected by requireAdmin middleware
 */
app.get('/api/users/students/count', requireAdmin, (req, res) => {
    try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
        const result = stmt.get('student');
        res.json({ count: result.count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student count' });
    }
});

/**
 * Starts the Express server
 * Listens on the specified PORT
 */
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
