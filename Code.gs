const CONFIG = Object.freeze({
  sheetName: 'Đậu Vòng đơn',
  headers: ['SBD', 'Họ và tên', 'Điền đơn', 'Đậu'],
  departments: [
    'Ban Tư vấn - Hỗ trợ',
    'Ban Truyền thông',
    'Ban Tổ chức sự kiện'
  ],
  requestsPerMinute: 60,
  requestsPerDay: 1000,
  maxRows: 50000
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SGUET · Tra cứu kết quả')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Hàm được Index.html gọi qua google.script.run.
 * Chỉ trả kết quả của dòng khớp cả SBD và họ tên.
 */
function lookup(payload) {
  try {
    if (!consumeQuota_()) {
      return {
        ok: false,
        code: 'RATE_LIMIT',
        message: 'Hệ thống đã đạt giới hạn tra cứu. Vui lòng thử lại sau.'
      };
    }

    if (
      !payload ||
      typeof payload.sbd !== 'string' ||
      payload.sbd.length > 60 ||
      !/^[A-Za-z0-9]{1,30}$/.test(payload.sbd.trim()) ||
      typeof payload.name !== 'string' ||
      !payload.name.trim() ||
      payload.name.length > 150 ||
      payload.website
    ) {
      return {
        ok: false,
        code: 'INVALID',
        message: 'Vui lòng nhập họ tên và SBD hợp lệ, giữ nguyên số 0 ở đầu.'
      };
    }

    const rows = readLookupRows_();
    const sbd = payload.sbd.trim().toUpperCase();
    const name = normalizeText_(payload.name);

    const matches = rows.slice(1).filter(function (row) {
      return row[0].trim().toUpperCase() === sbd &&
        normalizeText_(row[1]) === name;
    });

    if (matches.length > 1) {
      throw lookupError_('DUPLICATE_IDENTITY');
    }

    if (matches.length === 0) {
      return {
        ok: true,
        found: false,
        message: 'Không tìm thấy kết quả phù hợp. Vui lòng kiểm tra lại SBD và họ tên.'
      };
    }

    // Chỉ lấy kết quả cột D: Đậu.
    // Không dùng cột C: Điền đơn để xác định kết quả.
    const departments = parseDepartments_(matches[0][3]);

    return {
      ok: true,
      found: true,
      passed: departments.length > 0,
      departments: departments
    };
  } catch (error) {
    // Chỉ ghi mã lỗi an toàn, không ghi dữ liệu ứng viên.
    console.error('SGUET_LOOKUP:' + safeErrorCode_(error));

    return {
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Chưa thể tra cứu lúc này. Vui lòng thử lại sau hoặc liên hệ ban tổ chức.'
    };
  }
}

/**
 * Đọc dữ liệu mới từ Sheets trong mỗi lần tra cứu.
 * Dùng chuỗi hiển thị để giữ số 0 đầu SBD.
 */
function readLookupRows_() {
  const id = (
    PropertiesService.getScriptProperties()
      .getProperty('SPREADSHEET_ID') || ''
  ).trim();

  if (!id) {
    throw lookupError_('MISSING_SPREADSHEET_ID');
  }

  let spreadsheet;

  try {
    spreadsheet = SpreadsheetApp.openById(id);
  } catch (error) {
    throw lookupError_('SHEET_ACCESS_FAILED');
  }

  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    throw lookupError_('SHEET_NOT_FOUND');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 1 || lastRow > CONFIG.maxRows + 1) {
    throw lookupError_('INVALID_ROW_COUNT');
  }

  let rows;

  try {
    rows = sheet.getRange(1, 1, lastRow, 4).getDisplayValues();
  } catch (error) {
    throw lookupError_('SHEET_READ_FAILED');
  }

  const validHeaders = CONFIG.headers.every(function (header, index) {
    return normalizeText_(rows[0][index]) === normalizeText_(header);
  });

  if (!validHeaders) {
    throw lookupError_('INVALID_HEADERS');
  }

  return rows;
}

/**
 * Tách đầy đủ các lựa chọn của multi-select dropdown.
 * Chấp nhận dấu phẩy, chấm phẩy hoặc xuống dòng.
 */
function parseDepartments_(value) {
  if (!value.trim()) {
    return [];
  }

  const items = value
    .split(/[,;\r\n]+/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean)
    .map(function (item) {
      return CONFIG.departments.find(function (department) {
        return normalizeText_(department) === normalizeText_(item);
      }) || item;
    });

  const invalid = items.length === 0 || items.some(function (item) {
    return !CONFIG.departments.includes(item);
  });

  if (invalid) {
    throw lookupError_('INVALID_DEPARTMENT');
  }

  return [...new Set(items)];
}

/**
 * Bỏ khác biệt hoa/thường và khoảng trắng thừa.
 * Vẫn giữ dấu tiếng Việt, không so khớp một phần.
 */
function normalizeText_(value) {
  return String(value)
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');
}

/**
 * Giới hạn chung toàn ứng dụng.
 * Không lưu SBD hoặc họ tên trong bộ đếm.
 */
function consumeQuota_() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(3000)) {
    return false;
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const now = new Date();
    const minute = String(Math.floor(now.getTime() / 60000));
    const day = Utilities.formatDate(now, 'UTC', 'yyyy-MM-dd');

    const saved = JSON.parse(
      properties.getProperty('LOOKUP_QUOTA') || '{}'
    );

    const minuteCount = saved.minute === minute
      ? saved.minuteCount
      : 0;

    const dayCount = saved.day === day
      ? saved.dayCount
      : 0;

    if (
      !Number.isInteger(minuteCount) ||
      !Number.isInteger(dayCount) ||
      minuteCount < 0 ||
      dayCount < 0
    ) {
      return false;
    }

    if (
      minuteCount >= CONFIG.requestsPerMinute ||
      dayCount >= CONFIG.requestsPerDay
    ) {
      return false;
    }

    properties.setProperty('LOOKUP_QUOTA', JSON.stringify({
      minute: minute,
      minuteCount: minuteCount + 1,
      day: day,
      dayCount: dayCount + 1
    }));

    return true;
  } finally {
    lock.releaseLock();
  }
}

function lookupError_(code) {
  const error = new Error(code);
  error.lookupCode = code;
  return error;
}

function safeErrorCode_(error) {
  const allowed = [
    'MISSING_SPREADSHEET_ID',
    'SHEET_ACCESS_FAILED',
    'SHEET_NOT_FOUND',
    'INVALID_ROW_COUNT',
    'INVALID_HEADERS',
    'SHEET_READ_FAILED',
    'DUPLICATE_IDENTITY',
    'INVALID_DEPARTMENT'
  ];

  return error && allowed.includes(error.lookupCode)
    ? error.lookupCode
    : 'UNEXPECTED_ERROR';
}

/**
 * Chạy thủ công trong trình soạn thảo Apps Script.
 * Hàm có dấu _ cuối tên nên không gọi được từ google.script.run.
 * Không sửa bảng, không ghi thông tin ứng viên ra log.
 */
function diagnoseSetup_() {
  try {
    const rows = readLookupRows_();

    rows.slice(1).forEach(function (row) {
      parseDepartments_(row[3]);
    });

    console.log('SGUET_SETUP:OK');
    return 'OK';
  } catch (error) {
    const code = safeErrorCode_(error);
    console.error('SGUET_SETUP:' + code);
    return code;
  }
}
function kiemTraCauHinh() {
  const id = PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID');

  if (!id || !id.trim()) {
    console.log('CHUA_CO_ID: Chưa cấu hình SPREADSHEET_ID.');
    return;
  }

  try {
    const bangTinh = SpreadsheetApp.openById(id.trim());
    const tab = bangTinh.getSheetByName(CONFIG.sheetName);

    if (!tab) {
      console.log('SAI_TEN_TAB: Không tìm thấy tab theo CONFIG.sheetName.');
      return;
    }

    console.log('OK: Đã mở được bảng tính và tìm thấy tab.');
  } catch (error) {
    console.log('LOI: Không mở được bảng. Cần kiểm tra ID và quyền truy cập.');
  }
}
