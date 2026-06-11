# Switch StudyRecord Sync to Google Apps Script (GAS) Web App Proxy

We will change the synchronization architecture from direct client-side Google Sheets REST API (requiring Google Sign-in OAuth) to a Google Apps Script Web App bypass (using a simple Web App URL).

## User Review Required

> [!IMPORTANT]
> - **Google OAuth Removal**: We will remove the Firebase Google Auth login from the app. Users will no longer need to sign in with Google in the browser.
> - **Apps Script URL Configuration**: Users will configure their Google Sheets sync by entering a **Google Apps Script Web App URL** in the Sync settings, or via a `.env` variable (`VITE_GOOGLE_APP_SCRIPT_URL`).
> - **New Backend File**: A `backend/Code.js` file will be created in this project containing the Apps Script code that you can copy and deploy in your Google Sheet's Apps Script editor.

## Open Questions

> [!NOTE]
> We will generate the GAS Apps Script code in `backend/Code.js` so you can easily copy and paste it into your spreadsheet script editor.

## Proposed Changes

### Backend (Google Apps Script)

---

#### [NEW] [Code.js](file:///d:/RepoFile/StudyRecord/backend/Code.js)
- Create the GAS code supporting `doGet` (read data from `Logs`, `Plans`, and `Exams` sheets) and `doPost` (resource-specific and bulk data updates with spreadsheet locks).

### Frontend (React/Vite)

---

#### [MODIFY] [sheets.ts](file:///d:/RepoFile/StudyRecord/src/sheets.ts)
- Rewrite `fetchSpreadsheetData`, `syncLogsToSheet`, `syncPlansToSheet`, `syncExamsToSheet`, and `syncAllDataToSheet` to communicate with the GAS Web App URL via GET/POST requests, removing `accessToken` and `spreadsheetId` arguments.

#### [MODIFY] [App.tsx](file:///d:/RepoFile/StudyRecord/src/App.tsx)
- Remove Firebase auth references and state listeners.
- Read `gasUrl` from environment variables or `localStorage`.
- Update sync calls to pass `gasUrl` instead of `spreadsheetId`/`accessToken`.

#### [MODIFY] [SheetLink.tsx](file:///d:/RepoFile/StudyRecord/src/components/SheetLink.tsx)
- Redesign the UI to allow inputting and testing the Google Apps Script Web App URL, removing Google Sign-in/Sign-out buttons.
- Display a quick tutorial on how to get the Web App URL from Google Sheets.

#### [MODIFY] [.env.example](file:///d:/RepoFile/StudyRecord/.env.example)
- Add `VITE_GOOGLE_APP_SCRIPT_URL` placeholder.

## Verification Plan

### Automated Tests
- Run `npm run lint` to verify TypeScript builds with the updated types and parameters.
- Run `npm run build` to confirm production bundles build successfully.

### Manual Verification
- Test entering a mockup Apps Script URL in the "雲端同步" settings tab.
- Verify that saving items triggers background POST requests to the configured GAS URL.
