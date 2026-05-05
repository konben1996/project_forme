(function (window, document) {
  'use strict';

  const FEATURED_SELECTOR = '[data-home-products]';
  const CATEGORY_SELECTOR = '[data-category-products]';
  const DEFAULT_FILE_API_BASE = 'http://localhost:3000/api';

  const getApiBase = () => {
    const explicitBase =
      window.AUTH_API_BASE_URL ||
      (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.authApiBase) ||
      (document.body && document.body.dataset && document.body.dataset.authApiBase);

    if (explicitBase) {
      return explicitBase.replace(/\/+$/, '');
    }

    if (window.location && window.location.protocol === 'file:') {
      return DEFAULT_FILE_API_BASE;
    }

    return '/api';
  };

  const buildUrl = (path) => {
    if (!path) {
      return getApiBase();
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    if (path.startsWith('/')) {
      return `${getApiBase()}${path}`;
    }

    return `${getApiBase()}/${path}`;
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const escapeHtml = (value) => {
    const temp = document.createElement('textarea');
    temp.textContent = String(value || '');
    return temp.innerHTML;
  };

  const resolveAssetUrl = (value) => {
    const source = String(value || '').trim();
    if (!source) {
      return 'https://placehold.co/600x400?text=Computer+Store';
    }

    if (/^https?:\/\//i.test(source)) {
      return source;
    }

    if (window.location && window.location.protocol === 'file:' && source.startsWith('/')) {
      return `http://localhost:3000${source}`;
    }

    return source;
  };

  const buildSpecText = (product) => {
    if (product.specSummary) {
      return product.specSummary;
    }

    const parts = [];
    if (product.brand && product.brand.name) {
      parts.push(product.brand.name);
    }
    if (product.category && product.category.name) {
      parts.push(product.category.name);
    }
    if (product.stockQuantity !== undefined && product.stockQuantity !== null) {
      parts.push(`Còn ${product.stockQuantity} sản phẩm`);
    }

    return parts.join(' • ') || 'Sản phẩm nổi bật';
  };

  const buildBadgeText = (product) => {
    if (product.category && product.category.name) {
      return product.category.name;
    }

    return product.stockQuantity > 0 ? 'Còn hàng' : 'Liên hệ';
  };

  const buildProductLink = (product) => {
    const slug = encodeURIComponent(product.slug || '');
    return `./src/pages/product.html?slug=${slug}`;
  };

  const buildCardHtml = (product) => {
    const imageUrl = resolveAssetUrl(product.thumbnailUrl);
    const name = escapeHtml(product.name);
    const badge = escapeHtml(buildBadgeText(product));
    const spec = escapeHtml(buildSpecText(product));
    const brandName = escapeHtml(product.brand && product.brand.name ? product.brand.name : '');
    const link = buildProductLink(product);
    const salePrice = Number(product.salePrice);
    const price = Number(product.price);
    const hasSalePrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;
    const stockLabel = Number(product.stockQuantity) > 0 ? `Còn ${Number(product.stockQuantity)} sản phẩm` : 'Hết hàng';

    return `
      <article class="product-card">
        <div class="product-card__image">
          <img src="${imageUrl}" alt="${name}" loading="lazy" decoding="async" />
        </div>
        <p class="product-card__badge">${badge}</p>
        <h3 title="${name}">${name}</h3>
        <p class="product-card__spec">${spec}</p>
        <p class="product-card__meta">${brandName}${brandName ? ' • ' : ''}${escapeHtml(stockLabel)}</p>
        <div class="product-card__price">
          <strong>${formatCurrency(hasSalePrice ? salePrice : price)}</strong>
          ${hasSalePrice ? `<span>${formatCurrency(price)}</span>` : ''}
        </div>
        <a class="btn btn--primary btn--full" href="${link}">Xem chi tiết</a>
      </article>
    `;
  };

  const renderLoading = (container) => {
    container.innerHTML = '<div class="product-grid__status">Đang tải sản phẩm...</div>';
  };

  const renderEmpty = (container, message) => {
    container.innerHTML = `<div class="product-grid__status">${escapeHtml(message || 'Chưa có sản phẩm để hiển thị.')}</div>`;
  };

  const renderProducts = (container, products, emptyMessage) => {
    if (!products || !products.length) {
      renderEmpty(container, emptyMessage || 'Chưa có sản phẩm phù hợp.');
      return;
    }

    container.innerHTML = products.map(buildCardHtml).join('');
  };

  const fetchProducts = async (requestPath) => {
    const response = await fetch(buildUrl(requestPath), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Không tải được danh sách sản phẩm.');
    }

    const payload = await response.json();
    return payload && payload.data && Array.isArray(payload.data.products) ? payload.data.products : [];
  };

  const loadProductsInto = async (container, requestPath, emptyMessage) => {
    if (!container) {
      return;
    }

    renderLoading(container);

    try {
      const products = await fetchProducts(requestPath);
      renderProducts(container, products, emptyMessage);
    } catch (error) {
      renderEmpty(container, 'Không thể tải sản phẩm từ máy chủ.');
    }
  };

  const loadFeaturedProducts = () => {
    const container = document.querySelector(FEATURED_SELECTOR);
    if (!container) {
      return;
    }

    loadProductsInto(container, '/products/home?limit=6', 'Chưa có sản phẩm nổi bật.');
  };

  const loadCategoryProducts = () => {
    const containers = Array.from(document.querySelectorAll(CATEGORY_SELECTOR));

    containers.forEach((container) => {
      const categorySlug = String(container.dataset.categorySlug || '').trim();
      const limit = Number(container.dataset.productLimit || 4);
      const requestedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 12) : 4;

      if (!categorySlug) {
        renderEmpty(container, 'Thiếu slug danh mục.');
        return;
      }

      const requestPath = `/products/category/${encodeURIComponent(categorySlug)}?limit=${requestedLimit}`;
      const emptyMessage = 'Chưa có sản phẩm cho danh mục này.';
      loadProductsInto(container, requestPath, emptyMessage);
    });
  };

  const init = () => {
    loadFeaturedProducts();
    loadCategoryProducts();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
