import { StudyLog, StudyPlan, Exam } from './types';

// Helper to make Google Sheets API Requests
async function makeSheetsRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any
) {
  const headers: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    headers.body = JSON.stringify(body);
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${endpoint}`, headers);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Sheets API responded with ${res.status}: ${errorText}`);
  }
  return res.json();
}

// Create a new spreadsheet with the standard tabs
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const spreadsheet = await makeSheetsRequest('', 'POST', accessToken, {
    properties: {
      title: 'Study Tracker - Study Logs & Monthly Plans',
    },
    sheets: [
      { properties: { title: 'Logs' } },
      { properties: { title: 'Plans' } },
      { properties: { title: 'Exams' } },
    ],
  });

  const spreadsheetId = spreadsheet.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet (missing ID).');
  }

  // Initialize headers on all three sheets
  await writeHeaders(spreadsheetId, accessToken);

  return spreadsheetId;
}

// Write the headers to the sheets
async function writeHeaders(spreadsheetId: string, accessToken: string) {
  const data = [
    {
      range: 'Logs!A1:E1',
      values: [['Log ID', 'Date', 'Subject', 'Duration (Min)', 'Notes']],
    },
    {
      range: 'Plans!A1:D1',
      values: [['Plan ID', 'Month', 'Subject', 'Target Hours']],
    },
    {
      range: 'Exams!A1:D1',
      values: [['Exam ID', 'Exam Name', 'Date', 'Pinned']],
    },
  ];

  await makeSheetsRequest(`${spreadsheetId}/values:batchUpdate`, 'POST', accessToken, {
    valueInputOption: 'USER_ENTERED',
    data,
  });
}

// Fetch all data from the spreadsheet
export async function fetchSpreadsheetData(
  spreadsheetId: string,
  accessToken: string
): Promise<{ logs: StudyLog[]; plans: StudyPlan[]; exams: Exam[] }> {
  try {
    // First let's check worksheet metadata to ensure pages exist
    const metadata = await makeSheetsRequest(spreadsheetId, 'GET', accessToken);
    const existingTitles = metadata.sheets?.map((s: any) => s.properties?.title) || [];

    // If tabs are missing, let's create them
    const missingSheets: string[] = [];
    if (!existingTitles.includes('Logs')) missingSheets.push('Logs');
    if (!existingTitles.includes('Plans')) missingSheets.push('Plans');
    if (!existingTitles.includes('Exams')) missingSheets.push('Exams');

    if (missingSheets.length > 0) {
      const requests = missingSheets.map((title) => ({
        addSheet: { properties: { title } },
      }));
      await makeSheetsRequest(`${spreadsheetId}:batchUpdate`, 'POST', accessToken, {
        requests,
      });
      // Rewrite all headers
      await writeHeaders(spreadsheetId, accessToken);
    }

    // Now pull values from each worksheet
    const ranges = ['Logs!A2:E1000', 'Plans!A2:D1000', 'Exams!A2:D1000'];
    const response = await makeSheetsRequest(
      `${spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}`,
      'GET',
      accessToken
    );

    const valueRanges = response.valueRanges || [];

    // Parse Logs
    const logRows = valueRanges[0]?.values || [];
    const logs: StudyLog[] = logRows.map((row: string[]) => ({
      id: row[0] || Math.random().toString(36).substr(2, 9),
      date: row[1] || new Date().toISOString().split('T')[0],
      subject: row[2] || 'Uncategorized',
      duration: parseInt(row[3]) || 0,
      notes: row[4] || '',
    }));

    // Parse Plans
    const planRows = valueRanges[1]?.values || [];
    const plans: StudyPlan[] = planRows.map((row: string[]) => ({
      id: row[0] || Math.random().toString(36).substr(2, 9),
      month: row[1] || new Date().toISOString().slice(0, 7),
      subject: row[2] || 'General',
      targetHours: parseFloat(row[3]) || 0,
    }));

    // Parse Exams
    const examRows = valueRanges[2]?.values || [];
    const exams: Exam[] = examRows.map((row: string[]) => ({
      id: row[0] || Math.random().toString(36).substr(2, 9),
      name: row[1] || 'Upcoming Exam',
      date: row[2] || new Date().toISOString().split('T')[0],
      pinned: row[3] === 'TRUE',
    }));

    return { logs, plans, exams };
  } catch (error) {
    console.error('Error fetching data from Google Sheet:', error);
    throw error;
  }
}

// Bulk sync/write-back all data from the local app back to Google Sheet
export async function syncAllDataToSheet(
  spreadsheetId: string,
  accessToken: string,
  data: { logs: StudyLog[]; plans: StudyPlan[]; exams: Exam[] }
): Promise<void> {
  // Clear old content rows (A2:Z1000 range) to avoid orphan data
  await makeSheetsRequest(`${spreadsheetId}/values/Logs!A2:E1000:clear`, 'POST', accessToken);
  await makeSheetsRequest(`${spreadsheetId}/values/Plans!A2:D1000:clear`, 'POST', accessToken);
  await makeSheetsRequest(`${spreadsheetId}/values/Exams!A2:D1000:clear`, 'POST', accessToken);

  // Compile new data values
  const logValues = data.logs.map((log) => [
    log.id,
    log.date,
    log.subject,
    log.duration.toString(),
    log.notes,
  ]);

  const planValues = data.plans.map((p) => [
    p.id,
    p.month,
    p.subject,
    p.targetHours.toString(),
  ]);

  const examValues = data.exams.map((e) => [
    e.id,
    e.name,
    e.date,
    e.pinned ? 'TRUE' : 'FALSE',
  ]);

  const updates = [];

  if (logValues.length > 0) {
    updates.push({
      range: `Logs!A2:E${1 + logValues.length}`,
      values: logValues,
    });
  }

  if (planValues.length > 0) {
    updates.push({
      range: `Plans!A2:D${1 + planValues.length}`,
      values: planValues,
    });
  }

  if (examValues.length > 0) {
    updates.push({
      range: `Exams!A2:D${1 + examValues.length}`,
      values: examValues,
    });
  }

  if (updates.length > 0) {
    await makeSheetsRequest(`${spreadsheetId}/values:batchUpdate`, 'POST', accessToken, {
      valueInputOption: 'RAW',
      data: updates,
    });
  }
}
