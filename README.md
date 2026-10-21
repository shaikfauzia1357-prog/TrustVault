# TrustVault — Secure Document Sharing

TrustVault is a web application designed to support secure document sharing, user authentication, and audit logging.

## Features

- User registration and login
- Password hashing for safer password storage
- Secure session-based authentication
- Document upload and download
- User-specific document access
- Audit logging for important actions
- Automated security tests

## Technologies Used

- HTML, CSS, JavaScript
- Node.js
- Express.js
- SQLite
- Git and GitHub

## Project Structure

- `server.js` — Starts the web server and defines application routes.
- `auth.js` — Handles authentication-related functionality.
- `database.js` — Manages database operations.
- `public/index.html` — Contains the web interface.
- `tests/security.test.js` — Contains security tests.
- `THREATS.md` — Documents security threats.
- `PROMPTS.md` — Records AI assistance, mistakes, and corrections.

## Getting Started

### Prerequisites

Install Node.js and npm.

### Installation

1. Clone the repository.
2. Open the project directory in the terminal.
3. Install dependencies:

   `npm install`

4. Start the application using the start command defined in `package.json`.

5. Open the local URL shown by the application in your browser.

## Security

TrustVault aims to protect user documents through authentication and access controls. Security claims should be confirmed by running the tests and reviewing the implementation.

## Project Status

This project is under development. Features, security controls, and deployment must be tested before they are considered complete.

## Author

Shaik Fauzia Tasneem