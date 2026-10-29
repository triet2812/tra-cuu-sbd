/** Server-only configuration. Store SPREADSHEET_ID in Script Properties. */
const CONFIG = Object.freeze({
  sheetName: 'DanhSach',
  headers: ['SBD', 'Họ và tên', 'Điền đơn', 'Đậu'],
  departments: ['Ban Tư vấn - Hỗ trợ', 'Ban Truyền thông', 'Ban Tổ chức sự kiện'],
  requestsPerMinute: 60,
  requestsPerDay: 1000,
  maxRows: 50000
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SGUET · Tra cứu kết quả')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** The only public data RPC. All helpers end in _ to block client RPC access. */
function lookup(payload) {
  try {
    if (!consumeQuota_()) return { ok: false, code: 'RATE_LIMIT', message: 'Hệ thống đã đạt giới hạn tra cứu. Vui lòng thử lại sau.' };
    if (!payload || typeof payload.sbd !== 'string' || payload.sbd.length > 60 ||
        !/^[A-Za-z0-9]{1,30}$/.test(payload.sbd.trim()) ||
        (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 150) ||
        payload.website) {
      return { ok: false, code: 'INVALID', message: 'Vui lòng nhập họ tên và SBD gồm 1–30 chữ cái hoặc chữ số, giữ nguyên số 0 ở đầu.' };
    }
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('Missing configuration');
    const sheet = SpreadsheetApp.openById(id).getSheetByName(CONFIG.sheetName);
    if (!sheet || sheet.getLastRow() < 1 || sheet.getLastRow() > CONFIG.maxRows + 1) throw new Error('Invalid sheet');
    // Only A:D, with display strings preserving leading zeroes. No data cache.
    const rows = sheet.getRange(1, 1, sheet.getLastRow(), 4).getDisplayValues();
    if (!CONFIG.headers.every((header, index) => rows[0][index] === header)) throw new Error('Invalid headers');
    const sbd = payload.sbd.trim().toUpperCase();
    const name = normalizeName_(payload.name);
    const matches = rows.slice(1).filter(row =>
      row[0].trim().toUpperCase() === sbd && normalizeName_(row[1]) === name);
    if (matches.length > 1) throw new Error('Ambiguous identity');
    if (!matches.length) {
      return { ok: true, found: false, message: 'Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.' };
    }
    // Column C is applications, NOT admission results. Only D determines success.
    const departments = parseDepartments_(matches[0][3]);
    return { ok: true, found: true, passed: departments.length > 0, departments: departments };

  } catch (error) {
    // Do not expose stack traces, sheet IDs, or participant data to the browser/logs.
    return { ok: false, code: 'SERVER_ERROR', message: 'Chưa thể tra cứu lúc này. Vui lòng thử lại sau hoặc liên hệ ban tổ chức.' };
  }
}

/** Sheets multi-select chips are exposed as comma-separated display text.
 * Accept newlines/semicolons in imported data too; never silently drop unknown items.
 */
function parseDepartments_(value) {
  if (!value.trim()) return [];
  const items = value.split(/[,;\r\n]+/).map(item => item.trim()).filter(Boolean);
  if (!items.length || items.some(item => !CONFIG.departments.includes(item))) throw new Error('Invalid department');
  return [...new Set(items)];
}

function normalizeName_(value) {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

/** Persistent global quota: anonymous Apps Script requests have no trusted client IP.
 * A shared cap limits total disclosures but is not a per-person anti-bot guarantee.
 * Script Properties store only counters, never SBDs or names. Fail closed on errors.
 */
function consumeQuota_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return false;
  try {
    const properties = PropertiesService.getScriptProperties();
    const now = new Date();
    const minute = String(Math.floor(now.getTime() / 60000));
    const day = Utilities.formatDate(now, 'UTC', 'yyyy-MM-dd');
    const saved = JSON.parse(properties.getProperty('LOOKUP_QUOTA') || '{}');
    const minuteCount = saved.minute === minute ? saved.minuteCount : 0;
    const dayCount = saved.day === day ? saved.dayCount : 0;
    if (!Number.isFinite(minuteCount) || !Number.isFinite(dayCount)) return false;
    if (minuteCount >= CONFIG.requestsPerMinute || dayCount >= CONFIG.requestsPerDay) return false;
    properties.setProperty('LOOKUP_QUOTA', JSON.stringify({
      minute: minute, minuteCount: minuteCount + 1, day: day, dayCount: dayCount + 1
    }));
    return true;
  } finally {
    lock.releaseLock();
  }
}
