const express = require('express');
const fs = require('fs');
const path = require('path');
const { ApiError, isApiError } = require('./errors');
const {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  updatePassword,
  logout,
  healthCheck,
  resolveTokenFromRequest,
} = require('./auth-service');
const { query } = require('./db');

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

const formatProductRow = (row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  slug: row.slug,
  thumbnailUrl: row.thumbnail_url,
  description: row.description,
  specSummary: row.spec_summary || '',
  price: row.price !== null && row.price !== undefined ? Number(row.price) : 0,
  salePrice: row.sale_price !== null && row.sale_price !== undefined ? Number(row.sale_price) : null,
  stockQuantity: row.stock_quantity !== null && row.stock_quantity !== undefined ? Number(row.stock_quantity) : 0,
  status: row.status,
  brand: {
    name: row.brand_name,
    slug: row.brand_slug,
  },
  category: {
    name: row.category_name,
    slug: row.category_slug,
  },
});

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

app.get(
  '/api/products/home',
  asyncRoute(async (req, res) => {
    const requestedLimit = Number(req.query.limit || 6);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 12) : 6;

    const rows = await query(
      `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.thumbnail_url,
        p.description,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.status,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        ps.spec_summary
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT
          product_id,
          GROUP_CONCAT(CONCAT(spec_key, ': ', spec_value) ORDER BY id SEPARATOR ' / ') AS spec_summary
        FROM product_specs
        GROUP BY product_id
      ) ps ON ps.product_id = p.id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?
      `,
      [limit],
    );

    sendJson(res, 200, {
      success: true,
      message: 'Lấy danh sách sản phẩm nổi bật thành công',
      data: {
        limit,
        products: rows.map(formatProductRow),
      },
    });
  }),
);

app.get(
  '/api/products/category/:slug',
  asyncRoute(async (req, res) => {
    const categorySlug = String(req.params.slug || '').trim();
    if (!categorySlug) {
      throw new ApiError(400, 'Thiếu slug danh mục');
    }

    const requestedLimit = Number(req.query.limit || 4);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 12) : 4;

    const rows = await query(
      `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.thumbnail_url,
        p.description,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.status,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        ps.spec_summary
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT
          product_id,
          GROUP_CONCAT(CONCAT(spec_key, ': ', spec_value) ORDER BY id SEPARATOR ' / ') AS spec_summary
        FROM product_specs
        GROUP BY product_id
      ) ps ON ps.product_id = p.id
      WHERE p.status = 'active' AND c.slug = ?
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?
      `,
      [categorySlug, limit],
    );

    sendJson(res, 200, {
      success: true,
      message: 'Lấy danh sách sản phẩm theo danh mục thành công',
      data: {
        categorySlug,
        limit,
        products: rows.map(formatProductRow),
      },
    });
  }),
);

app.get(
  '/api/products/detail/:slug',
  asyncRoute(async (req, res) => {
    const productSlug = String(req.params.slug || '').trim();
    if (!productSlug) {
      throw new ApiError(400, 'Thiếu slug sản phẩm');
    }

    const productRows = await query(
      `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.thumbnail_url,
        p.description,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.status,
        b.name AS brand_name,
        b.slug AS brand_slug,
        c.name AS category_name,
        c.slug AS category_slug,
        ps.spec_summary
      FROM products p
      INNER JOIN brands b ON b.id = p.brand_id
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT
          product_id,
          GROUP_CONCAT(CONCAT(spec_key, ': ', spec_value) ORDER BY id SEPARATOR ' / ') AS spec_summary
        FROM product_specs
        GROUP BY product_id
      ) ps ON ps.product_id = p.id
      WHERE p.status = 'active' AND p.slug = ?
      LIMIT 1
      `,
      [productSlug],
    );

    if (!productRows || !productRows.length) {
      throw new ApiError(404, 'Không tìm thấy sản phẩm');
    }

    const product = formatProductRow(productRows[0]);

    const images = await query(
      `
      SELECT
        image_url,
        sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [product.id],
    );

    const specs = await query(
      `
      SELECT
        spec_key,
        spec_value
      FROM product_specs
      WHERE product_id = ?
      ORDER BY id ASC
      `,
      [product.id],
    );

    sendJson(res, 200, {
      success: true,
      message: 'Lấy thông tin chi tiết sản phẩm thành công',
      data: {
        product: {
          ...product,
          images: (images || []).map((row) => ({
            imageUrl: row.image_url,
            sortOrder: row.sort_order,
          })),
          specs: (specs || []).map((row) => ({
            key: row.spec_key,
            value: row.spec_value,
          })),
        },
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

app.patch(
  '/api/auth/password',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await updatePassword(token, req.body || {});

    res.setHeader('X-Session-Token', result.session.token);
    res.setHeader('X-Auth-Token', result.session.token);
    sendJson(res, 200, {
      success: true,
      message: 'Đổi mật khẩu thành công',
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
