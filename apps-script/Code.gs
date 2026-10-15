/**
 * Google Apps Script backend for the Spatial Canvas pricing survey.
 * Setup: see README.md ("Collecting responses").
 *
 * doPost: appends a survey response as a row (columns created from the keys, so new fields just work).
 * doGet : returns all rows as JSON, only when ?token=ADMIN_TOKEN matches. Used by admin.html.
 */
const ADMIN_TOKEN = "CHANGE-ME"; // set to a long random string
const SHEET_NAME = "responses";

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sh = sheet_();
    const headers = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) === -1) headers.push(k);
    });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Values starting with =,+,-,@ are prefixed to prevent spreadsheet formula injection.
    const row = headers.map(function (h) {
      const v = data[h] === undefined ? "" : String(data[h]);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sh.appendRow(row);
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (!e.parameter || e.parameter.token !== ADMIN_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const values = sheet_().getDataRange().getValues();
  const headers = values.shift() || [];
  const rows = values.map(function (r) {
    const o = {};
    headers.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}
