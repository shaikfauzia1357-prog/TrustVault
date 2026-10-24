# TrustVault — Secure Document Sharing

TrustVault is a web application designed to support secure document sharing, user authentication, permission-based access control, and audit logging.

## Live Demo

https://trustvault-7tzz.onrender.com

## Features

- User registration and login
- Password hashing using bcrypt
- Session-based authentication
- Document upload, download, editing, and deletion
- Permission-based document sharing
- User-specific document access
- Audit logging for important actions
- SHA-256 hash-chain verification for audit records
- Role-protected admin dashboard
- Automated security tests

## Technologies Used

- HTML, CSS, JavaScript
- Node.js and Express.js
- PostgreSQL
- bcryptjs
- express-session
- Multer
- Git and GitHub
- Render for deployment
- Supertest and Node.js test runner

## Project Structure

- `server.js` — Starts the web server and defines application routes.
- `auth.js` — Handles registration, login, and authentication.
- `database.js` — Configures PostgreSQL, initializes tables, and provides audit hash calculation.
- `public/index.html` — Contains the main web interface.
- `views/admin.html` — Contains the protected admin dashboard.
- `tests/security.test.js` — Contains security tests.
- `THREATS.md` — Documents security threats and mitigations.
- `PROMPTS.md` — Records AI assistance, mistakes, and corrections.

## Getting Started

### Prerequisites

Install Node.js and npm. A PostgreSQL database is also required.

### Installation

1. Clone this repository.
2. Open the project directory in your terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Configure the required environment variables, including `DATABASE_URL` and a secure `SESSION_SECRET`. Configure `ADMIN_USERNAME` if needed for the administrator account.

5. Start the application:

   ```bash
   npm start
   ```

6. Open the local URL displayed in the terminal.

### Run Tests

```bash
npm test
```

## Security

TrustVault uses password hashing, session-based authentication, access-control checks, and audit logging. An admin-only endpoint verifies the SHA-256 audit hash chain. Automated tests cover selected authentication and access-control protections.

These checks do not by themselves guarantee complete security or tamper-proof audit storage.

## Project Status

TrustVault is a learning and security challenge project. Its features should be tested, and its implementation and deployment limitations should be reviewed before production use.

## Author

Shaik Fauzia Tasneem
