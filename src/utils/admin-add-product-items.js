(function (window, document) {
  'use strict';

  const CATALOG_ENDPOINT = '/admin/catalog';
  const CREATE_PRODUCT_ENDPOINT = '/admin/products';

  const SELECTORS = {
    form: '[data-admin-product-create-form]',
    submit: '[data-admin-product-create-submit]',
    note: '[data-admin-product-create-form] .admin-form__note',

    productName: '#productName',
    sku: '#sku',
    slug: '#slug',

    brandSelect: '#brand',
    categorySelect: '#category',

    salePrice: '#salePrice',
    salePriceSale: '#sale_price',
    description: '#description',

    mainImageUrl: '#mainImageUrl',
    sideImage1Url: '#sideImage1Url',
    sideImage2Url: '#sideImage2Url',
    sideImage3Url: '#sideImage3Url',
  };

  const $ = (sel) => document.querySelector(sel);

  const escapeText = (value) => String(value === undefined || value === null ? '' : value);

  const setNote = (message, kind) => {
    const noteEl = $(SELECTORS.note);
    if (!noteEl) return;

    noteEl.textContent = escapeText(message);

    if (!kind) return;
    noteEl.style.color =
      kind === 'error'
        ? '#b91c1c'
        : kind === 'success'
          ? '#166534'
          : 'var(--page-muted)';
    noteEl.style.fontWeight = kind === 'error' || kind === 'success' ? '850' : '';
  };

  const getSelectedOptionText = (selectEl) => {
    if (!selectEl) return '';
    const opt = selectEl.options[selectEl.selectedIndex];
    return opt ? String(opt.textContent || '').trim() : '';
  };

  const parseNumberOrNull = (value) => {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const requireAuth = () => {
    if (!window.AuthAPI || typeof window.AuthAPI.request !== 'function') {
      throw new Error('AuthAPI chưa sẵn sàng');
    }
    return window.AuthAPI;
  };

  const parseQueryParam = (key) => {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(key);
    } catch (e) {
      return null;
    }
  };

  const loadCatalog = async () => {
    const AuthAPI = requireAuth();
    const payload = await AuthAPI.request(CATALOG_ENDPOINT, { method: 'GET' });

    const data = payload && payload.data ? payload.data : null;
    const brands = data && Array.isArray(data.brands) ? data.brands : [];
    const categories = data && Array.isArray(data.categories) ? data.categories : [];

    const brandSelect = $(SELECTORS.brandSelect);
    const categorySelect = $(SELECTORS.categorySelect);

    const setSelect = (selectEl, items, placeholder) => {
      if (!selectEl) return;
      selectEl.innerHTML = '';

      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = placeholder;
      ph.selected = true;
      ph.disabled = true;
      selectEl.appendChild(ph);

      items.forEach((it) => {
        const opt = document.createElement('option');
        opt.value = String(it.slug || '');
        opt.textContent = String(it.name || it.slug || '');
        selectEl.appendChild(opt);
      });
    };

    setSelect(brandSelect, brands, 'Chọn hãng');
    setSelect(categorySelect, categories, 'Chọn danh mục');
  };

  const setInputValue = (inputEl, value) => {
    if (!inputEl) return;
    if (value === null || value === undefined) {
      inputEl.value = '';
      return;
    }
    inputEl.value = String(value);
  };

  const populateForm = async (productData) => {
    const product = productData && productData.product ? productData.product : productData || null;
    if (!product) {
      throw new Error('Không có dữ liệu sản phẩm để sửa');
    }

    const productNameEl = $(SELECTORS.productName);
    const skuEl = $(SELECTORS.sku);
    const slugEl = $(SELECTORS.slug);

    const brandSelect = $(SELECTORS.brandSelect);
    const categorySelect = $(SELECTORS.categorySelect);

    const salePriceEl = $(SELECTORS.salePrice);
    const salePriceSaleEl = $(SELECTORS.salePriceSale);

    const descriptionEl = $(SELECTORS.description);

    const mainImageUrlEl = $(SELECTORS.mainImageUrl);
    const sideImage1UrlEl = $(SELECTORS.sideImage1Url);
    const sideImage2UrlEl = $(SELECTORS.sideImage2Url);
    const sideImage3UrlEl = $(SELECTORS.sideImage3Url);

    setInputValue(productNameEl, product.productName);
    setInputValue(skuEl, product.sku);
    setInputValue(slugEl, product.slug);

    if (brandSelect) brandSelect.value = String(product.brandSlug || '');
    if (categorySelect) categorySelect.value = String(product.categorySlug || '');

    setInputValue(salePriceEl, product.salePrice);
    setInputValue(salePriceSaleEl, product.sale_price);

    setInputValue(descriptionEl, product.description);

    const triggerImagePreviewRefresh = (inputEl) => {
      if (!inputEl) return;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    };

    setInputValue(mainImageUrlEl, product.mainImageUrl);
    setInputValue(sideImage1UrlEl, product.sideImage1Url);
    setInputValue(sideImage2UrlEl, product.sideImage2Url);
    setInputValue(sideImage3UrlEl, product.sideImage3Url);

    triggerImagePreviewRefresh(mainImageUrlEl);
    triggerImagePreviewRefresh(sideImage1UrlEl);
    triggerImagePreviewRefresh(sideImage2UrlEl);
    triggerImagePreviewRefresh(sideImage3UrlEl);
  };

  const loadProductForEdit = async (id) => {
    const AuthAPI = requireAuth();
    const payload = await AuthAPI.request(`/admin/products/${id}`, { method: 'GET' });
    // server returns { success, data: { product: ... } }
    const product = payload && payload.data ? payload.data : null;
    await populateForm(product);
  };

  const requireField = (value, message) => {
    const isString = typeof value === 'string';
    const ok =
      value !== null &&
      value !== undefined &&
      (!isString || String(value).trim().length > 0);

    if (!ok) {
      setNote(message, 'error');
      throw new Error(message);
    }
  };

  const handleSubmit = async () => {
    const AuthAPI = requireAuth();

    const formEl = $(SELECTORS.form);
    const submitEl = $(SELECTORS.submit);

    if (!formEl || !submitEl) return;

    const productId = parseQueryParam('id');
    const isEditMode = !!productId;

    const productName = $(SELECTORS.productName)?.value?.trim();
    const sku = $(SELECTORS.sku)?.value?.trim();
    const slug = $(SELECTORS.slug)?.value?.trim();

    const brandSelect = $(SELECTORS.brandSelect);
    const categorySelect = $(SELECTORS.categorySelect);

    const brandSlug = brandSelect ? brandSelect.value : '';
    const brandName = brandSelect ? getSelectedOptionText(brandSelect) : '';

    const categorySlug = categorySelect ? categorySelect.value : '';
    const categoryName = categorySelect ? getSelectedOptionText(categorySelect) : '';

    const salePriceRaw = $(SELECTORS.salePrice)?.value;
    const salePriceSaleRaw = $(SELECTORS.salePriceSale)?.value;

    const salePriceNumber = parseNumberOrNull(salePriceRaw);
    const salePriceSaleNumber = parseNumberOrNull(salePriceSaleRaw);

    const description = $(SELECTORS.description)?.value?.trim() || '';

    const mainImageUrl = $(SELECTORS.mainImageUrl)?.value?.trim();
    const sideImage1Url = $(SELECTORS.sideImage1Url)?.value?.trim();
    const sideImage2Url = $(SELECTORS.sideImage2Url)?.value?.trim();
    const sideImage3Url = $(SELECTORS.sideImage3Url)?.value?.trim();

    requireField(productName, 'Vui lòng nhập tên sản phẩm');
    requireField(sku, 'Vui lòng nhập SKU');
    requireField(slug, 'Vui lòng nhập slug');
    requireField(brandSlug, 'Vui lòng chọn hãng');
    requireField(categorySlug, 'Vui lòng chọn danh mục');
    requireField(salePriceNumber, 'Vui lòng nhập giá bán (Sprice)');
    requireField(mainImageUrl, 'Vui lòng nhập link ảnh chính (mainImageUrl)');

    const payload = {
      productName,
      sku,
      slug,

      brandSlug,
      brandName,

      categorySlug,
      categoryName,

      salePrice: salePriceNumber,
      sale_price: salePriceSaleNumber,

      description,

      mainImageUrl,
      sideImage1Url: sideImage1Url || null,
      sideImage2Url: sideImage2Url || null,
      sideImage3Url: sideImage3Url || null,
    };

    try {
      submitEl.disabled = true;
      submitEl.textContent = isEditMode ? 'Đang lưu...' : 'Đang lưu...';

      setNote(isEditMode ? 'Đang lưu thay đổi...' : 'Đang lưu sản phẩm...', 'info');

      const endpoint = isEditMode ? `/admin/products/${productId}` : CREATE_PRODUCT_ENDPOINT;
      const method = isEditMode ? 'PUT' : 'POST';

      const result = await AuthAPI.request(endpoint, {
        method,
        body: payload,
      });

      setNote('Lưu sản phẩm thành công!', 'success');

      setTimeout(() => {
        window.location.href = './admin-product.html';
      }, 900);

      return result;
    } catch (error) {
      const message =
        (error && error.message && String(error.message)) ||
        (error && error.data && error.data.message) ||
        (error && error.response && error.response.message) ||
        'Lỗi khi lưu sản phẩm';
      setNote(message, 'error');
      throw error;
    } finally {
      submitEl.disabled = false;
      submitEl.textContent = 'Lưu sản phẩm';
    }
  };

  const init = async () => {
    const submitEl = $(SELECTORS.submit);
    const formEl = $(SELECTORS.form);
    if (!formEl || !submitEl) return;

    await loadCatalog();

    const id = parseQueryParam('id');
    if (id) {
      try {
        await loadProductForEdit(id);
      } catch (error) {
        setNote('Không tải được dữ liệu sản phẩm để sửa.', 'error');
      }
    }

    submitEl.addEventListener('click', (event) => {
      event.preventDefault();
      void handleSubmit();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init());
  } else {
    void init();
  }
})(window, document);
