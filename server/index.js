const express = require('express');
const fs = require('fs');
const path = require('path');
const { ApiError, isApiError } = require('./errors');
const {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  logout,
  healthCheck,
  resolveTokenFromRequest,
} = require('./auth-service');

const app = express();
const projectRoot = path.resolve(__dirname, '..');
const indexFile = path.join(projectRoot, 'index.html');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token, X-Auth-Token, X-Access-Token, X-Requested-With',
  'Access-Control-Expose-Headers': 'X-Session-Token, X-Auth-Token',
};

app.disable('x-powered-by');

app.use((req, res, next) => {
  Object.entries(corsHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(projectRoot, { index: false, extensions: ['html'] }));

app.get('/', (req, res, next) => {
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return next();
});

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const sendJson = (res, statusCode, payload) => {
  res.status(statusCode).json(payload);
};

app.get(
  '/api/health',
  asyncRoute(async (req, res) => {
    const dbStatus = await healthCheck().catch(() => null);

    if (!dbStatus) {
      throw new ApiError(503, 'Cơ sở dữ liệu chưa sẵn sàng');
    }

    sendJson(res, 200, {
      success: true,
      message: 'API hoạt động bình thường',
      data: {
        status: 'ok',
        database: dbStatus.ok ? 'ok' : 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

app.post(
  '/api/auth/register',
  asyncRoute(async (req, res) => {
    const result = await register(req.body || {}, {
      remember: parseBoolean(req.body && req.body.remember),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.setHeader('X-Session-Token', result.session.token);
    res.setHeader('X-Auth-Token', result.session.token);
    res.setHeader('X-Auth-Token', result.session.token);
    res.setHeader('X-Auth-Token', result.session.token);
    sendJson(res, 201, {
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: result.user,
      session: result.session,
      token: result.session.token,
      data: {
        user: result.user,
        session: result.session,
        token: result.session.token,
      },
    });
  }),
);

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const result = await login(req.body || {}, {
      remember: parseBoolean(req.body && req.body.remember),
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.setHeader('X-Session-Token', result.session.token);
    sendJson(res, 200, {
      success: true,
      message: 'Đăng nhập thành công',
      user: result.user,
      session: result.session,
      token: result.session.token,
      data: {
        user: result.user,
        session: result.session,
        token: result.session.token,
      },
    });
  }),
);

app.get(
  '/api/auth/me',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await getCurrentUser(token);

    res.setHeader('X-Session-Token', result.session.token);
    sendJson(res, 200, {
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      user: result.user,
      session: result.session,
      token: result.session.token,
      data: {
        user: result.user,
        session: result.session,
        token: result.session.token,
      },
    });
  }),
);

app.patch(
  '/api/auth/me',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await updateCurrentUser(token, req.body || {}, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    res.setHeader('X-Session-Token', result.session.token);
    res.setHeader('X-Auth-Token', result.session.token);
    sendJson(res, 200, {
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công',
      user: result.user,
      session: result.session,
      token: result.session.token,
      data: {
        user: result.user,
        session: result.session,
        token: result.session.token,
      },
    });
  }),
);

app.post(
  '/api/auth/logout',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    await logout(token);

    sendJson(res, 200, {
      success: true,
      message: 'Đăng xuất thành công',
      loggedOut: true,
      data: {
        loggedOut: true,
      },
    });
  }),
);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return sendJson(res, 404, {
      success: false,
      message: 'Không tìm thấy API yêu cầu',
    });
  }

  return next(new ApiError(404, 'Không tìm thấy trang'));
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = isApiError(error) ? error.statusCode : error.statusCode || 500;
  const message =
    isApiError(error) || statusCode < 500
      ? error.message || 'Yêu cầu không hợp lệ'
      : 'Lỗi máy chủ nội bộ';

  if (statusCode >= 500) {
    console.error('[auth-api]', error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: message,
    details: error.details,
  });
});

const port = Number(process.env.PORT || 3000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Auth API đang chạy tại http://localhost:${port}`);
  });
}

module.exports = app;
