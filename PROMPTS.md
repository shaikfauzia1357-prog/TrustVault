# TrustVault — AI Usage and Verification Log

This file records how I used AI assistance while developing TrustVault, the problems I identified, the corrections I made, and how I verified the application. I reviewed suggested changes and tested features rather than relying only on AI-generated answers.

## Entry 1 — 2026-10-20: Project Setup and Backend Guidance

**What I asked the AI:**

I asked for guidance on setting up the TrustVault project using Node.js, Express, and SQLite.

**What the AI produced:**

The AI provided setup guidance and backend implementation suggestions for the document-storage application.

**What was wrong or needed improvement:**

I needed to understand where the code belonged and how the application components worked together. AI-generated guidance alone was not sufficient to establish that the application worked correctly.

**What I did to correct or verify it:**

I followed the setup steps, ran the application locally, and checked the terminal for errors.

**Verification:**

The application started locally. This confirmed that the setup worked, but it did not establish that every security requirement was satisfied.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 2 — 2026-10-20: Registration, Login, and Session Authentication

**What I asked the AI:**

I asked for help implementing user registration, login, logout, password hashing, and session-based authentication.

**What the AI produced:**

The AI provided implementation guidance for authentication and password hashing using bcryptjs, together with session-based login handling.

**What was wrong or needed improvement:**

I needed to verify the authentication flow in the running application instead of assuming that the suggested implementation was correct merely because the code was present.

**What I did to correct or verify it:**

I ran the application and tested registration, login, and logout in the browser.

**Verification:**

I tested the authentication flow in the browser. Additional security checks are still necessary before treating the application as production-ready.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 3 — 2026-10-20: Document Upload and Listing

**What I asked the AI:**

I asked for help implementing document uploads and displaying uploaded documents.

**What the AI produced:**

The AI provided guidance for handling uploads and showing document names and timestamps in the application.

**What was wrong or needed improvement:**

I needed to verify the actual upload behavior rather than rely on implementation suggestions alone. Successful upload testing by itself does not prove that document access is properly restricted.

**What I did to correct or verify it:**

I ran the application, uploaded a test text file, and checked whether its name appeared in the application.

**Verification:**

I confirmed that the uploaded file appeared in the application. Additional upload-security checks, including comprehensive file-type validation and malware scanning, remain necessary.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 4 — 2026-10-20: Authorization and User-Specific Access Control

**What I asked the AI:**

I asked for help restricting document listings and audit logs to the currently logged-in user.

**What the AI produced:**

The AI helped with filtering documents and audit-log records using the logged-in user's ID.

**What was wrong or needed improvement:**

A user-specific query is an important access-control measure, but it is not enough to assume that every route is secure. Each route that accesses a document must enforce the appropriate ownership or sharing-permission check. The checks also need direct testing.

**What I did to correct or verify it:**

I tested the application with two accounts and checked that each account saw its own documents and audit records. I also tested a direct document-download URL using a different account.

**Verification:**

Each account showed its own documents and audit records during testing. In the live application, I copied a document-download URL from one account, logged out, signed in with another account, and opened the copied URL. The application returned "Document not found" instead of allowing the second account to download that document.

This test supports the expected ownership restriction for the tested case. It does not prove that every possible access-control case is secure.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 5 — 2026-10-20: Document Downloads, Audit Logging, and Debugging

**What I asked the AI:**

I asked for help implementing document downloads and ensuring that a user could download only documents they were authorized to access.

**What the AI produced:**

The AI helped with the download route and the checks involving the document ID and logged-in user's ID. It also provided debugging guidance.

**What was wrong or needed improvement:**

During implementation, duplicate code and download-button logic placed in the wrong function caused problems. I needed to correct the code placement instead of blindly copying suggested code. I also needed to distinguish between having an ownership check in the code and proving that cross-user access was rejected.

**What I did to correct it:**

I worked through the debugging steps, corrected misplaced or duplicated logic, and checked the download functionality in the application.

**Verification:**

I verified that document downloads worked and that upload and download events appeared in the audit trail. I also tested a copied download URL with a different account. The application returned "Document not found" rather than allowing the second account to download the document.

This verifies the tested scenario, not every possible security condition.

**Related commit:**

[Add document download audit logging](https://github.com/shaikfauzia1357-prog/TrustVault/commit/29988d4e023e1de8a4d37f7e8130ce903023663b)

## Entry 6 — 2026-10-21: Updating Audit Trail Threat Documentation

**What I asked the AI:**

I asked for help reviewing Threat 6 in `THREATS.md` and making its audit-trail mitigation description accurate.

**What the AI produced:**

The AI suggested documenting upload and download events and identifying additional audit-logging improvements.

**What was wrong or needed improvement:**

The earlier threat documentation described upload logging but did not fully reflect the implemented download-logging functionality. The documentation needed to distinguish existing functionality from future security improvements.

**What I did to correct it:**

I updated the Threat 6 mitigation text to mention upload and download events. I kept failed-login logging, denied-access logging, and stronger audit-record protection as future recommendations instead of claiming they were already implemented.

**Verification:**

I tested document uploads and downloads and observed the corresponding audit events. I also tested a cross-user download attempt in the live application; the application returned "Document not found" for the second account. Failed-login logging, denied-access logging, and protection against audit-record tampering still require further work.

**Related commit:**

[Audit trail threat documentation update](https://github.com/shaikfauzia1357-prog/TrustVault/commit/edca7f4d05d9aaba663b2b3b5032897e2c35bf86)

## Entry 7 — 2026-10-21: Reviewing AI Guidance and Improving Verification

**What I asked the AI:**

I asked the AI to help improve the project documentation and record the problems encountered during AI-assisted development.

**What the AI produced:**

The AI provided explanations, suggested changes, and documentation for the project.

**What was wrong or needed improvement:**

During the project, I noticed that AI guidance was not always consistent or complete. Sometimes I had to remind the AI about information I had already shared, explain the problem more than once, and ask for step-by-step clarification. Some implementation suggestions also needed debugging.

The repository-visibility advice was confusing because the challenge information I was working from contained conflicting guidance about repository visibility. I needed to check the applicable submission instructions rather than rely on an earlier AI response alone.

**What I did to correct or verify it:**

I checked suggested changes against the actual application and repository, asked for step-by-step instructions, and reviewed the challenge requirements before proceeding with repository changes.

**Verification:**

I checked that documentation changes had been pushed to GitHub. I did not treat AI guidance as proof that every security requirement had passed testing.

**Related commit:**

[Document audit trail review in prompts log](https://github.com/shaikfauzia1357-prog/TrustVault/commit/40ee2f0336ad02bfba02ee52b15b4f6eaf18b9ea)

## Entry 8 — 2026-10-24: Audit Chain Verification and Repair

**What I asked the AI:**

I asked for help investigating why the audit-chain verification endpoint reported an audit entry hash mismatch.

**What the AI produced:**

The AI helped inspect the audit-hash calculation, database schema, and repair script.

**What was wrong or needed improvement:**

The `audit_logs` table uses `ON DELETE SET NULL` for `document_id`. When a related document is deleted, its audit record's `document_id` can change while the stored hash remains unchanged. This can cause hash verification to fail.

**What I did to correct it:**

I created an audit backup and ran the repair script against the configured Neon PostgreSQL database. The script rebuilt the hash chain for the existing audit entries.

**Verification:**

The `/admin/verify-audit-chain` endpoint returned `valid: true`, `entriesVerified: 14`, and `Audit chain verified.` This confirms that the current 14 entries passed verification after the repair. It does not prove that the earlier audit records were never modified.

**Important limitation:**

Rebuilding hashes replaces the previous hashes and cannot establish the integrity of the earlier chain. The behavior of document deletion and audit-record preservation requires further improvement.

**Related files:**

`database.js`, `repair-audit-chain.js`, and `audit-backup.json`.

## Overall Reflection

AI assistance helped me understand implementation steps, troubleshoot errors, and improve project documentation. However, I learned that AI-generated suggestions can be confusing, incomplete, or placed incorrectly. I had to review the code, identify problems, ask follow-up questions, and verify features in the running application.

I also learned that implementing an access-control check and proving that it works are different things. Security testing must include attempts to access another user's documents, not only successful operations by the owner.

TrustVault is a prototype and requires further security testing and improvements before production use. I will describe only the features I implemented or verified and will not claim that untested security checks have passed.
