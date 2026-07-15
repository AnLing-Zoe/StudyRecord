const TABLES = {
  logs: { name: '讀書紀錄', headers: ['發生日期', '讀書總時長(分鐘)', '讀書科目', '讀書備註'] },
  subjects: { name: '讀書科目', headers: ['讀書科目'] },
  exams: { name: '考程', headers: ['考試名稱', '考試日期', '是否釘選'] },
};
let spreadsheetCache;

function setup() {
  const spreadsheet = getSpreadsheet();
  Object.values(TABLES).forEach(({ name, headers }) => {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function doGet() {
  try {
    setup();
    return jsonResponse({ ok: true, ...readAll() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    setup();
    const { action, payload = {} } = JSON.parse(event.postData.contents || '{}');
    applyAction(action, payload);
    SpreadsheetApp.flush();
    return jsonResponse({ ok: true, ...readAll() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function applyAction(action, payload) {
  switch (action) {
    case 'addLog':
      requireFields(payload, ['date', 'duration', 'subject']);
      getSheet('logs').appendRow([
        payload.date,
        positiveNumber(payload.duration, '讀書總時長'),
        cleanText(payload.subject, '讀書科目'),
        String(payload.notes || '').trim(),
      ]);
      return;
    case 'deleteLog':
      deleteRow('logs', payload.id);
      return;
    case 'addSubject': {
      const subject = cleanText(payload.subject, '讀書科目');
      const exists = readRows('subjects').some(row => String(row[0]).trim() === subject);
      if (!exists) getSheet('subjects').appendRow([subject]);
      return;
    }
    case 'deleteSubject':
      deleteRow('subjects', payload.id);
      return;
    case 'addExam':
      requireFields(payload, ['name', 'date']);
      getSheet('exams').appendRow([cleanText(payload.name, '考試名稱'), payload.date, Boolean(payload.pinned)]);
      return;
    case 'updateExam':
      requireFields(payload, ['id', 'name', 'date']);
      getSheet('exams').getRange(validRow(payload.id, 'exams'), 1, 1, 3)
        .setValues([[cleanText(payload.name, '考試名稱'), payload.date, Boolean(payload.pinned)]]);
      return;
    case 'deleteExam':
      deleteRow('exams', payload.id);
      return;
    default:
      throw new Error('不支援的操作。');
  }
}

function readAll() {
  return {
    logs: readRows('logs').map((row, index) => ({
      id: String(index + 2),
      date: formatDateCell(row[0]),
      duration: Number(row[1]),
      subject: String(row[2]),
      notes: String(row[3] || ''),
    })),
    subjects: readRows('subjects').map((row, index) => ({
      id: String(index + 2),
      name: String(row[0]),
    })).filter(subject => subject.name),
    exams: readRows('exams').map((row, index) => ({
      id: String(index + 2),
      name: String(row[0]),
      date: formatDateCell(row[1]),
      pinned: String(row[2]).toLowerCase() === 'true',
    })),
  };
}

function getSheet(key) {
  return getSpreadsheet().getSheetByName(TABLES[key].name);
}

function getSpreadsheet() {
  if (spreadsheetCache) return spreadsheetCache;
  const properties = PropertiesService.getScriptProperties();
  const savedId = properties.getProperty('SPREADSHEET_ID');
  if (savedId) {
    spreadsheetCache = SpreadsheetApp.openById(savedId);
    return spreadsheetCache;
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('請先從綁定的試算表手動執行 setup()。');
  properties.setProperty('SPREADSHEET_ID', active.getId());
  spreadsheetCache = active;
  return spreadsheetCache;
}

function readRows(key) {
  const sheet = getSheet(key);
  const rowCount = sheet.getLastRow() - 1;
  if (rowCount <= 0) return [];
  return sheet.getRange(2, 1, rowCount, TABLES[key].headers.length).getValues();
}

function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, getSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return String(value).trim().replaceAll('/', '-');
}

function deleteRow(key, id) {
  getSheet(key).deleteRow(validRow(id, key));
}

function validRow(id, key) {
  const row = Number(id);
  const sheet = getSheet(key);
  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) {
    throw new Error('資料列不存在，請重新整理後再試。');
  }
  return row;
}

function requireFields(payload, fields) {
  fields.forEach(field => {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new Error(`缺少必要欄位：${field}`);
    }
  });
}

function cleanText(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label}不可空白。`);
  return text;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label}必須大於 0。`);
  return number;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
