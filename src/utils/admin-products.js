(function (window, document) {
  'use strict';

  const ENDPOINT = '/api/admin/products';
  const DEFAULT_PAGE_SIZE = 10;

  const SELECTORS = {
    tbody: '[data-admin-products-tbody]',
    searchInput: '[data-admin-product-search-input]',
    searchButton: '[data-admin-product-search-button]',

    pagePrev: '[data-admin-products-page-prev]',
    pageNext: '[data-admin-products-page-next]',
    pageInfo: '[data-admin-products-page-info]',
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

  const resolveHasSale = (product) => {
    const price = Number(product.price || 0);
    const salePrice = product.salePrice === null || product.salePrice === undefined ? null : Number(product.salePrice);
    return salePrice !== null && Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;
  };

  const buildPriceCell = (product) => {
    const price = Number(product.price || 0);
    const hasSale = resolveHasSale(product);
    const salePrice = product.salePrice === null || product.salePrice === undefined ? null : Number(product.salePrice);

    const formattedPrice = escapeHtml(formatCurrency(price));

    if (!hasSale) {
      return `<strong>${formattedPrice}</strong>`;
    }

    const formattedSalePrice = escapeHtml(formatCurrency(Number(salePrice || 0)));

    return `
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
        <strong>${formattedPrice}</strong>
        <div
          style="
            display:flex; flex-direction:column; align-items:flex-start; gap:4px;
            border:1px solid rgba(22, 163, 74, 0.22);
            background:#dcfce7;
            padding:4px 10px;
            border-radius:12px;
            white-space:nowrap;
            width:fit-content;
            max-width:100%;
          "
        >
          <span style="font-weight:950; color:#166534; font-size:0.85rem;">Giá Sale</span>
          <strong style="color:#166534; font-size:0.95rem; line-height:1;">${formattedSalePrice}</strong>
        </div>
      </div>
    `;
  };

  const buildStockPill = (product) => {
    const inStock = Number(product.stockQuantity || 0) > 0 && product.status === 'active';
    if (inStock) {
      return `<span class="pill pill--ok">Đang bán</span>`;
    }

    return `<span class="pill pill--warn">Hết hàng</span>`;
  };

  const buildRowHtml = (product, index) => {
    const name = escapeHtml(product.name || '');
    const brandName = escapeHtml(product.brand && product.brand.name ? product.brand.name : '');
    const pill = buildStockPill(product);
    const priceHtml = buildPriceCell(product);

    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${name}</strong></td>
        <td>${brandName}</td>
        <td>${priceHtml}</td>
        <td>${pill}</td>
        <td>
          <div class="admin-row-actions">
            <button class="btn btn--ghost btn--sm" type="button">Sửa</button>
            <button class="btn btn--danger btn--sm" type="button">Xóa</button>
          </div>
        </td>
      </tr>
    `;
  };

  const parseProductsPayload = (payload) => {
    const products = payload && payload.data && Array.isArray(payload.data.products) ? payload.data.products : [];
    const totalCount = payload && payload.data && payload.data.totalCount !== undefined ? Number(payload.data.totalCount) : 0;
    return { products, totalCount: Number.isFinite(totalCount) ? totalCount : 0 };
  };

  const setLoading = (tbody) => {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 14px 12px; color: var(--page-muted); font-weight: 850;">
          Đang tải sản phẩm...
        </td>
      </tr>
    `;
  };

  const setEmpty = (tbody) => {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 14px 12px; color: var(--page-muted); font-weight: 850;">
          Chưa có sản phẩm phù hợp.
        </td>
      </tr>
    `;
  };

  const setError = (tbody, message) => {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 14px 12px; color: #b91c1c; font-weight: 850;">
          Lỗi: ${escapeHtml(message || 'Không thể tải dữ liệu')}
        </td>
      </tr>
    `;
  };

  const fetchProducts = async ({ limit, offset, q }) => {
    const url = new URL(ENDPOINT, window.location.origin);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    if (q) {
      url.searchParams.set('q', q);
    }

    const response = await fetch(url.href, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Request failed: ${response.status}`);
    }

    const payload = await response.json();
    return parseProductsPayload(payload);
  };

  const updatePaginationUI = ({ page, pageCount, pagePrevEl, pageNextEl, pageInfoEl }) => {
    const disablePrev = page <= 1;
    const disableNext = page >= pageCount;

    if (pagePrevEl) {
      pagePrevEl.disabled = disablePrev;
      pagePrevEl.style.opacity = disablePrev ? '0.6' : '';
      pagePrevEl.style.pointerEvents = disablePrev ? 'none' : '';
    }

    if (pageNextEl) {
      pageNextEl.disabled = disableNext;
      pageNextEl.style.opacity = disableNext ? '0.6' : '';
      pageNextEl.style.pointerEvents = disableNext ? 'none' : '';
    }

    if (pageInfoEl) {
      pageInfoEl.textContent = `Trang ${page} / ${pageCount}`;
    }
  };

  const init = () => {
    const tbody = document.querySelector(SELECTORS.tbody);
    if (!tbody) return;

    const input = document.querySelector(SELECTORS.searchInput);
    const button = document.querySelector(SELECTORS.searchButton);

    const pagePrevEl = document.querySelector(SELECTORS.pagePrev);
    const pageNextEl = document.querySelector(SELECTORS.pageNext);
    const pageInfoEl = document.querySelector(SELECTORS.pageInfo);

    const readQuery = () => (input ? String(input.value || '').trim() : '');

    let currentPage = 1;
    let currentQuery = readQuery();
    let lastTotalCount = 0;
    let lastPageCount = 1;
    let isLoading = false;

    const loadAndRender = async (page) => {
      if (isLoading) return;
      isLoading = true;

      try {
        const q = currentQuery;
        const limit = DEFAULT_PAGE_SIZE;
        const offset = (page - 1) * limit;

        setLoading(tbody);

        const { products, totalCount } = await fetchProducts({
          limit,
          offset,
          q,
        });

        lastTotalCount = totalCount;

        const pageCount = Math.max(1, Math.ceil(totalCount / limit));

        // Nếu page vượt quá pageCount (do dữ liệu thay đổi), tự về trang cuối
        const safePage = Math.min(Math.max(page, 1), pageCount);
        if (safePage !== page) {
          currentPage = safePage;
          isLoading = false;
          return void loadAndRender(safePage);
        }

        currentPage = page;

        if (!products.length) {
          setEmpty(tbody);
        } else {
          tbody.innerHTML = products.map(buildRowHtml).join('');
        }

        updatePaginationUI({
          page: safePage,
          pageCount,
          totalCount,
          pagePrevEl,
          pageNextEl,
          pageInfoEl,
        });
      } catch (error) {
        const message = error && error.message ? String(error.message) : 'Không thể tải sản phẩm';
        setError(tbody, message);
      } finally {
        isLoading = false;
      }
    };

    const handleSearch = async () => {
      currentQuery = readQuery();
      currentPage = 1;
      await loadAndRender(1);
    };

    if (pagePrevEl) {
      pagePrevEl.addEventListener('click', (event) => {
        event.preventDefault();
        if (currentPage > 1) void loadAndRender(currentPage - 1);
      });
    }

    if (pageNextEl) {
      pageNextEl.addEventListener('click', (event) => {
        event.preventDefault();
        const limit = DEFAULT_PAGE_SIZE;
        const pageCount = Math.max(1, Math.ceil(lastTotalCount / limit));
        if (currentPage < pageCount) void loadAndRender(currentPage + 1);
      });
    }

    if (button) {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        void handleSearch();
      });
    }

    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void handleSearch();
        }
      });
    }

    // initial
    void loadAndRender(1);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
