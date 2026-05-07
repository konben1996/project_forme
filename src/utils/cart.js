(function (window, document) {
  'use strict';

  const DEFAULT_EMPTY_MESSAGE = 'Chưa có sản phẩm trong giỏ hàng.';

  const getAuthApi = () => window.AuthAPI || null;

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

  const removeExistingItemCards = (grid, reviewCard) => {
    const children = Array.from(grid.children || []);
    children.forEach((child) => {
      if (child && child !== reviewCard) {
        child.remove();
      }
    });
  };

  const buildCartItemCardHtml = (item) => {
    const product = item && item.product ? item.product : null;

    const quantity = Number(item.quantity || 1);
    const linePrice = Number(item.linePrice || 0);

    const unitPrice = Number(item.unitPrice || 0);
    const unitSalePrice = item.unitSalePrice === null || item.unitSalePrice === undefined ? null : Number(item.unitSalePrice);
    const hasSale = unitSalePrice !== null && Number.isFinite(unitSalePrice) && unitSalePrice > 0 && unitSalePrice < unitPrice;
    const compareLineTotal = hasSale ? unitPrice * quantity : null;

    const badgeText = quantity > 1 ? `${quantity} sản phẩm` : '1 sản phẩm';

    const name = escapeHtml(product && product.name ? product.name : 'Sản phẩm');
    const imageUrl = product && product.thumbnailUrl ? product.thumbnailUrl : '';
    const priceStrong = formatCurrency(linePrice);
    const priceSpan = compareLineTotal && compareLineTotal > linePrice ? formatCurrency(compareLineTotal) : '';

    const cartItemId = item && item.id !== undefined && item.id !== null ? String(item.id) : '';

    return `
      <article class="cart-item" data-cart-item-card>
        <div class="cart-item__top">
          <div class="cart-item__image">
            ${
              imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${name}" loading="lazy" decoding="async" />`
                : escapeHtml(name)
            }
          </div>

          <div class="cart-item__meta">
            <p class="cart-item__badge">${escapeHtml(badgeText)}</p>
            <h3 class="cart-item__title" title="${name}">${name}</h3>
          </div>
        </div>

        <div class="cart-item__price">
          <strong>${escapeHtml(priceStrong)}</strong>
          ${priceSpan ? `<span>${escapeHtml(priceSpan)}</span>` : ''}
        </div>

        <button
          type="button"
          class="cart-item__delete"
          data-cart-delete-button
          data-cart-delete-id="${escapeHtml(cartItemId)}"
          aria-label="Xóa khỏi giỏ hàng"
        >
          Xóa khỏi giỏ
        </button>
      </article>
    `;
  };

  const render = async () => {
    const authApi = getAuthApi();
    if (!authApi) return;

    const grid = document.querySelector('[data-cart-items-grid]');
    const reviewCard = document.querySelector('[data-cart-review-card]');

    if (!grid || !reviewCard) return;

    const subtotalEl = reviewCard.querySelector('[data-cart-subtotal]');
    const shippingEl = reviewCard.querySelector('[data-cart-shipping]');
    const totalEl = reviewCard.querySelector('[data-cart-total]');
    const checkoutLink = reviewCard.querySelector('[data-cart-checkout-link]');

    const setTotals = (subtotal, shipping) => {
      const subtotalText = formatCurrency(subtotal);
      const shippingText = formatCurrency(shipping);
      const totalText = formatCurrency(Number(subtotal || 0) + Number(shipping || 0));

      if (subtotalEl) subtotalEl.textContent = `${subtotalText}`;
      if (shippingEl) shippingEl.textContent = `${shippingText}`;
      if (totalEl) totalEl.textContent = `${totalText}`;
    };

    const renderLoading = () => {
      removeExistingItemCards(grid, reviewCard);
      const loadingCard = document.createElement('article');
      loadingCard.className = 'review-card';
      loadingCard.dataset.cartEmpty = 'loading';
      loadingCard.innerHTML = `<strong>Đang tải giỏ hàng...</strong>`;
      grid.insertBefore(loadingCard, reviewCard);
    };

    const renderEmpty = () => {
      removeExistingItemCards(grid, reviewCard);
      const emptyCard = document.createElement('article');
      emptyCard.className = 'review-card';
      emptyCard.dataset.cartEmpty = 'true';
      emptyCard.innerHTML = `<p style="margin: 0;">${escapeHtml(DEFAULT_EMPTY_MESSAGE)}</p>`;
      grid.insertBefore(emptyCard, reviewCard);
    };

    const sessionToken =
      typeof authApi.getSessionToken === 'function' ? authApi.getSessionToken() : null;
    const hasSession = sessionToken
      ? true
      : typeof authApi.hasSession === 'function'
        ? Boolean(authApi.hasSession())
        : false;

    if (!hasSession) {
      removeExistingItemCards(grid, reviewCard);

      if (checkoutLink) {
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.style.pointerEvents = 'none';
        checkoutLink.style.opacity = '0.6';
      }

      const authCard = document.createElement('article');
      authCard.className = 'review-card';
      authCard.dataset.cartEmpty = 'true';
      authCard.innerHTML = `<p style="margin: 0;">${escapeHtml('Vui lòng đăng nhập để xem giỏ hàng.')}</p>`;
      grid.insertBefore(authCard, reviewCard);

      setTotals(0, 0);
      return;
    }

    renderLoading();
    setTotals(0, 0);

    try {
      const payload = await authApi.request('/cart', {
        method: 'GET',
      });

      const cart = payload && payload.data && payload.data.cart ? payload.data.cart : null;
      const items =
        payload && payload.data && Array.isArray(payload.data.items) ? payload.data.items : [];

      const subtotal = cart ? Number(cart.subtotalPrice || 0) : 0;
      const shipping = 0;

      removeExistingItemCards(grid, reviewCard);

      if (!items.length) {
        renderEmpty();
        if (checkoutLink) {
          checkoutLink.setAttribute('aria-disabled', 'true');
          checkoutLink.style.pointerEvents = 'none';
          checkoutLink.style.opacity = '0.6';
        }
        setTotals(0, 0);
        return;
      }

      if (checkoutLink) {
        checkoutLink.removeAttribute('aria-disabled');
        checkoutLink.style.pointerEvents = '';
        checkoutLink.style.opacity = '';
      }

      items.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildCartItemCardHtml(item);
        const card = wrapper.firstElementChild;
        if (card) grid.insertBefore(card, reviewCard);
      });

      const deleteButtons = Array.from(grid.querySelectorAll('[data-cart-delete-button]'));
      deleteButtons.forEach((button) => {
        if (!(button instanceof Element)) return;
        if (button.dataset.cartDeleteBound === 'true') return;

        button.dataset.cartDeleteBound = 'true';

        button.addEventListener('click', async () => {
          const cartItemIdRaw = button.dataset.cartDeleteId;
          const cartItemId = Number(cartItemIdRaw);

          if (!Number.isFinite(cartItemId) || cartItemId <= 0) {
            window.alert('Không xác định được sản phẩm cần xoá.');
            return;
          }

          const ok = window.confirm('Bạn có chắc chắn muốn xoá sản phẩm này khỏi giỏ hàng không?');
          if (!ok) return;

          const originalText = button.textContent || 'Xóa khỏi giỏ';

          try {
            button.disabled = true;
            button.textContent = 'Đang xoá...';

            await authApi.request('/cart/items', {
              method: 'DELETE',
              body: {
                id: cartItemId,
              },
            });

            await render();
          } catch (error) {
            const message =
              error && error.message ? String(error.message) : 'Không thể xoá sản phẩm khỏi giỏ hàng.';
            window.alert(message);
            button.disabled = false;
            button.textContent = originalText;
          }
        });
      });

      setTotals(subtotal, shipping);
    } catch (error) {
      const status =
        error && typeof error.status === 'number'
          ? error.status
          : error && error.status
            ? error.status
            : null;

      const message = error && error.message ? String(error.message) : 'Không thể tải giỏ hàng.';

      if (status === 401 || status === 403) {
        removeExistingItemCards(grid, reviewCard);

        if (checkoutLink) {
          checkoutLink.setAttribute('aria-disabled', 'true');
          checkoutLink.style.pointerEvents = 'none';
          checkoutLink.style.opacity = '0.6';
        }

        const authCard = document.createElement('article');
        authCard.className = 'review-card';
        authCard.dataset.cartEmpty = 'true';
        authCard.innerHTML = `<p style="margin: 0;">${escapeHtml('Vui lòng đăng nhập để xem giỏ hàng.')}</p>`;
        grid.insertBefore(authCard, reviewCard);

        setTotals(0, 0);
        return;
      }

      removeExistingItemCards(grid, reviewCard);
      const errorCard = document.createElement('article');
      errorCard.className = 'review-card';
      errorCard.innerHTML = `<strong>Lỗi</strong><p style="margin: 12px 0 0 0;">${escapeHtml(message)}</p>`;
      grid.insertBefore(errorCard, reviewCard);

      setTotals(0, 0);
    }
  };

  const init = () => {
    if (document.readyState === 'loading') return;
    render();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
