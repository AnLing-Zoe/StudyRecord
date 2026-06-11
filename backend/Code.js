const SHEETS = {
  logs: {
    name: 'Logs',
    headers: ['Log ID', 'Date', 'Subject', 'Duration (Min)', 'Notes'],
  },
  plans: {
    name: 'Plans',
    headers: ['Plan ID', 'Month', 'Subject', 'Target Hours'],
  },
  exams: {
    name: 'Exams',
    headers: ['Exam ID', 'Exam Name', 'Date', 'Pinned'],
  },
};

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'get';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);

    if (action !== 'get' && action !== 'ping') {
      throw new Error('Unsupported GET action: ' + action);
    }

    return jsonResponse({
      ok: true,
      logs: readLogs(ss),
      plans: readPlans(ss),
      exams: readExams(ss),
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body.');
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets(ss);

    switch (data.action) {
      case 'sync':
        writeLogs(ss, data.logs || []);
        writePlans(ss, data.plans || []);
        writeExams(ss, data.exams || []);
        break;
      case 'sync_logs':
        writeLogs(ss, data.logs || []);
        break;
      case 'sync_plans':
        writePlans(ss, data.plans || []);
        break;
      case 'sync_exams':
        writeExams(ss, data.exams || []);
        break;
      default:
        throw new Error('Unsupported POST action: ' + data.action);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheets(ss) {
  ensureSheet(ss, SHEETS.logs.name, SHEETS.logs.headers);
  ensureSheet(ss, SHEETS.plans.name, SHEETS.plans.headers);
  ensureSheet(ss, SHEETS.exams.name, SHEETS.exams.headers);
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  const hasExpectedHeaders = headers.every((header, index) => currentHeaders[index] === header);
  if (!hasExpectedHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function readLogs(ss) {
  const sheet = ensureSheet(ss, SHEETS.logs.name, SHEETS.logs.headers);
  const values = readBodyValues(sheet, 5);

  return values.map(row => ({
    id: String(row[0] || ''),
    date: String(row[1] || ''),
    subject: String(row[2] || ''),
    duration: Number(row[3]) || 0,
    notes: String(row[4] || ''),
  })).filter(item => item.id);
}

function readPlans(ss) {
  const sheet = ensureSheet(ss, SHEETS.plans.name, SHEETS.plans.headers);
  const values = readBodyValues(sheet, 4);

  return values.map(row => ({
    id: String(row[0] || ''),
    month: String(row[1] || ''),
    subject: String(row[2] || ''),
    targetHours: Number(row[3]) || 0,
  })).filter(item => item.id);
}

function readExams(ss) {
  const sheet = ensureSheet(ss, SHEETS.exams.name, SHEETS.exams.headers);
  const values = readBodyValues(sheet, 4);

  return values.map(row => ({
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    date: String(row[2] || ''),
    pinned: row[3] === true || String(row[3]).toUpperCase() === 'TRUE',
  })).filter(item => item.id);
}

function readBodyValues(sheet, width) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues();
}

function writeLogs(ss, logs) {
  const sheet = ensureSheet(ss, SHEETS.logs.name, SHEETS.logs.headers);
  replaceBody(sheet, 5, logs.map(log => [
    stringValue(log.id),
    stringValue(log.date),
    stringValue(log.subject),
    numberValue(log.duration),
    stringValue(log.notes),
  ]));
  formatBody(sheet, 5, rows => {
    sheet.getRange(2, 1, rows.getNumRows(), 3).setNumberFormat('@');
    sheet.getRange(2, 4, rows.getNumRows(), 1).setNumberFormat('0');
    sheet.getRange(2, 5, rows.getNumRows(), 1).setNumberFormat('@');
  });
}

function writePlans(ss, plans) {
  const sheet = ensureSheet(ss, SHEETS.plans.name, SHEETS.plans.headers);
  replaceBody(sheet, 4, plans.map(plan => [
    stringValue(plan.id),
    stringValue(plan.month),
    stringValue(plan.subject),
    numberValue(plan.targetHours),
  ]));
  formatBody(sheet, 4, rows => {
    sheet.getRange(2, 1, rows.getNumRows(), 3).setNumberFormat('@');
    sheet.getRange(2, 4, rows.getNumRows(), 1).setNumberFormat('0.0');
  });
}

function writeExams(ss, exams) {
  const sheet = ensureSheet(ss, SHEETS.exams.name, SHEETS.exams.headers);
  replaceBody(sheet, 4, exams.map(exam => [
    stringValue(exam.id),
    stringValue(exam.name),
    stringValue(exam.date),
    exam.pinned ? 'TRUE' : 'FALSE',
  ]));
  formatBody(sheet, 4, rows => {
    sheet.getRange(2, 1, rows.getNumRows(), 4).setNumberFormat('@');
  });
}

function replaceBody(sheet, width, rows) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, width).setValues(rows);
  }
}

function formatBody(sheet, width, formatter) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, width);
  formatter(rows);
}

function stringValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function numberValue(value) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}
