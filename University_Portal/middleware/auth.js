/**
 * Middleware to check if a user is logged in.
 * If there is no active session, it redirects the user to the login page ("/").
 * If the user is logged in, it allows the request to continue.
 */
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
}

/**
 * Middleware to check if the logged-in user is an admin.
 * If there is no session, it redirects to the login page.
 * If the user is not an admin, it redirects to the student dashboard.
 * If the user is an admin, it allows the request to continue.
 */
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    if (req.session.user.role !== 'admin') {
        return res.redirect('/student-dashboard');
    }
    next();
}

/**
 * Middleware to check if the logged-in user is a student.
 * If there is no session, it redirects to the login page.
 * If the user is not a student, it redirects to the admin dashboard.
 * If the user is a student, it allows the request to continue.
 */
function requireStudent(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    if (req.session.user.role !== 'student') {
        return res.redirect('/admin-dashboard');
    }
    next();
}

module.exports = {
    requireLogin,
    requireAdmin,
    requireStudent
};
