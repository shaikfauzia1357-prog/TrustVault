# TrustVault — AI Usage Log

This file records how AI assistance was used during TrustVault development.

## Entry 1 — 2026-10-20
**Task:** Project setup and backend guidance

**AI assistance:** Helped explain how to set up a Node.js and Express application and connect it to an SQLite database.

**My verification:** I ran the application locally and checked the terminal output.

## Entry 2 — 2026-10-20
**Task:** User registration and login

**AI assistance:** Helped implement registration, login, logout, password hashing, and session-based authentication.

**My verification:** I tested account registration and login in the browser.

## Entry 3 — 2026-10-20
**Task:** Document upload and listing

**AI assistance:** Helped implement document upload and display uploaded document details.

**My verification:** I uploaded a test text file and confirmed that its name and upload timestamp appeared on the page.

## Entry 4 — 2026-10-20
**Task:** User-specific document access and audit logs

**AI assistance:** Helped update database queries to filter documents and audit logs by the logged-in user's ID.

**My verification:** I used two accounts and checked that each account displayed its own uploaded documents and audit records.

## Entry 5 — 2026-10-20
**Task:** Download functionality and debugging

**AI assistance:** Helped add a download route that checks both the document ID and the logged-in user's ID. AI also helped debug JavaScript errors caused by accidentally duplicating code and placing download-button logic in the audit-log function.

**My verification:** I confirmed that the download button appeared and that a test file downloaded successfully. Cross-user download rejection still needs a direct test.

## Reflection

AI assistance helped me understand implementation steps and debug errors. I learned that code must be placed in the correct function and that duplicate declarations can cause JavaScript errors. I verified key features by running the application and testing them in the browser.

Further testing and security improvements are still required before production use.


### Entry 6 — 2026-10-21: Updating Audit Trail Threat Documentation

**What I asked the AI:**  
I asked for help reviewing the audit trail threat documentation in `THREATS.md` and making the mitigation section accurate.

**What the AI produced:**  
The AI suggested updating Threat 6 to explain that the application records document upload and download events, while identifying additional audit logging and protection improvements.

**What was wrong or needed improvement:**  
The earlier threat documentation mentioned upload logging but did not fully reflect the download logging functionality that had been implemented and tested. I also needed to ensure that the documented security controls matched the actual application.

**What I did instead:**  
I updated the Threat 6 mitigation text in `THREATS.md` to mention both upload and download events. I kept additional improvements, such as logging failed login attempts and denied access events, as future recommendations rather than claiming they were already implemented.

**Verification:**  
I had tested document upload and download functionality and observed the corresponding events in the audit trail. Cross-user download rejection still needs a direct test.

**Commit:**  
Update audit trail threat documentation — [Open the repository's commit history]**Commit:**  
[Document audit trail review in prompts log](https://github.com/shaikfauzia1357-prog/TrustVault/commit/40ee2f0336ad02bfba02ee52b15b4f6eaf18b9ea)