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
const { query, execute } = require('./db');

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

app.get(
  '/api/cart',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await getCurrentUser(token);
    const user = result && result.user ? result.user : null;
    const userId = user && user.id ? user.id : null;

    if (!userId) {
      throw new ApiError(401, 'Vui lòng đăng nhập để xem giỏ hàng');
    }

    let cartRows = await query(
      `
      SELECT id, status, items_count, subtotal_price
      FROM carts
      WHERE user_id = ? AND status = 'open'
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );

    let cartRow = cartRows && cartRows[0] ? cartRows[0] : null;

    if (!cartRow) {
      await execute(
        `
        INSERT INTO carts (user_id, status, items_count, subtotal_price)
        VALUES (?, 'open', 0, 0.00)
        `,
        [userId],
      );

      cartRows = await query(
        `
        SELECT id, status, items_count, subtotal_price
        FROM carts
        WHERE user_id = ? AND status = 'open'
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );

      cartRow = cartRows && cartRows[0] ? cartRows[0] : null;
    }

    if (!cartRow) {
      throw new ApiError(500, 'Không thể tạo giỏ hàng cho người dùng');
    }

    const items = await query(
      `
      SELECT
        ci.id AS cart_item_id,
        ci.product_id,
        ci.quantity,
        ci.unit_price,
        ci.unit_sale_price,
        ci.line_price,
        p.id AS product_id_resolved,
        p.slug,
        p.name,
        p.thumbnail_url,
        p.price AS current_price,
        p.sale_price AS current_sale_price,
        p.stock_quantity,
        p.status AS product_status,
        ps.spec_summary
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      LEFT JOIN (
        SELECT
          product_id,
          GROUP_CONCAT(CONCAT(spec_key, ': ', spec_value) ORDER BY id SEPARATOR ' / ') AS spec_summary
        FROM product_specs
        GROUP BY product_id
      ) ps ON ps.product_id = p.id
      WHERE ci.cart_id = ?
      ORDER BY ci.id ASC
      `,
      [cartRow.id],
    );

    const subtotalPrice = (items || []).reduce((sum, item) => sum + Number(item.line_price || 0), 0);
    const itemsCount = (items || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    sendJson(res, 200, {
      success: true,
      message: 'Lấy giỏ hàng thành công',
      data: {
        cart: {
          id: cartRow.id,
          status: cartRow.status,
          itemsCount,
          subtotalPrice,
        },
        items: (items || []).map((row) => ({
          id: row.cart_item_id,
          productId: row.product_id,
          quantity: Number(row.quantity || 1),
          unitPrice: Number(row.unit_price || 0),
          unitSalePrice: row.unit_sale_price === null || row.unit_sale_price === undefined ? null : Number(row.unit_sale_price),
          linePrice: Number(row.line_price || 0),
          product: {
            id: row.product_id_resolved,
            slug: row.slug,
            name: row.name,
            thumbnailUrl: row.thumbnail_url,
            price: Number(row.current_price || 0),
            salePrice: row.current_sale_price === null || row.current_sale_price === undefined ? null : Number(row.current_sale_price),
            stockQuantity: Number(row.stock_quantity || 0),
            status: row.product_status,
          },
          specSummary: row.spec_summary || '',
        })),
      },
    });
  }),
);

app.post(
  '/api/cart/items',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await getCurrentUser(token);

    const user = result && result.user ? result.user : null;
    const userId = user && user.id ? user.id : null;

    if (!userId) {
      throw new ApiError(401, 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
    }

    const slug = String(req.body && req.body.slug ? req.body.slug : '').trim();
    if (!slug) {
      throw new ApiError(400, 'Thiếu slug sản phẩm');
    }

    const requestedQuantityRaw = req.body && req.body.quantity !== undefined ? req.body.quantity : 1;
    const requestedQuantity = Number(requestedQuantityRaw);
    const quantity = Number.isFinite(requestedQuantity) ? Math.max(1, Math.trunc(requestedQuantity)) : 1;

    const productRows = await query(
      `
      SELECT
        id,
        price,
        sale_price,
        stock_quantity,
        status
      FROM products
      WHERE slug = ? AND status = 'active'
      LIMIT 1
      `,
      [slug],
    );

    if (!productRows || !productRows.length) {
      throw new ApiError(404, 'Không tìm thấy sản phẩm');
    }

    const productRow = productRows[0];
    const productId = productRow.id;

    const basePrice = Number(productRow.price || 0);
    const salePriceRaw = productRow.sale_price === null || productRow.sale_price === undefined ? null : Number(productRow.sale_price);
    const hasValidSale =
      salePriceRaw !== null && Number.isFinite(salePriceRaw) && salePriceRaw > 0 && salePriceRaw < basePrice;

    const effectiveUnitPrice = hasValidSale ? salePriceRaw : basePrice;

    if (Number(productRow.stock_quantity || 0) <= 0) {
      throw new ApiError(409, 'Sản phẩm hiện đã hết hàng');
    }

    // Create/get open cart
    let cartRows = await query(
      `
      SELECT id, status
      FROM carts
      WHERE user_id = ? AND status = 'open'
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );

    let cartRow = cartRows && cartRows[0] ? cartRows[0] : null;

    if (!cartRow) {
      await execute(
        `
        INSERT INTO carts (user_id, status, items_count, subtotal_price)
        VALUES (?, 'open', 0, 0.00)
        `,
        [userId],
      );

      cartRows = await query(
        `
        SELECT id, status
        FROM carts
        WHERE user_id = ? AND status = 'open'
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId],
      );

      cartRow = cartRows && cartRows[0] ? cartRows[0] : null;
    }

    if (!cartRow) {
      throw new ApiError(500, 'Không thể tạo giỏ hàng');
    }

    // Update or insert cart_item
    const existingItems = await query(
      `
      SELECT id, quantity
      FROM cart_items
      WHERE cart_id = ? AND product_id = ?
      LIMIT 1
      `,
      [cartRow.id, productId],
    );

    const unitPrice = basePrice;
    const unitSalePrice = hasValidSale ? salePriceRaw : null;
    const nextLinePriceFor = (nextQty) => effectiveUnitPrice * nextQty;

    if (existingItems && existingItems.length) {
      const existing = existingItems[0];
      const existingQty = Number(existing.quantity || 0);
      const nextQty = Math.max(1, existingQty + quantity);

      await execute(
        `
        UPDATE cart_items
        SET
          quantity = ?,
          unit_price = ?,
          unit_sale_price = ?,
          line_price = ?
        WHERE id = ?
        `,
        [nextQty, unitPrice, unitSalePrice, nextLinePriceFor(nextQty), existing.id],
      );
    } else {
      await execute(
        `
        INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, unit_sale_price, line_price)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [cartRow.id, productId, quantity, unitPrice, unitSalePrice, nextLinePriceFor(quantity)],
      );
    }

    const totalsRows = await query(
      `
      SELECT
        COALESCE(SUM(quantity), 0) AS items_count,
        COALESCE(SUM(line_price), 0.00) AS subtotal_price
      FROM cart_items
      WHERE cart_id = ?
      `,
      [cartRow.id],
    );

    const totals = totalsRows && totalsRows[0] ? totalsRows[0] : null;
    const itemsCount = totals ? Number(totals.items_count || 0) : 0;
    const subtotalPrice = totals ? Number(totals.subtotal_price || 0) : 0;

    await execute(
      `
      UPDATE carts
      SET items_count = ?, subtotal_price = ?
      WHERE id = ?
      `,
      [itemsCount, subtotalPrice, cartRow.id],
    );

    sendJson(res, 200, {
      success: true,
      message: 'Thêm sản phẩm vào giỏ hàng thành công',
      data: {
        cart: {
          id: cartRow.id,
          status: cartRow.status,
          itemsCount,
          subtotalPrice,
        },
      },
    });
  }),
);

app.delete(
  '/api/cart/items',
  asyncRoute(async (req, res) => {
    const token = resolveTokenFromRequest(req);
    const result = await getCurrentUser(token);

    const user = result && result.user ? result.user : null;
    const userId = user && user.id ? user.id : null;

    if (!userId) {
      throw new ApiError(401, 'Vui lòng đăng nhập để xoá sản phẩm khỏi giỏ hàng');
    }

    const requestedId = req.body && (req.body.id || req.body.cartItemId || req.body.cart_item_id);
    const cartItemId = Number(requestedId);

    if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
      throw new ApiError(400, 'Thiếu id sản phẩm trong giỏ hàng');
    }

    const cartRows = await query(
      `
      SELECT id
      FROM carts
      WHERE user_id = ? AND status = 'open'
      ORDER BY id DESC
      LIMIT 1
      `,
      [userId],
    );

    if (!cartRows || !cartRows.length) {
      throw new ApiError(404, 'Không tìm thấy giỏ hàng');
    }

    const cartId = cartRows[0].id;

    const deleteResult = await execute(
      `
      DELETE FROM cart_items
      WHERE cart_id = ? AND id = ?
      `,
      [cartId, cartItemId],
    );

    if (!deleteResult || Number(deleteResult.affectedRows || 0) <= 0) {
      throw new ApiError(404, 'Sản phẩm không tồn tại trong giỏ hàng');
    }

    const totalsRows = await query(
      `
      SELECT
        COALESCE(SUM(quantity), 0) AS items_count,
        COALESCE(SUM(line_price), 0.00) AS subtotal_price
      FROM cart_items
      WHERE cart_id = ?
      `,
      [cartId],
    );

    const totals = totalsRows && totalsRows[0] ? totalsRows[0] : null;
    const itemsCount = totals ? Number(totals.items_count || 0) : 0;
    const subtotalPrice = totals ? Number(totals.subtotal_price || 0) : 0;

    await execute(
      `
      UPDATE carts
      SET items_count = ?, subtotal_price = ?
      WHERE id = ?
      `,
      [itemsCount, subtotalPrice, cartId],
    );

    sendJson(res, 200, {
      success: true,
      message: 'Đã xoá sản phẩm khỏi giỏ hàng',
      data: {
        cart: {
          id: cartId,
          itemsCount,
          subtotalPrice,
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
