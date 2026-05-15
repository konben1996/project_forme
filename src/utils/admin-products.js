(function (window, document) {
  'use strict';

  const ENDPOINT = '/api/admin/products';
  const DEFAULT_LIMIT = 20;

  const SELECTORS = {
    tbody: '[data-admin-products-tbody]',
    searchInput: '[data-admin-product-search-input]',
    searchButton: '[data-admin-product-search-button]',
    statusCellTemplate: '[data-admin-products-status]',
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
    return products;
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

  const fetchProducts = async ({ limit, q }) => {
    const url = new URL(ENDPOINT, window.location.origin);
    url.searchParams.set('limit', String(limit || DEFAULT_LIMIT));
    if (q) {
      url.searchParams.set('q', q);
    }

    const response = await fetch(url.href, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Request failed: ${response.status}`);
    }

    const payload = await response.json();
    return parseProductsPayload(payload);
  };

  const loadAndRender = async (opts) => {
    const tbody = document.querySelector(SELECTORS.tbody);
    if (!tbody) return;

    const { q, limit } = opts || {};

    setLoading(tbody);

    try {
      const products = await fetchProducts({ limit: limit || DEFAULT_LIMIT, q });

      if (!products.length) {
        setEmpty(tbody);
        return;
      }

      tbody.innerHTML = products.map(buildRowHtml).join('');
    } catch (error) {
      const message = error && error.message ? String(error.message) : 'Không thể tải sản phẩm';
      setError(tbody, message);
    }
  };

  const init = () => {
    const tbody = document.querySelector(SELECTORS.tbody);
    if (!tbody) return;

    const input = document.querySelector(SELECTORS.searchInput);
    const button = document.querySelector(SELECTORS.searchButton);

    const readQuery = () => (input ? String(input.value || '').trim() : '');

    const handleSearch = async () => {
      const q = readQuery();
      await loadAndRender({ q });
    };

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

    void loadAndRender({ q: readQuery() });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
