const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Connect to SQLite database
const db = new Database('campus.db');

/**
 * Sets up all database tables
 * Uses IF NOT EXISTS to prevent breaking on re-run
 */
function setupDatabase() {
    // Stores all users including admins and students
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT CHECK(role IN ('admin', 'student')) NOT NULL,
            department TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Stores all student complaints
    db.exec(`
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            category TEXT CHECK(category IN ('Academic', 'Facility', 'Administrative', 'Other')) NOT NULL,
            priority TEXT CHECK(priority IN ('Low', 'Medium', 'High')) NOT NULL,
            description TEXT NOT NULL,
            status TEXT CHECK(status IN ('Pending', 'In Progress', 'Resolved')) DEFAULT 'Pending',
            admin_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id)
        )
    `);

    // Stores information about upcoming events
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            date TEXT NOT NULL,
            venue TEXT NOT NULL,
            category TEXT CHECK(category IN ('Workshop', 'Seminar', 'Guest Lecture', 'Career Fair', 'Other')) DEFAULT 'Other',
            total_seats INTEGER NOT NULL,
            registered_seats INTEGER DEFAULT 0,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);

    // Stores event registrations to track which student registered for which event
    db.exec(`
        CREATE TABLE IF NOT EXISTS event_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            UNIQUE(event_id, student_id)
        )
    `);

    // Stores details of Final Year Project groups
    db.exec(`
        CREATE TABLE IF NOT EXISTS fyp_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT NOT NULL,
            project_title TEXT NOT NULL,
            description TEXT NOT NULL,
            supervisor_name TEXT,
            status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
            admin_feedback TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Stores the members (students) belonging to FYP groups
    db.exec(`
        CREATE TABLE IF NOT EXISTS fyp_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            FOREIGN KEY (group_id) REFERENCES fyp_groups(id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            UNIQUE(student_id)
        )
    `);

    // Stores milestones for FYP groups
    db.exec(`
        CREATE TABLE IF NOT EXISTS fyp_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            status TEXT CHECK(status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
            FOREIGN KEY (group_id) REFERENCES fyp_groups(id)
        )
    `);

    // Stores announcements created by admins
    db.exec(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            priority TEXT CHECK(priority IN ('Normal', 'Important', 'Urgent')) DEFAULT 'Normal',
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);
}

/**
 * Seeds the database with initial data
 * Only inserts data if the users table is currently empty
 */
function seedDatabase() {
    // Checks the total number of users in the database
    const userCountStatement = db.prepare('SELECT COUNT(*) as count FROM users');
    const userCount = userCountStatement.get().count;

    if (userCount === 0) {
        console.log('Seeding initial database data...');

        const salt = bcrypt.genSaltSync(10);
        
        // Inserts a single user record into the database
        const insertUser = db.prepare(`
            INSERT INTO users (name, email, password, role, department)
            VALUES (?, ?, ?, ?, ?)
        `);

        // Insert Admin
        const adminPassword = bcrypt.hashSync('admin123', salt);
        const adminResult = insertUser.run('Admin', 'admin@cusit.edu.pk', adminPassword, 'admin', 'Administration');
        const adminId = adminResult.lastInsertRowid;

        // Insert Students
        const studentPassword = bcrypt.hashSync('student123', salt);
        const student1Result = insertUser.run('Ali Hassan', 'student1@cusit.edu.pk', studentPassword, 'student', 'Computer Science');
        const student1Id = student1Result.lastInsertRowid;

        const student2Result = insertUser.run('Sara Khan', 'student2@cusit.edu.pk', studentPassword, 'student', 'Electrical Engineering');
        const student2Id = student2Result.lastInsertRowid;

        const student3Result = insertUser.run('Umar Farooq', 'student3@cusit.edu.pk', studentPassword, 'student', 'Business Administration');
        const student3Id = student3Result.lastInsertRowid;

        // Inserts an announcement created by an admin
        const insertAnnouncement = db.prepare(`
            INSERT INTO announcements (title, content, priority, created_by)
            VALUES (?, ?, ?, ?)
        `);

        insertAnnouncement.run(
            'Welcome to Smart Campus Portal',
            'This is the central hub for all student services.',
            'Important',
            adminId
        );
        insertAnnouncement.run(
            'Mid Semester Exams Schedule',
            'Exams begin June 1st. Please check your timetables.',
            'Urgent',
            adminId
        );
        insertAnnouncement.run(
            'Library Timing Update',
            'The library is now open until 9pm on weekdays.',
            'Normal',
            adminId
        );

        // Inserts an event created by an admin
        const insertEvent = db.prepare(`
            INSERT INTO events (title, description, date, venue, category, total_seats, registered_seats, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const event1Result = insertEvent.run(
            'Introduction to Machine Learning',
            'Join us for a comprehensive introduction to modern AI techniques.',
            '2026-06-15',
            'Main Auditorium, Block C',
            'Workshop',
            50,
            1, 
            adminId
        );
        const event1Id = event1Result.lastInsertRowid;

        insertEvent.run(
            'Future of UI/UX in Web3 Ecosystems',
            'An exploratory seminar diving into decentralized application interfaces.',
            '2026-05-25',
            'Design Lab 4, Block A',
            'Seminar',
            60,
            0,
            adminId
        );

        insertEvent.run(
            'Cybersecurity Leadership in 2026',
            'Guest speaker Dr. Alan Turing discusses the critical role of leadership.',
            '2026-06-10',
            'Conference Room B',
            'Guest Lecture',
            100,
            0,
            adminId
        );

        // Inserts a new student complaint
        const insertComplaint = db.prepare(`
            INSERT INTO complaints (student_id, title, category, priority, description, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        insertComplaint.run(
            student2Id,
            'AC Not Working in CS Block',
            'Facility',
            'High',
            'Room CS-204 AC has been broken for two weeks.',
            'In Progress'
        );

        insertComplaint.run(
            student3Id,
            'Wrong Grade Entered',
            'Academic',
            'High',
            'OOP mid-term grade was entered incorrectly.',
            'Pending'
        );

        // Inserts a new Final Year Project group
        const insertFypGroup = db.prepare(`
            INSERT INTO fyp_groups (group_name, project_title, description, supervisor_name, status)
            VALUES (?, ?, ?, ?, ?)
        `);

        const fypGroupResult = insertFypGroup.run(
            'Team Alpha',
            'AI-Based Attendance System',
            'Facial recognition for automating attendance.',
            'Dr. Kamran Ahmed',
            'Approved'
        );
        const fypGroupId = fypGroupResult.lastInsertRowid;

        // Inserts a member into an FYP group
        const insertFypMember = db.prepare(`
            INSERT INTO fyp_members (group_id, student_id)
            VALUES (?, ?)
        `);

        insertFypMember.run(fypGroupId, student1Id); // Ali Hassan
        insertFypMember.run(fypGroupId, student2Id); // Sara Khan

        // Inserts a milestone for an FYP group
        const insertFypMilestone = db.prepare(`
            INSERT INTO fyp_milestones (group_id, title, description, due_date, status)
            VALUES (?, ?, NULL, ?, ?)
        `);

        insertFypMilestone.run(fypGroupId, 'Project Proposal', '2026-03-01', 'Completed');
        insertFypMilestone.run(fypGroupId, 'Literature Review', '2026-04-01', 'Completed');
        insertFypMilestone.run(fypGroupId, 'System Design', '2026-05-01', 'In Progress');
        insertFypMilestone.run(fypGroupId, 'Implementation', '2026-06-01', 'Not Started');

        // Registers a student for an event
        const insertEventRegistration = db.prepare(`
            INSERT INTO event_registrations (event_id, student_id)
            VALUES (?, ?)
        `);

        insertEventRegistration.run(event1Id, student1Id); // Ali Hassan registered for Tech Expo
        
        console.log('Database seeded successfully.');
    }
}

// Run setup and seed
setupDatabase();
seedDatabase();

module.exports = db;
