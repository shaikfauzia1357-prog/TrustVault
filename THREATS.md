# TrustVault — Threat Model

## 1. Project Overview

TrustVault is a secure document storage application that allows registered users to upload and download their own documents. It records document upload actions in an audit trail.

## 2. Assets to Protect

- Usernames and password hashes
- Uploaded documents
- User sessions
- Document ownership information
- Audit log records

## 3. Potential Threats and Mitigations

### Threat 1: Unauthorized Access

**Risk:** An unauthenticated person may try to access protected documents.

**Mitigation:** Login middleware protects document listing, uploading, audit log, and download routes.

### Threat 2: Cross-User Document Access

**Risk:** A user may try to access another user's document by changing the document ID.

**Mitigation:** Document queries check both the document ID and the logged-in user's ID.

### Threat 3: Password Exposure

**Risk:** Plain-text passwords could be exposed if stored directly in the database.

**Mitigation:** Passwords are hashed using bcryptjs before storage.

### Threat 4: Large File Uploads

**Risk:** Very large uploads may consume storage and server resources.

**Mitigation:** The application limits uploaded files to 5 MB.

### Threat 5: Session Theft or Misuse

**Risk:** A stolen or improperly managed session could allow unauthorized actions.

**Mitigation:** The session cookie uses `httpOnly` and `sameSite: "lax"` settings. Production deployment should use HTTPS, secure cookies, and a persistent session store.

### Threat 6: Audit Log Limitations

**Risk:** Important security events may not be recorded, and an attacker may attempt to modify or tamper with audit records, making suspicious activity difficult to detect.

**Mitigation:** The application records document upload and download events in the audit trail. Additional improvements should include logging failed login attempts and access-denied events, as well as protecting audit records against unauthorized modification.

## 4. Known Limitations

- The current application is a prototype and needs additional security testing.
- File type validation and malware scanning are not yet implemented.
- Rate limiting and CSRF protection need to be added.
- The default in-memory session store is not suitable for production.
- HTTPS and secure cookie configuration are required for production deployment.
- Document sharing with other users is not implemented yet.

## 5. Security Testing Plan

- Verify that protected routes reject requests when logged out.
- Verify that each user sees only their own documents and audit logs.
- Verify that one user cannot download another user's document by changing the document ID.
- Verify that uploads larger than 5 MB are rejected.
- Verify that invalid login attempts do not grant access.
