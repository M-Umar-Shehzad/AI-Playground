const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

/**
 * Handles user login.
 * Looks up the user by email, compares the password, and creates a session if valid.
 * Redirects to the appropriate dashboard on success, or back to login with an error on failure.
 */
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.redirect('/?error=Please provide both email and password.');
    }

    // Fetch the user from the database by their email
    const getUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUserStmt.get(email);

    if (!user) {
        return res.redirect('/?error=Invalid email or password.');
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = bcrypt.compareSync(password, user.password);

    if (!passwordMatch) {
        return res.redirect('/?error=Invalid email or password.');
    }

    // Save user details to the session
    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    // Redirect to the appropriate dashboard based on user role
    if (user.role === 'admin') {
        res.redirect('/admin-dashboard');
    } else {
        res.redirect('/student-dashboard');
    }
});

/**
 * Handles user logout.
 * Destroys the active session and redirects to the login page.
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

/**
 * Handles student registration.
 */
router.post('/register', (req, res) => {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
        return res.redirect('/register.html?error=Please fill all fields.');
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const insertStmt = db.prepare(`
            INSERT INTO users (name, email, password, role, department)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(name, email, hashedPassword, 'student', department);
        
        res.redirect('/?success=Account created! Please login.');
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.redirect('/register.html?error=Email already exists.');
        }
        console.error(err);
        res.redirect('/register.html?error=Registration failed. Please try again.');
    }
});

module.exports = router;
