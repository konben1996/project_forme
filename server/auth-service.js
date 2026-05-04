const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { ApiError } = require('./errors');
const { query, transaction, getTableColumns, quoteIdentifier } = require('./db');

const SESSION_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 7);
const REMEMBER_SESSION_DAYS = Number(process.env.AUTH_REMEMBER_TTL_DAYS || 30);
const BCRYPT_ROUNDS = Number(process.env.AUTH_BCRYPT_ROUNDS || 12);

const USER_TABLE = 'users';
const SESSION_TABLE = 'user_sessions';
const ADDRESS_TABLE = 'user_addresses';

const USER_ID_CANDIDATES = ['user_id', 'id'];
const USERNAME_CANDIDATES = ['username', 'user_name', 'login_name', 'account_name'];
const EMAIL_CANDIDATES = ['email', 'email_address'];
const FULL_NAME_CANDIDATES = ['full_name', 'fullname', 'name', 'display_name'];
const PHONE_CANDIDATES = ['phone', 'phone_number', 'mobile', 'mobile_phone'];
const PASSWORD_CANDIDATES = ['password_hash', 'password', 'hash', 'hashed_password'];
const ROLE_CANDIDATES = ['role', 'user_role'];
const STATUS_CANDIDATES = ['status', 'is_active', 'active'];
const CREATED_AT_CANDIDATES = ['created_at', 'createdAt'];
const UPDATED_AT_CANDIDATES = ['updated_at', 'updatedAt'];

const SESSION_TOKEN_CANDIDATES = ['id', 'token_id', 'session_token', 'token', 'session_key'];
const SESSION_USER_ID_CANDIDATES = ['user_id', 'userId'];
const SESSION_EXPIRES_AT_CANDIDATES = ['expires_at', 'expired_at', 'expiresAt'];
const SESSION_REVOKED_AT_CANDIDATES = ['revoked_at', 'deleted_at', 'invalidated_at', 'revokedAt'];
const SESSION_CREATED_AT_CANDIDATES = ['created_at', 'createdAt'];
const SESSION_UA_CANDIDATES = ['user_agent', 'device_info', 'userAgent'];
const SESSION_IP_CANDIDATES = ['ip_address', 'ip', 'ipAddress'];

const COLUMN_NAME = (name) => String(name).toLowerCase();

const getColumnByCandidates = (columns, candidates) => {
  const lookup = new Map(columns.map((column) => [COLUMN_NAME(column.name), column]));
  for (const candidate of candidates) {
    const matched = lookup.get(COLUMN_NAME(candidate));
    if (matched) {
      return matched;
    }
  }
  return null;
};

const hasColumn = (columns, name) => columns.some((column) => COLUMN_NAME(column.name) === COLUMN_NAME(name));

const formatAddressRow = (row) => {
  if (!row) {
    return null;
  }

  const line1 = normalizeString(row.address_line || row.addressLine1 || row.line1 || row.street || row.streetAddress);
  const ward = normalizeString(row.ward);
  const district = normalizeString(row.district);
  const province = normalizeString(row.province || row.city || row.state);
  const formatted = [line1, ward, district, province].filter(Boolean).join(', ');

  const address = {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name || row.recipientName || '',
    recipientPhone: row.recipient_phone || row.recipientPhone || '',
    line1,
    addressLine1: line1,
    ward,
    district,
    province,
    isDefault: parseBoolean(row.is_default),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };

  if (formatted) {
    address.formatted = formatted;
  }

  return address;
};

const getPrimaryAddressForUser = async (connectionOrPool, userId) => {
  if (!userId) {
    return null;
  }

  const sql = [
    'SELECT',
    '  id,',
    '  label,',
    '  recipient_name,',
    '  recipient_phone,',
    '  address_line,',
    '  ward,',
    '  district,',
    '  province,',
    '  is_default,',
    '  created_at,',
    '  updated_at',
    `FROM ${quoteIdentifier(ADDRESS_TABLE)}`,
    `WHERE ${quoteIdentifier('user_id')} = ?`,
    `ORDER BY ${quoteIdentifier('is_default')} DESC, ${quoteIdentifier('updated_at')} DESC, ${quoteIdentifier('created_at')} DESC, ${quoteIdentifier('id')} DESC`,
    'LIMIT 1',
  ].join(' ');

  const executor = connectionOrPool && typeof connectionOrPool.execute === 'function' ? connectionOrPool : null;
  const [rows] = executor
    ? await connectionOrPool.execute(sql, [userId])
    : await query(sql, [userId]).then((result) => [result]);

  return formatAddressRow(rows[0] || null);
};

const fetchPrimaryAddressRow = async (connectionOrPool, userId) => {
  if (!userId) {
    return null;
  }

  const sql = [
    'SELECT',
    '  id,',
    '  user_id,',
    '  label,',
    '  recipient_name,',
    '  recipient_phone,',
    '  address_line,',
    '  ward,',
    '  district,',
    '  province,',
    '  is_default,',
    '  created_at,',
    '  updated_at',
    `FROM ${quoteIdentifier(ADDRESS_TABLE)}`,
    `WHERE ${quoteIdentifier('user_id')} = ?`,
    `ORDER BY ${quoteIdentifier('is_default')} DESC, ${quoteIdentifier('updated_at')} DESC, ${quoteIdentifier('created_at')} DESC, ${quoteIdentifier('id')} DESC`,
    'LIMIT 1',
  ].join(' ');

  const executor = connectionOrPool && typeof connectionOrPool.execute === 'function' ? connectionOrPool : null;
  const [rows] = executor
    ? await connectionOrPool.execute(sql, [userId])
    : await query(sql, [userId]).then((result) => [result]);

  return rows[0] || null;
};

const splitAddressText = (value) => {
  const segments = normalizeString(value)
    .split(',')
    .map((part) => normalizeString(part))
    .filter(Boolean);

  if (!segments.length) {
    return {
      line1: '',
      ward: '',
      district: '',
      province: '',
    };
  }

  if (segments.length === 1) {
    return {
      line1: segments[0],
      ward: '',
      district: '',
      province: '',
    };
  }

  if (segments.length === 2) {
    return {
      line1: segments[0],
      ward: '',
      district: '',
      province: segments[1],
    };
  }

  if (segments.length === 3) {
    return {
      line1: segments[0],
      ward: '',
      district: segments[1],
      province: segments[2],
    };
  }

  return {
    line1: segments[0],
    ward: segments[1],
    district: segments[2],
    province: segments.slice(3).join(', '),
  };
};

const normalizeAddressInput = (value, fallbackRow) => {
  if (value === null || value === undefined) {
    return null;
  }

  const source = value && typeof value === 'object' ? value : {};
  const sourceText =
    typeof value === 'string'
      ? normalizeString(value)
      : normalizeString(
          source.address ||
            source.formatted ||
            source.addressLine1 ||
            source.line1 ||
            source.street ||
            source.streetAddress ||
            source.address_line ||
            '',
        );

  if (!sourceText && !fallbackRow) {
    return null;
  }

  const parsed = splitAddressText(sourceText);

  const line1 = normalizeString(
    source.line1 ||
      source.addressLine1 ||
      source.street ||
      source.streetAddress ||
      source.address_line ||
      parsed.line1 ||
      (fallbackRow && (fallbackRow.address_line || fallbackRow.addressLine1)) ||
      '',
  );
  const ward = normalizeString(source.ward || parsed.ward || (fallbackRow && fallbackRow.ward) || '');
  const district = normalizeString(source.district || parsed.district || (fallbackRow && fallbackRow.district) || '');
  const province = normalizeString(source.province || source.city || source.state || parsed.province || (fallbackRow && fallbackRow.province) || '');

  return {
    rawText: sourceText,
    line1,
    ward,
    district,
    province,
    recipientName: normalizeString(source.recipientName || source.recipient_name || (fallbackRow && fallbackRow.recipient_name) || ''),
    recipientPhone: normalizeString(source.recipientPhone || source.recipient_phone || (fallbackRow && fallbackRow.recipient_phone) || ''),
    formatted: [line1, ward, district, province].filter(Boolean).join(', '),
  };
};

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const normalizePhone = (value) => normalizeString(value).replace(/[^\d+]/g, '');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'n', 'off', ''].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
};

const sanitizeUsername = (value) => {
  const base = normalizeString(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  return base.slice(0, 40) || 'user';
};

const sanitizeFullName = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return '';
  }
  return normalized.replace(/\s+/g, ' ').slice(0, 120);
};

const titleCaseWords = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const deriveFullNameFromEmail = (email) => {
  const localPart = normalizeEmail(email).split('@')[0] || 'Người dùng';
  const friendly = localPart.replace(/[._-]+/g, ' ').trim();
  return titleCaseWords(friendly || 'Người dùng');
};

const getCurrentTimestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const isAutoIncrementColumn = (column) => /auto_increment/i.test(column.extra || '');

const isRequiredColumn = (column) => {
  const isNullable = String(column.isNullable || '').toUpperCase() === 'YES';
  const hasDefault = column.columnDefault !== null && column.columnDefault !== undefined;
  return !isNullable && !hasDefault && !isAutoIncrementColumn(column);
};

const isTruthyStatus = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  return !['0', 'false', 'inactive', 'disabled', 'blocked', 'banned', 'locked', 'off'].includes(normalized);
};

const getDefaultStatusValue = (column) => {
  const type = `${column.columnType || ''} ${column.dataType || ''}`.toLowerCase();
  if (/(tinyint|smallint|mediumint|int|bigint|decimal|numeric|float|double|bit|bool)/.test(type)) {
    return 1;
  }
  return 'active';
};

const buildInsertSql = (tableName, values) => {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    throw new ApiError(500, `Không thể tạo dữ liệu cho bảng ${tableName}`);
  }

  const columns = entries.map(([name]) => quoteIdentifier(name)).join(', ');
  const placeholders = entries.map(() => '?').join(', ');

  return {
    sql: `INSERT INTO ${quoteIdentifier(tableName)} (${columns}) VALUES (${placeholders})`,
    params: entries.map(([, value]) => value),
  };
};

const selectByColumn = async (connectionOrPool, tableName, columnName, value) => {
  if (!columnName) {
    return null;
  }

  const sql = `SELECT * FROM ${quoteIdentifier(tableName)} WHERE ${quoteIdentifier(columnName)} = ? LIMIT 1`;
  const executor = typeof connectionOrPool.execute === 'function' ? connectionOrPool : null;
  const [rows] = executor
    ? await connectionOrPool.execute(sql, [value])
    : await query(sql, [value]).then((result) => [result]);

  return rows[0] || null;
};

const getUserTableColumns = async () => getTableColumns(USER_TABLE);
const getSessionTableColumns = async () => getTableColumns(SESSION_TABLE);

const buildSafeUserObject = async (row, userColumns, connectionOrPool = null) => {
  const userIdColumn = getColumnByCandidates(userColumns, USER_ID_CANDIDATES);
  const usernameColumn = getColumnByCandidates(userColumns, USERNAME_CANDIDATES);
  const emailColumn = getColumnByCandidates(userColumns, EMAIL_CANDIDATES);
  const fullNameColumn = getColumnByCandidates(userColumns, FULL_NAME_CANDIDATES);
  const phoneColumn = getColumnByCandidates(userColumns, PHONE_CANDIDATES);
  const roleColumn = getColumnByCandidates(userColumns, ROLE_CANDIDATES);
  const statusColumn = getColumnByCandidates(userColumns, STATUS_CANDIDATES);
  const createdAtColumn = getColumnByCandidates(userColumns, CREATED_AT_CANDIDATES);
  const updatedAtColumn = getColumnByCandidates(userColumns, UPDATED_AT_CANDIDATES);

  const safeUser = {
    id: userIdColumn ? row[userIdColumn.name] : row.id,
    username: usernameColumn ? row[usernameColumn.name] : row.username,
    email: emailColumn ? row[emailColumn.name] : row.email,
    fullName: fullNameColumn ? row[fullNameColumn.name] : row.fullName,
    name: fullNameColumn ? row[fullNameColumn.name] : row.name,
    phone: phoneColumn ? row[phoneColumn.name] : row.phone,
    role: roleColumn ? row[roleColumn.name] : row.role,
    status: statusColumn ? row[statusColumn.name] : row.status,
    createdAt: createdAtColumn ? row[createdAtColumn.name] : row.createdAt,
    updatedAt: updatedAtColumn ? row[updatedAtColumn.name] : row.updatedAt,
  };

  if (connectionOrPool && safeUser.id !== undefined && safeUser.id !== null) {
    const address = await getPrimaryAddressForUser(connectionOrPool, safeUser.id);
    if (address) {
      safeUser.address = address;
      safeUser.defaultAddress = address;
      safeUser.shippingAddress = address;
    }
  }

  Object.keys(safeUser).forEach((key) => {
    if (safeUser[key] === undefined) {
      delete safeUser[key];
    }
  });

  return safeUser;
};

const buildSessionObject = (row, sessionColumns) => {
  const tokenColumn = getColumnByCandidates(sessionColumns, SESSION_TOKEN_CANDIDATES);
  const expiresAtColumn = getColumnByCandidates(sessionColumns, SESSION_EXPIRES_AT_CANDIDATES);
  const createdAtColumn = getColumnByCandidates(sessionColumns, SESSION_CREATED_AT_CANDIDATES);

  return {
    token: tokenColumn ? row[tokenColumn.name] : row.token,
    expiresAt: expiresAtColumn ? row[expiresAtColumn.name] : row.expiresAt,
    createdAt: createdAtColumn ? row[createdAtColumn.name] : row.createdAt,
  };
};

const resolveTokenFromRequest = (req) => {
  const authorization = req.get('authorization') || req.get('x-auth-token') || req.get('x-session-token') || req.get('x-access-token');
  if (authorization) {
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return normalizeString(bearerMatch[1]);
    }
    return normalizeString(authorization);
  }

  const bodyToken = req.body && (req.body.token || req.body.sessionToken || req.body.accessToken);
  if (bodyToken) {
    return normalizeString(bodyToken);
  }

  const queryToken = req.query && (req.query.token || req.query.sessionToken || req.query.accessToken);
  return normalizeString(queryToken);
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildUsernameCandidate = (email, username) => {
  if (username) {
    return sanitizeUsername(username);
  }

  const localPart = normalizeEmail(email).split('@')[0];
  return sanitizeUsername(localPart || 'user');
};

const resolveLoginIdentifier = (payload) => {
  const identifier = normalizeString(
    payload.identifier ||
      payload.email ||
      payload.username ||
      payload.login ||
      payload.account ||
      payload.user ||
      '',
  );

  if (!identifier) {
    throw new ApiError(400, 'Vui lòng nhập email hoặc tên đăng nhập');
  }

  return identifier;
};

const validatePassword = (password) => {
  if (normalizeString(password).length < 8) {
    throw new ApiError(400, 'Mật khẩu phải có ít nhất 8 ký tự');
  }
};

const validateRegisterPayload = (payload) => {
  const email = normalizeEmail(payload.email || payload.identifier || '');
  const password = normalizeString(payload.password || '');
  const confirmPassword = normalizeString(
    payload.confirmPassword || payload.passwordConfirm || payload.confirm_password || '',
  );
  const fullName = sanitizeFullName(payload.fullName || payload.name || payload.full_name || '');
  const phone = normalizePhone(payload.phone || payload.phoneNumber || payload.mobile || '');
  const username = normalizeString(payload.username || payload.userName || payload.loginName || '');

  if (!email) {
    throw new ApiError(400, 'Vui lòng nhập email');
  }

  if (!validateEmail(email)) {
    throw new ApiError(400, 'Email không hợp lệ');
  }

  validatePassword(password);

  if (confirmPassword && password !== confirmPassword) {
    throw new ApiError(400, 'Mật khẩu xác nhận không khớp');
  }

  return {
    email,
    password,
    fullName,
    phone,
    username,
    remember: parseBoolean(payload.remember),
  };
};

const getStatusFilter = (userRow, statusColumn) => {
  if (!statusColumn) {
    return true;
  }

  return isTruthyStatus(userRow[statusColumn.name]);
};

const findUserByLoginIdentifier = async (identifier) => {
  const userColumns = await getUserTableColumns();
  if (!userColumns.length) {
    throw new ApiError(500, 'Không đọc được cấu trúc bảng users');
  }

  const emailColumn = getColumnByCandidates(userColumns, EMAIL_CANDIDATES);
  const usernameColumn = getColumnByCandidates(userColumns, USERNAME_CANDIDATES);
  const phoneColumn = getColumnByCandidates(userColumns, PHONE_CANDIDATES);
  const normalizedIdentifier = normalizeString(identifier);
  const normalizedPhone = normalizePhone(identifier);

  if (normalizedIdentifier.includes('@') && emailColumn) {
    const row = await selectByColumn(query, USER_TABLE, emailColumn.name, normalizeEmail(identifier));
    if (row) {
      return { row, userColumns };
    }
  }

  if (phoneColumn && normalizedPhone) {
    const row = await selectByColumn(query, USER_TABLE, phoneColumn.name, normalizedPhone);
    if (row) {
      return { row, userColumns };
    }
  }

  if (usernameColumn) {
    const row = await selectByColumn(query, USER_TABLE, usernameColumn.name, normalizedIdentifier);
    if (row) {
      return { row, userColumns };
    }
  }

  if (emailColumn) {
    const row = await selectByColumn(query, USER_TABLE, emailColumn.name, normalizeEmail(identifier));
    if (row) {
      return { row, userColumns };
    }
  }

  return { row: null, userColumns };
};

const buildUserInsertValues = async (payload) => {
  const userColumns = await getUserTableColumns();
  if (!userColumns.length) {
    throw new ApiError(500, 'Không đọc được cấu trúc bảng users');
  }

  const emailColumn = getColumnByCandidates(userColumns, EMAIL_CANDIDATES);
  const usernameColumn = getColumnByCandidates(userColumns, USERNAME_CANDIDATES);
  const fullNameColumn = getColumnByCandidates(userColumns, FULL_NAME_CANDIDATES);
  const phoneColumn = getColumnByCandidates(userColumns, PHONE_CANDIDATES);
  const passwordColumn = getColumnByCandidates(userColumns, PASSWORD_CANDIDATES);
  const roleColumn = getColumnByCandidates(userColumns, ROLE_CANDIDATES);
  const statusColumn = getColumnByCandidates(userColumns, STATUS_CANDIDATES);
  const createdAtColumn = getColumnByCandidates(userColumns, CREATED_AT_CANDIDATES);
  const updatedAtColumn = getColumnByCandidates(userColumns, UPDATED_AT_CANDIDATES);

  const values = {};

  if (emailColumn) {
    values[emailColumn.name] = payload.email;
  }

  if (usernameColumn) {
    values[usernameColumn.name] = buildUsernameCandidate(payload.email, payload.username);
  }

  if (fullNameColumn) {
    values[fullNameColumn.name] = payload.fullName || deriveFullNameFromEmail(payload.email);
  }

  if (phoneColumn && payload.phone) {
    values[phoneColumn.name] = normalizePhone(payload.phone);
  }

  if (passwordColumn) {
    values[passwordColumn.name] = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
  }

  if (roleColumn) {
    values[roleColumn.name] = 'customer';
  }

  if (statusColumn) {
    values[statusColumn.name] = getDefaultStatusValue(statusColumn);
  }

  if (createdAtColumn && isRequiredColumn(createdAtColumn)) {
    values[createdAtColumn.name] = getCurrentTimestamp();
  }

  if (updatedAtColumn && isRequiredColumn(updatedAtColumn)) {
    values[updatedAtColumn.name] = getCurrentTimestamp();
  }

  for (const column of userColumns) {
    if (!isRequiredColumn(column) || values[column.name] !== undefined) {
      continue;
    }

    const normalizedName = COLUMN_NAME(column.name);
    if (normalizedName.includes('name')) {
      values[column.name] = payload.fullName || deriveFullNameFromEmail(payload.email);
      continue;
    }

    if (normalizedName.includes('email')) {
      values[column.name] = payload.email;
      continue;
    }

    if (normalizedName.includes('user')) {
      values[column.name] = buildUsernameCandidate(payload.email, payload.username);
      continue;
    }

    if (normalizedName.includes('phone') && payload.phone) {
      values[column.name] = normalizePhone(payload.phone);
      continue;
    }

    if (normalizedName.includes('status')) {
      values[column.name] = getDefaultStatusValue(column);
      continue;
    }

    if (normalizedName.includes('role')) {
      values[column.name] = 'customer';
      continue;
    }

    if (normalizedName.includes('password')) {
      values[column.name] = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);
      continue;
    }

    if (/(created|updated)_at/.test(normalizedName)) {
      values[column.name] = getCurrentTimestamp();
    }
  }

  const unresolvedRequiredColumns = userColumns
    .filter((column) => isRequiredColumn(column) && values[column.name] === undefined)
    .map((column) => column.name);

  if (unresolvedRequiredColumns.length) {
    throw new ApiError(
      500,
      `Thiếu dữ liệu cho các cột bắt buộc: ${unresolvedRequiredColumns.join(', ')}`,
    );
  }

  return { values, userColumns };
};

const getExistingUserByUsername = async (username) => {
  const userColumns = await getUserTableColumns();
  const usernameColumn = getColumnByCandidates(userColumns, USERNAME_CANDIDATES);
  if (!usernameColumn) {
    return null;
  }

  return selectByColumn(query, USER_TABLE, usernameColumn.name, username);
};

const createSession = async (connection, userId, context = {}) => {
  const sessionColumns = await getSessionTableColumns();
  if (!sessionColumns.length) {
    throw new ApiError(500, 'Không đọc được cấu trúc bảng user_sessions');
  }

  const tokenColumn = getColumnByCandidates(sessionColumns, SESSION_TOKEN_CANDIDATES);
  const userIdColumn = getColumnByCandidates(sessionColumns, SESSION_USER_ID_CANDIDATES);
  const expiresAtColumn = getColumnByCandidates(sessionColumns, SESSION_EXPIRES_AT_CANDIDATES);
  const revokedAtColumn = getColumnByCandidates(sessionColumns, SESSION_REVOKED_AT_CANDIDATES);
  const createdAtColumn = getColumnByCandidates(sessionColumns, SESSION_CREATED_AT_CANDIDATES);
  const userAgentColumn = getColumnByCandidates(sessionColumns, SESSION_UA_CANDIDATES);
  const ipColumn = getColumnByCandidates(sessionColumns, SESSION_IP_CANDIDATES);

  if (!tokenColumn || !userIdColumn || !expiresAtColumn) {
    throw new ApiError(
      500,
      'Bảng user_sessions cần có các cột token, user_id và expires_at để hoạt động',
    );
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000 * (context.remember ? REMEMBER_SESSION_DAYS : SESSION_DAYS));

  const values = {
    [tokenColumn.name]: token,
    [userIdColumn.name]: userId,
    [expiresAtColumn.name]: expiresAt,
  };

  if (revokedAtColumn) {
    values[revokedAtColumn.name] = null;
  }

  if (createdAtColumn && isRequiredColumn(createdAtColumn)) {
    values[createdAtColumn.name] = now;
  }

  if (userAgentColumn && context.userAgent) {
    values[userAgentColumn.name] = context.userAgent;
  }

  if (ipColumn && context.ipAddress) {
    values[ipColumn.name] = context.ipAddress;
  }

  const { sql, params } = buildInsertSql(SESSION_TABLE, values);
  await connection.execute(sql, params);

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
};

const findSessionByToken = async (token) => {
  const sessionColumns = await getSessionTableColumns();
  if (!sessionColumns.length) {
    throw new ApiError(500, 'Không đọc được cấu trúc bảng user_sessions');
  }

  const tokenColumn = getColumnByCandidates(sessionColumns, SESSION_TOKEN_CANDIDATES);
  if (!tokenColumn) {
    throw new ApiError(500, 'Bảng user_sessions thiếu cột token');
  }

  const session = await selectByColumn(query, SESSION_TABLE, tokenColumn.name, token);
  if (!session) {
    return { session: null, sessionColumns };
  }

  const expiresAtColumn = getColumnByCandidates(sessionColumns, SESSION_EXPIRES_AT_CANDIDATES);
  const revokedAtColumn = getColumnByCandidates(sessionColumns, SESSION_REVOKED_AT_CANDIDATES);

  if (revokedAtColumn && session[revokedAtColumn.name]) {
    return { session: null, sessionColumns };
  }

  if (expiresAtColumn && session[expiresAtColumn.name]) {
    const expiresAt = new Date(session[expiresAtColumn.name]);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      await query(
        `DELETE FROM ${quoteIdentifier(SESSION_TABLE)} WHERE ${quoteIdentifier(tokenColumn.name)} = ?`,
        [token],
      );
      return { session: null, sessionColumns };
    }
  }

  return { session, sessionColumns };
};

const removeSessionByToken = async (token) => {
  const sessionColumns = await getSessionTableColumns();
  if (!sessionColumns.length) {
    throw new ApiError(500, 'Không đọc được cấu trúc bảng user_sessions');
  }

  const tokenColumn = getColumnByCandidates(sessionColumns, SESSION_TOKEN_CANDIDATES);
  const revokedAtColumn = getColumnByCandidates(sessionColumns, SESSION_REVOKED_AT_CANDIDATES);

  if (!tokenColumn) {
    throw new ApiError(500, 'Bảng user_sessions thiếu cột token');
  }

  if (revokedAtColumn) {
    const result = await query(
      `UPDATE ${quoteIdentifier(SESSION_TABLE)} SET ${quoteIdentifier(revokedAtColumn.name)} = NOW() WHERE ${quoteIdentifier(tokenColumn.name)} = ?`,
      [token],
    );
    if (result.affectedRows > 0) {
      return true;
    }
  }

  const result = await query(
    `DELETE FROM ${quoteIdentifier(SESSION_TABLE)} WHERE ${quoteIdentifier(tokenColumn.name)} = ?`,
    [token],
  );

  return result.affectedRows > 0;
};

const register = async (payload, context = {}) => {
  const data = validateRegisterPayload(payload);

  return transaction(async (connection) => {
    const { values, userColumns } = await buildUserInsertValues(data);
    const emailColumn = getColumnByCandidates(userColumns, EMAIL_CANDIDATES);
    const usernameColumn = getColumnByCandidates(userColumns, USERNAME_CANDIDATES);

    if (emailColumn) {
      const existingByEmail = await selectByColumn(connection, USER_TABLE, emailColumn.name, data.email);
      if (existingByEmail) {
        throw new ApiError(409, 'Email đã được sử dụng');
      }
    }

    if (usernameColumn && values[usernameColumn.name]) {
      const existingByUsername = await selectByColumn(connection, USER_TABLE, usernameColumn.name, values[usernameColumn.name]);
      if (existingByUsername) {
        values[usernameColumn.name] = `${values[usernameColumn.name]}${crypto.randomBytes(2).toString('hex')}`;
      }
    }

    const { sql, params } = buildInsertSql(USER_TABLE, values);
    const result = await connection.execute(sql, params);
    const insertedId = result[0]?.insertId || result.insertId;

    const userIdColumn = getColumnByCandidates(userColumns, USER_ID_CANDIDATES);
    const userRow =
      insertedId && userIdColumn
        ? await selectByColumn(connection, USER_TABLE, userIdColumn.name, insertedId)
        : values;

    const safeUser = await buildSafeUserObject(userRow, userColumns, connection);
    const session = await createSession(connection, safeUser.id, context);
    return {
      user: safeUser,
      session,
    };
  });
};

const login = async (payload, context = {}) => {
  const identifier = resolveLoginIdentifier(payload);
  const password = normalizeString(payload.password || '');

  if (!password) {
    throw new ApiError(400, 'Vui lòng nhập mật khẩu');
  }

  const { row: userRow, userColumns } = await findUserByLoginIdentifier(identifier);
  if (!userRow) {
    throw new ApiError(401, 'Thông tin đăng nhập không đúng');
  }

  const passwordColumn = getColumnByCandidates(userColumns, PASSWORD_CANDIDATES);
  if (!passwordColumn) {
    throw new ApiError(500, 'Bảng users thiếu cột mật khẩu');
  }

  const statusColumn = getColumnByCandidates(userColumns, STATUS_CANDIDATES);
  if (!getStatusFilter(userRow, statusColumn)) {
    throw new ApiError(403, 'Tài khoản của bạn hiện chưa được kích hoạt');
  }

  const passwordHash = userRow[passwordColumn.name];
  const isPasswordValid = await bcrypt.compare(password, String(passwordHash || ''));
  if (!isPasswordValid) {
    throw new ApiError(401, 'Thông tin đăng nhập không đúng');
  }

  return transaction(async (connection) => {
    const safeUser = await buildSafeUserObject(userRow, userColumns, connection);
    const session = await createSession(connection, safeUser.id, context);
    return {
      user: safeUser,
      session,
    };
  });
};

const getCurrentUser = async (token) => {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    throw new ApiError(401, 'Vui lòng cung cấp mã phiên đăng nhập');
  }

  const { session, sessionColumns } = await findSessionByToken(normalizedToken);
  if (!session) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const sessionUserIdColumn = getColumnByCandidates(sessionColumns, SESSION_USER_ID_CANDIDATES);
  if (!sessionUserIdColumn) {
    throw new ApiError(500, 'Bảng user_sessions thiếu cột user_id');
  }

  const userColumns = await getUserTableColumns();
  const userIdColumn = getColumnByCandidates(userColumns, USER_ID_CANDIDATES);
  if (!userIdColumn) {
    throw new ApiError(500, 'Bảng users thiếu cột định danh người dùng');
  }

  const userRow = await selectByColumn(query, USER_TABLE, userIdColumn.name, session[sessionUserIdColumn.name]);
  if (!userRow) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const statusColumn = getColumnByCandidates(userColumns, STATUS_CANDIDATES);
  if (!getStatusFilter(userRow, statusColumn)) {
    throw new ApiError(403, 'Tài khoản của bạn hiện chưa được kích hoạt');
  }

  return {
    user: await buildSafeUserObject(userRow, userColumns, query),
    session: buildSessionObject(session, sessionColumns),
  };
};

const updateCurrentUser = async (token, payload = {}, context = {}) => {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    throw new ApiError(401, 'Vui lòng cung cấp mã phiên đăng nhập');
  }

  const { session, sessionColumns } = await findSessionByToken(normalizedToken);
  if (!session) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const sessionUserIdColumn = getColumnByCandidates(sessionColumns, SESSION_USER_ID_CANDIDATES);
  if (!sessionUserIdColumn) {
    throw new ApiError(500, 'Bảng user_sessions thiếu cột user_id');
  }

  const userColumns = await getUserTableColumns();
  const userIdColumn = getColumnByCandidates(userColumns, USER_ID_CANDIDATES);
  const fullNameColumn = getColumnByCandidates(userColumns, FULL_NAME_CANDIDATES);
  const phoneColumn = getColumnByCandidates(userColumns, PHONE_CANDIDATES);

  if (!userIdColumn) {
    throw new ApiError(500, 'Bảng users thiếu cột định danh người dùng');
  }

  const userId = session[sessionUserIdColumn.name];
  const requestedFullName = sanitizeFullName(payload.fullName || payload.name || payload.full_name || '');
  const requestedPhone = normalizePhone(payload.phone || payload.phoneNumber || payload.mobile || payload.sdt || '');
  const addressInput = payload.address;

  const hasAddressInput = (() => {
    if (addressInput === null || addressInput === undefined) {
      return false;
    }

    if (typeof addressInput === 'string') {
      return normalizeString(addressInput).length > 0;
    }

    if (typeof addressInput !== 'object') {
      return false;
    }

    return normalizeString(
      addressInput.address ||
        addressInput.formatted ||
        addressInput.addressLine1 ||
        addressInput.line1 ||
        addressInput.street ||
        addressInput.streetAddress ||
        addressInput.address_line ||
        '',
    ).length > 0;
  })();

  const addressLabel = normalizeString(payload.addressLabel || payload.label) || 'Địa chỉ mặc định';

  return transaction(async (connection) => {
    if (fullNameColumn && requestedFullName) {
      await connection.execute(
        `UPDATE ${quoteIdentifier(USER_TABLE)} SET ${quoteIdentifier(fullNameColumn.name)} = ? WHERE ${quoteIdentifier(userIdColumn.name)} = ?`,
        [requestedFullName, userId],
      );
    }

    if (phoneColumn && requestedPhone) {
      await connection.execute(
        `UPDATE ${quoteIdentifier(USER_TABLE)} SET ${quoteIdentifier(phoneColumn.name)} = ? WHERE ${quoteIdentifier(userIdColumn.name)} = ?`,
        [requestedPhone, userId],
      );
    }

    const existingAddress = await fetchPrimaryAddressRow(connection, userId);

    if (existingAddress || hasAddressInput) {
      const normalizedAddress = hasAddressInput
        ? normalizeAddressInput(addressInput, existingAddress)
        : normalizeAddressInput(existingAddress, existingAddress);

      if (normalizedAddress) {
        const addressValues = {
          label: addressLabel || (existingAddress && existingAddress.label) || 'Địa chỉ mặc định',
          recipient_name:
            requestedFullName ||
            normalizedAddress.recipientName ||
            (existingAddress && existingAddress.recipient_name) ||
            '',
          recipient_phone:
            requestedPhone ||
            normalizedAddress.recipientPhone ||
            (existingAddress && existingAddress.recipient_phone) ||
            '',
          address_line:
            normalizedAddress.line1 ||
            (existingAddress && existingAddress.address_line) ||
            normalizedAddress.rawText ||
            '',
          ward: normalizedAddress.ward || (existingAddress && existingAddress.ward) || null,
          district: normalizedAddress.district || (existingAddress && existingAddress.district) || null,
          province: normalizedAddress.province || (existingAddress && existingAddress.province) || 'Chưa cập nhật',
          is_default: 1,
        };

        if (existingAddress) {
          await connection.execute(
            [
              `UPDATE ${quoteIdentifier(ADDRESS_TABLE)} SET`,
              `${quoteIdentifier('label')} = ?,`,
              `${quoteIdentifier('recipient_name')} = ?,`,
              `${quoteIdentifier('recipient_phone')} = ?,`,
              `${quoteIdentifier('address_line')} = ?,`,
              `${quoteIdentifier('ward')} = ?,`,
              `${quoteIdentifier('district')} = ?,`,
              `${quoteIdentifier('province')} = ?,`,
              `${quoteIdentifier('is_default')} = 1,`,
              `${quoteIdentifier('updated_at')} = NOW()`,
              `WHERE ${quoteIdentifier('id')} = ?`,
            ].join(' '),
            [
              addressValues.label,
              addressValues.recipient_name,
              addressValues.recipient_phone,
              addressValues.address_line,
              addressValues.ward,
              addressValues.district,
              addressValues.province,
              existingAddress.id,
            ],
          );
        } else {
          const { sql, params } = buildInsertSql(ADDRESS_TABLE, {
            user_id: userId,
            label: addressValues.label,
            recipient_name: addressValues.recipient_name || requestedFullName || '',
            recipient_phone: addressValues.recipient_phone || requestedPhone || '',
            address_line: addressValues.address_line,
            ward: addressValues.ward,
            district: addressValues.district,
            province: addressValues.province,
            is_default: 1,
          });
          await connection.execute(sql, params);
        }
      }
    }

    return true;
  }).then(() => getCurrentUser(normalizedToken));
};

const logout = async (token) => {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    throw new ApiError(401, 'Vui lòng cung cấp mã phiên đăng nhập');
  }

  const removed = await removeSessionByToken(normalizedToken);
  if (!removed) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  return {
    loggedOut: true,
  };
};

const healthCheck = async () => {
  const rows = await query('SELECT 1 AS ok');
  return {
    ok: Boolean(rows && rows[0] && rows[0].ok === 1),
  };
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  logout,
  healthCheck,
  resolveTokenFromRequest,
};
