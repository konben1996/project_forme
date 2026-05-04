(function (window, document) {
  'use strict';

  const LOGIN_PAGE = 'login.html';
  const ACCOUNT_PAGE = 'account-info.html';

  const selectorList = [
    '[data-account-root]',
    '[data-account-page]',
    '.account-info-page',
    '.account-page',
    '.account-info',
    'main',
  ];

  const fieldSelectors = {
    fullName: '[data-account-field="fullName"], [data-account-field="name"], [data-account-field="hoTen"]',
    email: '[data-account-field="email"]',
    phone: '[data-account-field="phone"], [data-account-field="phoneNumber"], [data-account-field="sdt"]',
    address: '[data-account-field="address"]',
    id: '[data-account-field="id"], [data-account-field="userId"]',
    username: '[data-account-field="username"]',
  };

  const toArray = (value) => (Array.isArray(value) ? value : [value]);

  let currentSession = null;

  const getAuthApi = () => window.AuthAPI || null;

  const getDisplayName = (session) => {
    if (!session) {
      return '';
    }

    const user = session.user || session;
    return (
      user.fullName ||
      user.name ||
      user.hoTen ||
      user.displayName ||
      user.username ||
      user.email ||
      ''
    );
  };

  const formatAddress = (address) => {
    if (!address) {
      return '';
    }

    if (typeof address === 'string') {
      return address;
    }

    const parts = [
      address.formatted,
      address.line1 || address.addressLine1 || address.street || address.streetAddress || '',
      address.line2 || address.addressLine2 || '',
      address.ward || '',
      address.district || '',
      address.city || address.province || address.state || '',
      address.postalCode || address.zipCode || '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return address.address || address.fullAddress || '';
  };

  const getTextValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Chưa cập nhật';
    }

    if (typeof value === 'object') {
      return formatAddress(value);
    }

    return String(value);
  };

  const getRoot = () => {
    for (const selector of selectorList) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return document.body;
  };

  const ensureShell = (root) => {
    if (!root) {
      return null;
    }

    const existingFields = root.querySelectorAll('[data-account-field]');
    if (existingFields.length > 0) {
      return root;
    }

    const shell = document.createElement('section');
    shell.className = 'account-info__card account-card';
    shell.innerHTML = [
      '<div class="account-info__header">',
      '  <h1 class="account-info__title">Thông tin tài khoản</h1>',
      '  <p class="account-info__subtitle" data-account-message aria-live="polite"></p>',
      '</div>',
      '<dl class="account-info__list account-list">',
      '  <div class="account-info__item account-item">',
      '    <dt>Họ và tên</dt>',
      '    <dd data-account-field="fullName">Chưa cập nhật</dd>',
      '  </div>',
      '  <div class="account-info__item account-item">',
      '    <dt>Email</dt>',
      '    <dd data-account-field="email">Chưa cập nhật</dd>',
      '  </div>',
      '  <div class="account-info__item account-item">',
      '    <dt>Số điện thoại</dt>',
      '    <dd data-account-field="phone">Chưa cập nhật</dd>',
      '  </div>',
      '  <div class="account-info__item account-item">',
      '    <dt>Địa chỉ</dt>',
      '    <dd data-account-field="address">Chưa cập nhật</dd>',
      '  </div>',
      '</dl>',
      '<div class="account-info__actions account-actions">',
      '  <a class="account-info__link" href="register.html">Đổi tài khoản</a>',
      '  <button class="account-info__logout" type="button" data-auth-action="logout">Đăng xuất</button>',
      '</div>',
      '<div class="address-modal" data-address-modal hidden>',
      '  <div class="address-modal__backdrop" data-address-modal-close></div>',
      '  <section class="address-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">',
      '    <div class="address-modal__header">',
      '      <h2 id="address-modal-title">Cập nhật địa chỉ</h2>',
      '      <button class="address-modal__close" type="button" data-address-modal-close aria-label="Đóng">×</button>',
      '    </div>',
      '',
      '    <p class="address-modal__message" data-address-modal-message aria-live="polite" hidden></p>',
      '',
      '    <form class="address-form" data-address-form>',
      '      <label class="address-form__field" for="addressLabel">',
      '        <span>Nhãn địa chỉ</span>',
      '        <input id="addressLabel" name="label" type="text" placeholder="Ví dụ: Nhà riêng" maxlength="60" />',
      '      </label>',
      '',
      '      <label class="address-form__field" for="addressRecipientName">',
      '        <span>Người nhận</span>',
      '        <input id="addressRecipientName" name="recipientName" type="text" placeholder="Nhập tên người nhận" maxlength="120" />',
      '      </label>',
      '',
      '      <label class="address-form__field" for="addressRecipientPhone">',
      '        <span>Số điện thoại</span>',
      '        <input id="addressRecipientPhone" name="recipientPhone" type="tel" autocomplete="tel" placeholder="Nhập số điện thoại" maxlength="20" />',
      '      </label>',
      '',
      '      <label class="address-form__field" for="addressLine">',
      '        <span>Số nhà, tên đường</span>',
      '        <input id="addressLine" name="addressLine" type="text" autocomplete="street-address" placeholder="Nhập địa chỉ chi tiết" maxlength="255" />',
      '      </label>',
      '',
      '      <div class="address-form__grid">',
      '        <label class="address-form__field" for="addressWard">',
      '          <span>Phường/Xã</span>',
      '          <input id="addressWard" name="ward" type="text" placeholder="Nhập phường/xã" maxlength="120" />',
      '        </label>',
      '',
      '        <label class="address-form__field" for="addressDistrict">',
      '          <span>Quận/Huyện</span>',
      '          <input id="addressDistrict" name="district" type="text" placeholder="Nhập quận/huyện" maxlength="120" />',
      '        </label>',
      '      </div>',
      '',
      '      <label class="address-form__field" for="addressProvince">',
      '        <span>Tỉnh/Thành phố</span>',
      '        <input id="addressProvince" name="province" type="text" placeholder="Nhập tỉnh/thành phố" maxlength="120" />',
      '      </label>',
      '',
      '      <label class="address-form__checkbox">',
      '        <input type="checkbox" name="isDefault" checked />',
      '        <span>Đặt làm địa chỉ mặc định</span>',
      '      </label>',
      '',
      '      <div class="address-form__actions">',
      '        <button class="btn btn--ghost" type="button" data-address-modal-close>Hủy</button>',
      '        <button class="btn btn--primary" type="submit">Lưu địa chỉ</button>',
      '      </div>',
      '    </form>',
      '  </section>',
      '</div>',
    ].join('');

    root.appendChild(shell);
    return shell;
  };

  const setFieldValue = (root, selector, value) => {
    toArray(selector).forEach((part) => {
      const node = root.querySelector(part);
      if (node) {
        node.textContent = getTextValue(value);
      }
    });
  };

  const setMessage = (root, message, type) => {
    if (!root) {
      return;
    }

    const node =
      root.querySelector('[data-account-message]') ||
      root.querySelector('.account-info__subtitle') ||
      root.querySelector('.account-message');

    if (!node) {
      return;
    }

    node.textContent = message || '';
    node.hidden = !message;
    node.dataset.state = type || '';
  };

  const redirectToLogin = () => {
    const target = `${LOGIN_PAGE}?redirect=${encodeURIComponent(ACCOUNT_PAGE)}`;
    window.location.replace(target);
  };

  const isFilePreview = window.location.protocol === 'file:';

  const createPreviewSession = () => ({
    user: {
      fullName: 'Nguyễn Văn A',
      email: 'demo@computerstore.vn',
      phone: '0900 000 001',
      address: {
        label: 'Nhà riêng',
        recipientName: 'Nguyễn Văn A',
        recipientPhone: '0900 000 001',
        line1: '123 Đường Demo',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        province: 'TP. Hồ Chí Minh',
        formatted: '123 Đường Demo, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        isDefault: true,
      },
    },
  });

  const getSessionUser = (session) => {
    if (!session) {
      return {};
    }

    return session.user && typeof session.user === 'object' ? session.user : session;
  };

  const getAddressSource = (session) => {
    const user = getSessionUser(session);
    return user.address || user.defaultAddress || user.shippingAddress || null;
  };

  const normalizeAddressForForm = (value) => {
    if (!value) {
      return {};
    }

    if (typeof value === 'string') {
      return {
        addressLine: value,
      };
    }

    if (typeof value !== 'object') {
      return {};
    }

    return {
      label: value.label || value.name || value.title || '',
      recipientName: value.recipientName || value.recipient_name || '',
      recipientPhone: value.recipientPhone || value.recipient_phone || '',
      addressLine:
        value.addressLine1 ||
        value.line1 ||
        value.address_line ||
        value.street ||
        value.streetAddress ||
        value.address ||
        value.formatted ||
        '',
      ward: value.ward || '',
      district: value.district || '',
      province: value.province || value.city || value.state || '',
      isDefault:
        value.isDefault !== undefined
          ? Boolean(value.isDefault)
          : value.is_default !== undefined
            ? Boolean(value.is_default)
            : true,
    };
  };

  const getAddressFormValues = (session) => {
    const user = getSessionUser(session);
    const address = normalizeAddressForForm(getAddressSource(session));

    return {
      label: address.label || 'Địa chỉ mặc định',
      recipientName: address.recipientName || user.fullName || user.name || user.hoTen || '',
      recipientPhone: address.recipientPhone || user.phone || user.phoneNumber || user.sdt || '',
      addressLine: address.addressLine || '',
      ward: address.ward || '',
      district: address.district || '',
      province: address.province || '',
      isDefault: address.isDefault !== false,
    };
  };

  const getAddressModal = (root) => root.querySelector('[data-address-modal]');
  const getAddressForm = (root) => root.querySelector('[data-address-form]');
  const getAddressModalMessage = (root) => root.querySelector('[data-address-modal-message]');

  const setAddressModalMessage = (root, message, type) => {
    const node = getAddressModalMessage(root);
    if (!node) {
      return;
    }

    node.textContent = message || '';
    node.hidden = !message;
    node.dataset.state = type || '';
  };

  const setInputValue = (form, selector, value) => {
    const node = form.querySelector(selector);
    if (node) {
      node.value = value || '';
    }
  };

  const setCheckboxValue = (form, selector, checked) => {
    const node = form.querySelector(selector);
    if (node) {
      node.checked = Boolean(checked);
    }
  };

  const populateAddressForm = (root, session) => {
    const form = getAddressForm(root);
    if (!form) {
      return;
    }

    const values = getAddressFormValues(session || currentSession);

    setInputValue(form, '[name="label"]', values.label);
    setInputValue(form, '[name="recipientName"]', values.recipientName);
    setInputValue(form, '[name="recipientPhone"]', values.recipientPhone);
    setInputValue(form, '[name="addressLine"]', values.addressLine);
    setInputValue(form, '[name="ward"]', values.ward);
    setInputValue(form, '[name="district"]', values.district);
    setInputValue(form, '[name="province"]', values.province);
    setCheckboxValue(form, '[name="isDefault"]', values.isDefault);
  };

  const openAddressModal = (root) => {
    const modal = getAddressModal(root);
    if (!modal) {
      return;
    }

    populateAddressForm(root, currentSession);
    setAddressModalMessage(root, '', '');
    modal.hidden = false;

    const firstField = modal.querySelector('input, textarea, select, button');
    if (firstField && typeof firstField.focus === 'function') {
      window.requestAnimationFrame(() => firstField.focus());
    }
  };

  const closeAddressModal = (root) => {
    const modal = getAddressModal(root);
    if (!modal) {
      return;
    }

    modal.hidden = true;
    setAddressModalMessage(root, '', '');
  };

  const buildAddressPayload = (form) => {
    const readValue = (name) => {
      const field = form.elements[name];
      return field ? String(field.value || '').trim() : '';
    };

    const label = readValue('label') || 'Địa chỉ mặc định';
    const recipientName = readValue('recipientName');
    const recipientPhone = readValue('recipientPhone');
    const addressLine = readValue('addressLine');
    const ward = readValue('ward');
    const district = readValue('district');
    const province = readValue('province');
    const isDefault = form.elements.isDefault ? Boolean(form.elements.isDefault.checked) : true;

    return {
      addressLabel: label,
      address: {
        label,
        recipientName,
        recipientPhone,
        addressLine1: addressLine,
        line1: addressLine,
        address_line: addressLine,
        ward,
        district,
        province,
        isDefault,
      },
    };
  };

  const setButtonLoading = (button, loading) => {
    if (!button) {
      return;
    }

    if (loading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent || '';
      }

      button.disabled = true;
      button.textContent = 'Đang lưu...';
      return;
    }

    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  };

  const wireAddressControls = (root) => {
    const openButton = root.querySelector('[data-account-action="open-address-form"]');
    if (openButton && openButton.dataset.addressOpenBound !== 'true') {
      openButton.dataset.addressOpenBound = 'true';
      openButton.addEventListener('click', () => openAddressModal(root));
    }

    const closeButtons = root.querySelectorAll('[data-address-modal-close]');
    closeButtons.forEach((button) => {
      if (button.dataset.addressCloseBound === 'true') {
        return;
      }

      button.dataset.addressCloseBound = 'true';
      button.addEventListener('click', () => closeAddressModal(root));
    });

    const modal = getAddressModal(root);
    if (modal && modal.dataset.addressEscBound !== 'true') {
      modal.dataset.addressEscBound = 'true';
      modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.hasAttribute('data-address-modal-close')) {
          closeAddressModal(root);
        }
      });
    }

    const form = getAddressForm(root);
    if (form && form.dataset.addressFormBound !== 'true') {
      form.dataset.addressFormBound = 'true';
      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const authApi = getAuthApi();
        if (!authApi) {
          setAddressModalMessage(root, 'Không thể lưu địa chỉ khi chưa kết nối API.', 'error');
          return;
        }

        const values = buildAddressPayload(form);
        if (
          !values.addressLabel ||
          !values.address.addressLine1 ||
          !values.address.recipientName ||
          !values.address.recipientPhone ||
          !values.address.province
        ) {
          setAddressModalMessage(
            root,
            'Vui lòng nhập đầy đủ nhãn, người nhận, số điện thoại, địa chỉ và tỉnh/thành phố.',
            'error',
          );
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        setAddressModalMessage(root, 'Đang lưu địa chỉ...', 'loading');

        try {
          const session = await authApi.updateCurrentUser(values);
          renderAccountInfo(session);
          closeAddressModal(root);
          setMessage(root, 'Đã cập nhật địa chỉ thành công.', 'success');
        } catch (error) {
          const errorMessage = error && error.message ? String(error.message) : 'Không thể lưu địa chỉ.';
          setAddressModalMessage(root, errorMessage, 'error');
        } finally {
          setButtonLoading(submitButton, false);
        }
      });
    }
  };

  const wireLogoutButtons = (root) => {
    const buttons = root.querySelectorAll('[data-auth-action="logout"], [data-account-logout], .account-info__logout');
    if (!buttons.length) {
      return;
    }

    const authApi = getAuthApi();

    const handler = async (event) => {
      event.preventDefault();

      if (!authApi) {
        window.location.assign(LOGIN_PAGE);
        return;
      }

      try {
        await authApi.logout();
      } catch (error) {
        // Session is cleared locally even if the remote request fails.
      } finally {
        window.location.assign(`${LOGIN_PAGE}?logout=1`);
      }
    };

    buttons.forEach((button) => {
      if (button.dataset.logoutBound === 'true') {
        return;
      }

      button.dataset.logoutBound = 'true';
      button.addEventListener('click', handler);
    });
  };

  const renderAccountInfo = (session) => {
    currentSession = session || currentSession || null;

    const root = ensureShell(getRoot());
    if (!root) {
      return;
    }

    const user = getSessionUser(currentSession);
    const address = user.address || user.defaultAddress || user.shippingAddress || null;

    setMessage(root, '', '');

    setFieldValue(root, fieldSelectors.fullName, user.fullName || user.name || user.hoTen || user.username || user.email);
    setFieldValue(root, fieldSelectors.email, user.email);
    setFieldValue(root, fieldSelectors.phone, user.phone || user.phoneNumber || user.sdt || user.soDienThoai);
    setFieldValue(root, fieldSelectors.address, address);
    setFieldValue(root, fieldSelectors.id, user.id || user.userId || user.user_id);
    setFieldValue(root, fieldSelectors.username, user.username || user.displayName || user.name || getDisplayName(currentSession));

    const title = getDisplayName(currentSession);
    if (title) {
      document.title = `${title} | Thông tin tài khoản`;
    }

    wireLogoutButtons(root);
    wireAddressControls(root);
  };

  const bootstrap = async () => {
    const authApi = getAuthApi();
    const root = getRoot();

    if (!authApi) {
      if (isFilePreview) {
        renderAccountInfo(createPreviewSession());
        setMessage(root, 'Chế độ xem trước giao diện.', 'preview');
        return;
      }

      redirectToLogin();
      return;
    }

    setMessage(root, 'Đang tải thông tin tài khoản...', 'loading');

    try {
      const session = await authApi.getSession({ refresh: true });
      if (session) {
        renderAccountInfo(session);
        return;
      }

      if (isFilePreview) {
        renderAccountInfo(createPreviewSession());
        setMessage(root, 'Chế độ xem trước giao diện.', 'preview');
        return;
      }

      redirectToLogin();
    } catch (error) {
      if (isFilePreview) {
        renderAccountInfo(createPreviewSession());
        setMessage(root, 'Chế độ xem trước giao diện.', 'preview');
        return;
      }

      redirectToLogin();
    }
  };

  const init = () => {
    const root = getRoot();
    ensureShell(root);
    wireAddressControls(root);
    bootstrap();

    window.addEventListener('auth:change', async (event) => {
      const session = event && event.detail ? event.detail.session : null;
      if (!session) {
        redirectToLogin();
        return;
      }

      renderAccountInfo(session);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.AccountInfoPage = {
    renderAccountInfo,
    redirectToLogin,
  };
})(window, document);
