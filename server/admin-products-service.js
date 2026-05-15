const { ApiError } = require('./errors');
const { query, transaction } = require('./db');

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeSlug = (value) => normalizeString(value).toLowerCase();

const parseDecimalMoney = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
};

const clampString255 = (value) => {
  const s = normalizeString(value);
  if (!s) return '';
  return s.length > 255 ? s.slice(0, 255) : s;
};

const clampString120 = (value) => {
  const s = normalizeString(value);
  if (!s) return '';
  return s.length > 120 ? s.slice(0, 120) : s;
};

const extractExtraSpecsFromPayload = (body) => {
  const safeBody = body || {};
  const specs = [];

  for (let i = 1; i <= 8; i += 1) {
    const key = clampString120(safeBody[`specKey${i}`]);
    const value = clampString255(safeBody[`specValue${i}`]);

    if (!key || !value) continue;

    specs.push({ key, value });
  }

  return specs;
};

const toSalePriceOrNull = ({ price, salePrice }) => {
  if (salePrice === null) return null;
  const p = Number(price || 0);
  const sp = Number(salePrice);

  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(sp) || sp <= 0) return null;
  if (sp >= p) return null;
  return sp;
};

const getOrCreateBrand = async (connection, { slug, name }) => {
  const brandSlug = normalizeSlug(slug);
  if (!brandSlug) {
    throw new ApiError(400, 'Thiếu brand');
  }

  const brandName = normalizeString(name);
  const [rows] = await connection.execute('SELECT id FROM brands WHERE slug = ? LIMIT 1', [brandSlug]);

  if (rows && rows[0]) {
    return rows[0].id;
  }

  const finalName = brandName || brandSlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const [result] = await connection.execute('INSERT INTO brands (name, slug) VALUES (?, ?)', [finalName, brandSlug]);

  return result.insertId;
};

const getOrCreateCategory = async (connection, { slug, name }) => {
  const categorySlug = normalizeSlug(slug);
  if (!categorySlug) {
    throw new ApiError(400, 'Thiếu category');
  }

  const categoryName = normalizeString(name);
  const [rows] = await connection.execute('SELECT id FROM categories WHERE slug = ? LIMIT 1', [categorySlug]);

  if (rows && rows[0]) {
    return rows[0].id;
  }

  const finalName = categoryName || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const [result] = await connection.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [finalName, categorySlug]);

  return result.insertId;
};

const createProduct = async (payload) => {
  const body = payload || {};

  const productName = normalizeString(body.productName || body.name);
  const sku = normalizeString(body.sku);
  const productSlug = normalizeSlug(body.slug || body.productSlug);

  const brand = body.brand || {};
  const brandSlug = body.brandSlug || brand.slug || body.brand_value || body.brandValue || body.brandCode;
  const brandName = body.brandName || brand.name || body.brand_label || brand.label;

  const category = body.category || {};
  const categorySlug = body.categorySlug || category.slug || body.category_value || body.categoryValue;
  const categoryName = body.categoryName || category.name;

  const price = parseDecimalMoney(body.salePrice ?? body.price);
  const salePriceRaw = parseDecimalMoney(body.sale_price ?? body.salePriceSale ?? body.salePriceSalePrice ?? body.salePriceSale_price);

  const description = normalizeString(body.description);
  const thumbnailUrl = normalizeString(body.mainImageUrl || body.thumbnailUrl || body.thumbnail_url);

  const sideImage1Url = normalizeString(body.sideImage1Url || body.sideImage_1 || body.sideImage1 || body.side1ImageUrl);
  const sideImage2Url = normalizeString(body.sideImage2Url || body.sideImage_2 || body.sideImage2 || body.side2ImageUrl);
  const sideImage3Url = normalizeString(body.sideImage3Url || body.sideImage_3 || body.sideImage3 || body.side3ImageUrl);

  if (!productName) throw new ApiError(400, 'Thiếu tên sản phẩm');
  if (!sku) throw new ApiError(400, 'Thiếu SKU');
  if (!productSlug) throw new ApiError(400, 'Thiếu slug sản phẩm');
  if (!brandSlug) throw new ApiError(400, 'Thiếu brand');
  if (!categorySlug) throw new ApiError(400, 'Thiếu category');
  if (!thumbnailUrl) throw new ApiError(400, 'Thiếu ảnh chính (mainImageUrl)');

  const safePrice = Number.isFinite(price) ? Math.max(0, Number(price)) : 0;
  const salePrice = toSalePriceOrNull({ price: safePrice, salePrice: salePriceRaw });

  const status = body.status ? normalizeString(body.status) : 'active';
  const stockQuantity = Number.isFinite(Number(body.stockQuantity)) ? Math.max(0, Math.trunc(Number(body.stockQuantity))) : 10;

  return transaction(async (connection) => {
    const brandId = await getOrCreateBrand(connection, { slug: brandSlug, name: brandName });
    const categoryId = await getOrCreateCategory(connection, { slug: categorySlug, name: categoryName });

    const productInsertSql = `
      INSERT INTO products
        (sku, name, slug, brand_id, category_id, thumbnail_url, description, price, sale_price, stock_quantity, status)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [productResult] = await connection.execute(productInsertSql, [
      sku,
      productName,
      productSlug,
      brandId,
      categoryId,
      thumbnailUrl,
      description || '',
      safePrice,
      salePrice,
      stockQuantity,
      status,
    ]);

    const productId = productResult.insertId;
    if (!productId) {
      throw new ApiError(500, 'Không thể tạo sản phẩm');
    }

    const images = [
      { url: thumbnailUrl, sort: 1 },
      sideImage1Url ? { url: sideImage1Url, sort: 2 } : null,
      sideImage2Url ? { url: sideImage2Url, sort: 3 } : null,
      sideImage3Url ? { url: sideImage3Url, sort: 4 } : null,
    ].filter(Boolean);

    for (const img of images) {
      await connection.execute(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
        [productId, img.url, img.sort],
      );
    }

    const extraSpecs = extractExtraSpecsFromPayload(body).filter((s) => String(s.key).toLowerCase() !== 'description');

    if (description) {
      await connection.execute(
        'INSERT INTO product_specs (product_id, spec_key, spec_value) VALUES (?, ?, ?)',
        [productId, 'Description', clampString255(description)],
      );
    }

    for (const spec of extraSpecs) {
      await connection.execute(
        'INSERT INTO product_specs (product_id, spec_key, spec_value) VALUES (?, ?, ?)',
        [productId, spec.key, spec.value],
      );
    }

    return { productId };
  });
};

const getAdminCatalog = async () => {
  const brands = await query('SELECT name, slug FROM brands ORDER BY id ASC');
  const categories = await query('SELECT name, slug FROM categories ORDER BY id ASC');

  return {
    brands: (brands || []).map((b) => ({ name: b.name, slug: b.slug })),
    categories: (categories || []).map((c) => ({ name: c.name, slug: c.slug })),
  };
};

const getProductForEdit = async (productId) => {
  const pid = Number(productId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new ApiError(400, 'productId không hợp lệ');
  }

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
      b.slug AS brand_slug,
      b.name AS brand_name,
      c.slug AS category_slug,
      c.name AS category_name
    FROM products p
    INNER JOIN brands b ON b.id = p.brand_id
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
    LIMIT 1
    `,
    [pid],
  );

  if (!rows || !rows.length) {
    throw new ApiError(404, 'Không tìm thấy sản phẩm');
  }

  const product = rows[0];

  const images = await query(
    `
    SELECT image_url, sort_order
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC, id ASC
    `,
    [pid],
  );

  const bySort = new Map((images || []).map((r) => [Number(r.sort_order), r.image_url]));
  const mainImageUrl = bySort.get(1) || '';
  const sideImage1Url = bySort.get(2) || '';
  const sideImage2Url = bySort.get(3) || '';
  const sideImage3Url = bySort.get(4) || '';

  const extraSpecsRows = await query(
    `
    SELECT
      spec_key,
      spec_value
    FROM product_specs
    WHERE product_id = ? AND spec_key <> 'Description'
    ORDER BY id ASC
    `,
    [pid],
  );

  const extraSpecs = (extraSpecsRows || [])
    .slice(0, 8)
    .map((r) => ({
      specKey: r.spec_key,
      specValue: r.spec_value,
    }));

  return {
    product: {
      id: product.id,
      sku: product.sku,
      productName: product.name,
      slug: product.slug,

      brandSlug: product.brand_slug,
      brandName: product.brand_name,

      categorySlug: product.category_slug,
      categoryName: product.category_name,

      salePrice: product.price !== null && product.price !== undefined ? Number(product.price) : 0,
      sale_price: product.sale_price === null || product.sale_price === undefined ? null : Number(product.sale_price),

      description: product.description || '',

      mainImageUrl,
      sideImage1Url: sideImage1Url || null,
      sideImage2Url: sideImage2Url || null,
      sideImage3Url: sideImage3Url || null,

      stockQuantity: product.stock_quantity !== null && product.stock_quantity !== undefined ? Number(product.stock_quantity) : null,
      status: product.status || null,
      extraSpecs,
    },
  };
};

const updateProductById = async (productId, payload) => {
  const pid = Number(productId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new ApiError(400, 'productId không hợp lệ');
  }

  const body = payload || {};

  const productName = normalizeString(body.productName || body.name);
  const sku = normalizeString(body.sku);
  const productSlug = normalizeSlug(body.slug || body.productSlug);

  const brand = body.brand || {};
  const brandSlug = body.brandSlug || brand.slug || body.brand_value || body.brandValue || body.brandCode;
  const brandName = body.brandName || brand.name || body.brand_label || brand.label;

  const category = body.category || {};
  const categorySlug = body.categorySlug || category.slug || body.category_value || body.categoryValue;
  const categoryName = body.categoryName || category.name;

  const price = parseDecimalMoney(body.salePrice ?? body.price);
  const salePriceRaw = parseDecimalMoney(
    body.sale_price ?? body.salePriceSale ?? body.salePriceSalePrice ?? body.salePriceSale_price,
  );

  const description = normalizeString(body.description);
  const thumbnailUrl = normalizeString(body.mainImageUrl || body.thumbnailUrl || body.thumbnail_url);

  const sideImage1Url = normalizeString(body.sideImage1Url || body.sideImage_1 || body.sideImage1 || body.side1ImageUrl);
  const sideImage2Url = normalizeString(body.sideImage2Url || body.sideImage_2 || body.sideImage2 || body.side2ImageUrl);
  const sideImage3Url = normalizeString(body.sideImage3Url || body.sideImage_3 || body.sideImage3 || body.side3ImageUrl);

  if (!productName) throw new ApiError(400, 'Thiếu tên sản phẩm');
  if (!sku) throw new ApiError(400, 'Thiếu SKU');
  if (!productSlug) throw new ApiError(400, 'Thiếu slug sản phẩm');
  if (!brandSlug) throw new ApiError(400, 'Thiếu brand');
  if (!categorySlug) throw new ApiError(400, 'Thiếu category');
  if (!thumbnailUrl) throw new ApiError(400, 'Thiếu ảnh chính (mainImageUrl)');
  if (!Number.isFinite(price)) throw new ApiError(400, 'Vui lòng nhập giá bán (Sprice)');

  const safePrice = Number.isFinite(price) ? Math.max(0, Number(price)) : 0;
  const salePrice = toSalePriceOrNull({ price: safePrice, salePrice: salePriceRaw });

  const statusFromPayload = body.status ? normalizeString(body.status) : null;
  const stockQuantityFromPayload = Number.isFinite(Number(body.stockQuantity))
    ? Math.max(0, Math.trunc(Number(body.stockQuantity)))
    : null;

  return transaction(async (connection) => {
    const existingRows = await connection.execute('SELECT stock_quantity, status FROM products WHERE id = ? LIMIT 1', [pid]);
    const existing = existingRows && existingRows[0] ? existingRows[0][0] : null;

    if (!existing) {
      throw new ApiError(404, 'Không tìm thấy sản phẩm');
    }

    const stockQuantity = stockQuantityFromPayload !== null ? stockQuantityFromPayload : Number(existing.stock_quantity || 0);
    const status = statusFromPayload !== null ? statusFromPayload : existing.status || 'active';

    const brandId = await getOrCreateBrand(connection, { slug: brandSlug, name: brandName });
    const categoryId = await getOrCreateCategory(connection, { slug: categorySlug, name: categoryName });

    const productUpdateSql = `
      UPDATE products
      SET
        sku = ?,
        name = ?,
        slug = ?,
        brand_id = ?,
        category_id = ?,
        thumbnail_url = ?,
        description = ?,
        price = ?,
        sale_price = ?,
        stock_quantity = ?,
        status = ?
      WHERE id = ?
    `;

    try {
      await connection.execute(productUpdateSql, [
        sku,
        productName,
        productSlug,
        brandId,
        categoryId,
        thumbnailUrl,
        description || '',
        safePrice,
        salePrice,
        stockQuantity,
        status,
        pid,
      ]);

      await connection.execute('DELETE FROM product_images WHERE product_id = ?', [pid]);

      const images = [
        { url: thumbnailUrl, sort: 1 },
        sideImage1Url ? { url: sideImage1Url, sort: 2 } : null,
        sideImage2Url ? { url: sideImage2Url, sort: 3 } : null,
        sideImage3Url ? { url: sideImage3Url, sort: 4 } : null,
      ].filter(Boolean);

      for (const img of images) {
        await connection.execute(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
          [pid, img.url, img.sort],
        );
      }

      await connection.execute('DELETE FROM product_specs WHERE product_id = ?', [pid]);
      if (description) {
        await connection.execute(
          'INSERT INTO product_specs (product_id, spec_key, spec_value) VALUES (?, ?, ?)',
          [pid, 'Description', clampString255(description)],
        );
      }

      const extraSpecs = extractExtraSpecsFromPayload(body).filter(
        (s) => String(s.key).toLowerCase() !== 'description',
      );

      for (const spec of extraSpecs) {
        await connection.execute(
          'INSERT INTO product_specs (product_id, spec_key, spec_value) VALUES (?, ?, ?)',
          [pid, spec.key, spec.value],
        );
      }

      return { productId: pid };
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        throw new ApiError(409, 'SKU hoặc slug đã tồn tại');
      }
      throw err;
    }
  });
};

module.exports = {
  getAdminCatalog,
  createProduct,

  getProductForEdit,
  updateProductById,
};
