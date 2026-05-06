(function (window, document) {
  'use strict';

  const DEFAULT_FILE_API_BASE = 'http://localhost:3000/api';
  // prefix KHÔNG gồm "/api" vì buildUrl sẽ tự gắn apiBase = "/api"
  const API_PRODUCTS_DETAIL_PATH_PREFIX = '/products/detail/';

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
    const apiBase = getApiBase();
    if (!path) return apiBase;

    if (/^https?:\/\//i.test(path)) return path;

    if (path.startsWith('/')) return `${apiBase}${path}`;

    return `${apiBase}/${path}`;
  };

  const getQueryParam = (name) => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(name);
    } catch (error) {
      return null;
    }
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
      return '';
    }

    if (/^https?:\/\//i.test(source)) {
      return source;
    }

    if (window.location && window.location.protocol === 'file:' && source.startsWith('/')) {
      return `http://localhost:3000${source}`;
    }

    return source;
  };

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = String(text || '');
  };

  const getProductStateSelectors = () => ({
    breadcrumbCategory: '[data-product-breadcrumb-category]',
    breadcrumbName: '[data-product-breadcrumb-name]',

    galleryMainImage: '[data-product-main-image]',
    galleryThumbs: '[data-product-thumbs]',

    productTag: '[data-product-tag]',
    productTitle: '[data-product-title]',
    productIntro: '[data-product-intro]',

    priceStrong: '[data-product-price-strong]',
    priceCompare: '[data-product-price-compare]',

    featuresContainer: '[data-product-features]',

    mainSection: '[data-product-main-section]',
    errorContainer: '[data-product-error]',
  });

  const setError = (message) => {
    const { errorContainer, mainSection } = getProductStateSelectors();
    const errorEl = document.querySelector(errorContainer);
    if (errorEl) {
      errorEl.innerHTML = `<div class="product-error">${escapeHtml(message || 'Không thể tải thông tin sản phẩm.')}</div>`;
    }
    if (mainSection) {
      const main = document.querySelector(mainSection);
      if (main) main.hidden = false;
    }
  };

  const buildFeaturesHtml = (specs) => {
    const list = Array.isArray(specs) ? specs : [];
    if (!list.length) return '<article><span>Thông tin</span><strong>Chưa có dữ liệu</strong></article>';

    // Giữ giao diện giống form tĩnh hiện tại: mỗi spec là 1 article
    return list
      .map((spec) => {
        const key = escapeHtml(spec.key || '');
        const value = escapeHtml(spec.value || '');
        return `
          <article>
            <span>${key}</span>
            <strong>${value}</strong>
          </article>
        `;
      })
      .join('');
  };

  const formatGalleryAlt = (productName, index) => {
    const safeName = String(productName || 'Sản phẩm');
    return index === 0 ? `${safeName} - ảnh chính` : `${safeName} - ảnh ${index + 1}`;
  };

  const renderGallery = (product, selectors) => {
    const thumbsContainer = document.querySelector(selectors.galleryThumbs);
    const mainImg = document.querySelector(selectors.galleryMainImage);

    const images = Array.isArray(product.images) ? product.images : [];
    const thumbnailUrl = resolveAssetUrl(product.thumbnailUrl);
    const fallback = thumbnailUrl ? [{ imageUrl: thumbnailUrl, sortOrder: 0 }] : [];

    const allImages = images.length ? images : fallback;
    if (!allImages.length) {
      // không thay gì nếu không có ảnh
      return;
    }

    const first = allImages[0];
    if (mainImg) {
      mainImg.src = resolveAssetUrl(first.imageUrl) || mainImg.src;
      mainImg.alt = formatGalleryAlt(product.name, 0);
    }

    if (!thumbsContainer) return;

    thumbsContainer.innerHTML = allImages
      .slice(0, 6)
      .map((img, idx) => {
        const isActive = idx === 0 ? ' thumb-card--active' : '';
        const src = resolveAssetUrl(img.imageUrl);
        const alt = formatGalleryAlt(product.name, idx);
        return `
          <figure class="thumb-card${isActive}">
            <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
          </figure>
        `;
      })
      .join('');

    const thumbCards = Array.from(thumbsContainer.querySelectorAll('.thumb-card'));
    thumbCards.forEach((card, idx) => {
      card.addEventListener('click', () => {
        thumbCards.forEach((c) => c.classList.remove('thumb-card--active'));
        card.classList.add('thumb-card--active');
        if (mainImg) {
          const nextImg = card.querySelector('img');
          if (nextImg) {
            mainImg.src = nextImg.src;
            mainImg.alt = formatGalleryAlt(product.name, idx);
          }
        }
      });
    });
  };

  const renderProduct = (product) => {
    const selectors = getProductStateSelectors();

    // Breadcrumb
    const categoryName = product.category && product.category.name ? product.category.name : '';
    setText(selectors.breadcrumbCategory, categoryName || 'Laptop');
    setText(selectors.breadcrumbName, product.name || '');

    // Tag + Title + Intro
    const tagText =
      product.category && product.category.name ? product.category.name : product.stockQuantity > 0 ? 'Còn hàng' : 'Liên hệ';

    setText(selectors.productTag, tagText);
    setText(selectors.productTitle, product.name || '');
    setText(selectors.productIntro, product.description || product.specSummary || '');

    // Price
    const price = Number(product.price);
    const salePrice = product.salePrice === null || product.salePrice === undefined ? null : Number(product.salePrice);
    const hasSalePrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;

    const strongEl = document.querySelector(selectors.priceStrong);
    const compareEl = document.querySelector(selectors.priceCompare);

    if (strongEl) strongEl.textContent = formatCurrency(hasSalePrice ? salePrice : price);
    if (compareEl) compareEl.textContent = hasSalePrice ? formatCurrency(price) : '';

    if (compareEl) {
      compareEl.hidden = !hasSalePrice;
    }

    // Features
    const featuresEl = document.querySelector(selectors.featuresContainer);
    if (featuresEl) {
      featuresEl.innerHTML = buildFeaturesHtml(product.specs);
    }

    // Gallery
    renderGallery(product, selectors);
  };

  const fetchProductDetail = async (slug) => {
    const path = `${API_PRODUCTS_DETAIL_PATH_PREFIX}${encodeURIComponent(slug)}`;
    const url = buildUrl(path);

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Không tải được thông tin chi tiết sản phẩm.');
    }

    const payload = await response.json();
    const product = payload && payload.data && payload.data.product ? payload.data.product : null;

    if (!product) {
      throw new Error('Không có dữ liệu sản phẩm.');
    }

    return product;
  };

  const init = async () => {
    const slug = getQueryParam('slug');
    if (!slug) {
      setError('Thiếu tham số slug để hiển thị sản phẩm.');
      return;
    }

    const selectors = getProductStateSelectors();
    const errorEl = document.querySelector(selectors.errorContainer);
    if (errorEl) {
      errorEl.innerHTML = '';
    }

    try {
      const product = await fetchProductDetail(slug);
      renderProduct(product);
    } catch (error) {
      setError(error && error.message ? error.message : 'Không thể tải sản phẩm.');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
