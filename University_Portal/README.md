# Smart Campus Portal

The Smart Campus Portal is a comprehensive, centralized platform designed to streamline student and administration interactions within a university ecosystem. It features role-based access to manage complaints, event registrations, and final year projects through an intuitive, dark-mode inspired premium user interface.

## How to Run

Follow these simple steps to run the application locally:
1. Ensure you have Node.js installed on your machine.
2. Open a terminal in the project root directory and run `npm install` to download all dependencies.
3. Start the server by running `node server.js`. The SQLite database will automatically seed itself on the first run.
4. Open your web browser and navigate to `http://localhost:3000`.

## Demo Login Credentials

The database is pre-seeded with the following accounts for immediate testing:

**Administrator Account:**
- **Email:** `admin@cusit.edu.pk`
- **Password:** `admin123`

**Student Accounts:**
- **Email:** `student1@cusit.edu.pk` | **Password:** `student123` (Has active complaints and an FYP group)
- **Email:** `student2@cusit.edu.pk` | **Password:** `student123` (Has an FYP group)
- **Email:** `student3@cusit.edu.pk` | **Password:** `student123` (No FYP group, can test submission flow)

## Module Summary

- **Authentication & Roles:** A secure login system utilizing `express-session` and `bcryptjs` that bifurcates the portal entirely based on Student and Admin roles.
- **Complaints Module:** Empowers students to submit trackable issues while equipping administrators with powerful sorting and inline-updating tools to manage resolutions effectively.
- **Events Module:** Allows administrators to organize and track campus activities while providing students with a seamless, capacity-aware one-click registration process.
- **FYP Management:** A structured workflow for students to form groups and track project milestones, while admins can oversee, assign supervisors, and provide critical feedback on all submissions.
- **Announcements Module:** A robust, university-wide broadcast system allowing administration to relay urgent and important information globally across all dashboards.

## Tech Stack Used

- **Backend:** Node.js, Express.js
- **Database:** SQLite3 (`better-sqlite3`)
- **Security & Sessions:** `express-session`, `bcryptjs`, `body-parser`
- **Frontend:** HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Design System, CSS Variables)
- **Design Typography:** Google Fonts (Syne, DM Sans)
