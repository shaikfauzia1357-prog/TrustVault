# TrustVault — AI Usage and Verification Log

This file records how I used AI assistance while developing TrustVault, the problems I identified, the corrections I made, and how I verified the application. I reviewed the suggested changes and tested features rather than relying only on AI-generated answers.

## Entry 1 — 2026-10-20: Project Setup and Backend Guidance

**What I asked the AI:**

I asked for guidance on setting up the TrustVault project using Node.js, Express, and SQLite.

**What the AI produced:**

The AI provided setup guidance and backend implementation suggestions for the document-storage application.

**What was wrong or needed improvement:**

I needed to understand where the code belonged and how the application components worked together. AI-generated guidance alone was not sufficient to establish that the application worked correctly.

**What I did to correct or verify it:**

I followed the setup steps, ran the application locally, and checked the terminal for errors. I used the results to confirm that the application started.

**Verification:**

I ran the application locally. This confirmed that the setup worked, but it did not establish that every security requirement was satisfied.

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

I ran the application and tested the authentication flow in the browser. I checked the behavior of the login and logout features.

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

I needed to verify the actual upload behavior rather than rely on the implementation suggestions alone. Successful upload testing by itself does not prove that document access is properly restricted.

**What I did to correct or verify it:**

I ran the application, uploaded a test text file, and checked whether its name and timestamp appeared as expected.

**Verification:**

I confirmed that the test file appeared in the application. Further testing is needed for additional upload-security cases, including file type validation and malware scanning.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 4 — 2026-10-20: Authorization and User-Specific Access Control

**What I asked the AI:**

I asked for help restricting document listings and audit logs to the currently logged-in user.

**What the AI produced:**

The AI helped with filtering documents and audit-log records using the logged-in user's ID.

**What was wrong or needed improvement:**

A user-specific query is an important access-control measure, but it is not enough to assume that every route is secure. Each route that accesses a document must enforce the appropriate ownership check. The checks also need direct testing.

**What I did to correct or verify it:**

I tested the application with two accounts and checked that each account saw its own documents and audit records. I also reviewed the access-control requirements for document downloads.

**Verification:**

The two-account test showed user-specific document listings and audit logs. A direct cross-user download rejection test was still outstanding at the time of this log.

**Related commit:**

[Initial TrustVault project](https://github.com/shaikfauzia1357-prog/TrustVault/commit/97cf4efff8ead502951b2d3af397a3fa3e0eb061)

## Entry 5 — 2026-10-20: Document Downloads, Audit Logging, and Debugging

**What I asked the AI:**

I asked for help implementing document downloads and ensuring that a user could download only their own documents.

**What the AI produced:**

The AI helped with the download route and the checks involving the document ID and logged-in user's ID. It also provided debugging guidance.

**What was wrong or needed improvement:**

During implementation, duplicate code and download-button logic placed in the wrong function caused problems. I needed to correct the code placement instead of blindly copying the suggested code. I also needed to distinguish between having an ownership check in the code and proving that cross-user access was rejected.

**What I did to correct it:**

I worked through the debugging steps, corrected the misplaced or duplicated logic, and checked the download functionality in the application.

**Verification:**

I verified that document downloads worked. I also tested document upload and download events in the audit trail. A direct attempt to download another user's document by changing the document ID still required testing.

**Related commit:**

[Add document download audit logging](https://github.com/shaikfauzia1357-prog/TrustVault/commit/29988d4e023e1de8a4d37f7e8130ce903023663b)

## Entry 6 — 2026-10-21: Updating Audit Trail Threat Documentation

**What I asked the AI:**

I asked for help reviewing Threat 6 in `THREATS.md` and making its audit-trail mitigation description accurate.

**What the AI produced:**

The AI suggested documenting both upload and download events and identifying additional audit-logging improvements.

**What was wrong or needed improvement:**

The earlier threat documentation described upload logging but did not fully reflect the implemented download logging functionality. The documentation needed to distinguish existing functionality from future security improvements.

**What I did to correct it:**

I updated the Threat 6 mitigation text to mention upload and download events. I kept failed-login logging, denied-access logging, and stronger audit-record protection as future recommendations instead of claiming they were already implemented.

**Verification:**

I had tested document uploads and downloads and observed the corresponding audit events. Cross-user download rejection still needed a direct test.

**Related commit:**

[TrustVault commit history][Audit trail threat documentation update][Audit trail threat documentation update][Audit trail threat documentation update](https://github.com/shaikfauzia1357-prog/TrustVault/commit/edca7f4d05d9aaba663b2b3b5032897e2c35bf86)


## Entry 7 — 2026-10-21: Reviewing AI Guidance and Improving Verification

**What I asked the AI:**

I asked the AI to help improve the project documentation and record the problems encountered during AI-assisted development.

**What the AI produced:**

The AI provided explanations, suggested changes, and documentation for the project.

**What was wrong or needed improvement:**

During the project, I noticed that AI guidance was not always consistent or complete. Sometimes I had to remind the AI about information I had already shared, explain the problem more than once, and ask for step-by-step clarification. Some implementation suggestions also needed debugging. The advice about repository visibility was confusing because the challenge instructions mentioned a public repository but also said not to make the repository public before the deadline. I learned to question unclear guidance, check the actual project state, and avoid assuming that a suggested solution was correct without verification.

**What I did to correct or verify it:**

I reminded the AI of the existing project details, checked the suggested changes against the application and repository, and asked for step-by-step instructions. I kept the repository private rather than changing its visibility before the deadline and planned to seek clarification about the conflicting instructions.

**Verification:**

I checked the updated documentation on GitHub and confirmed that the latest changes had been pushed successfully. I did not treat AI guidance as proof that every security requirement had passed testing.

**Related commit:**

[Document audit trail review in prompts log](https://github.com/shaikfauzia1357-prog/TrustVault/commit/40ee2f0336ad02bfba02ee52b15b4f6eaf18b9ea)

## Overall Reflection

AI assistance helped me understand implementation steps, troubleshoot errors, and improve project documentation. However, I learned that AI-generated suggestions can be confusing, incomplete, or placed incorrectly. I had to review the code, identify problems, ask follow-up questions, and verify features in the running application.

I also learned that implementing an access-control check and proving that it works are different things. Security testing must include attempts to access another user's documents, not only successful operations by the owner.

TrustVault is a prototype and requires further security testing and improvements before production use. I will describe only the features I implemented or verified and will not claim that untested security checks have passed.