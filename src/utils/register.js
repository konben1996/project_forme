(function (window, document) {
  'use strict';

  const DEFAULT_REDIRECT = 'account-info.html';

  const FORM_SELECTORS = [
    '[data-auth-form="register"]',
    '#registerForm',
    '#register-form',
    'form[name="register"]',
    'form.register-form',
    'form.auth-form',
    'form[action*="register"]',
  ];

  const getAuthApi = () => window.AuthAPI || null;

  const getSearchParams = () => new URLSearchParams(window.location.search || '');

  const getRedirectTarget = () => {
    const params = getSearchParams();
    const redirect = params.get('redirect') || params.get('returnTo') || params.get('next');
    return redirect || DEFAULT_REDIRECT;
  };

  const findForm = () => {
    for (const selector of FORM_SELECTORS) {
      const form = document.querySelector(selector);
      if (form) {
        return form;
      }
    }

    return null;
  };

  const getField = (form, names) => {
    for (const name of names) {
      const node = form.querySelector(`[name="${name}"]`) || form.querySelector(`#${CSS.escape(name)}`);
      if (node) {
        return node;
      }
    }

    return null;
  };

  const getMessageNode = (form) => {
    let node =
      form.querySelector('[data-form-message]') ||
      form.querySelector('.form-message') ||
      form.querySelector('.auth-message') ||
      form.querySelector('.error-message');

    if (!node) {
      node = document.createElement('div');
      node.className = 'form-message auth-message';
      node.setAttribute('data-form-message', 'true');
      node.setAttribute('aria-live', 'polite');
      form.prepend(node);
    }

    return node;
  };

  const setMessage = (node, message, state) => {
    if (!node) {
      return;
    }

    node.textContent = message || '';
    node.hidden = !message;
    node.dataset.state = state || '';
  };

  const clearFieldState = (field) => {
    if (!field) {
      return;
    }

    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
  };

  const setFieldError = (field, message) => {
    if (!field) {
      return;
    }

    field.setCustomValidity(message);
    field.setAttribute('aria-invalid', 'true');
    field.reportValidity();
  };

  const clearFormErrors = (form) => {
    form.querySelectorAll('input, select, textarea').forEach((field) => clearFieldState(field));
  };

  const setBusy = (form, button, busy, loadingText) => {
    form.dataset.submitting = busy ? 'true' : 'false';

    if (!button) {
      return;
    }

    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent.trim();
    }

    button.disabled = !!busy;
    button.textContent = busy ? (loadingText || 'Đang đăng ký...') : button.dataset.defaultText;
  };

  const handleFieldInput = (field) => {
    if (!field) {
      return;
    }

    field.addEventListener('input', () => {
      clearFieldState(field);
    });
  };

  const normalizeAuthError = (error) => {
    if (!error) {
      return {
        message: 'Đăng ký thất bại. Vui lòng thử lại.',
        fields: null,
      };
    }

    const payload = error.data || error.payload || null;
    const fields = payload && (payload.errors || payload.fields || payload.validationErrors || null);

    return {
      message:
        (payload && (payload.message || payload.error || payload.reason)) ||
        error.message ||
        'Đăng ký thất bại. Vui lòng thử lại.',
      fields,
    };
  };

  const getPayload = (form) => {
    const fullNameField = getField(form, ['fullName', 'name', 'hoTen']);
    const emailField = getField(form, ['email', 'emailAddress']);
    const passwordField = getField(form, ['password']);
    const confirmPasswordField = getField(form, ['confirmPassword', 'passwordConfirmation', 'passwordConfirm']);
    const phoneField = getField(form, ['phone', 'phoneNumber', 'sdt']);

    return {
      fullName: fullNameField ? fullNameField.value.trim() : '',
      email: emailField ? emailField.value.trim() : '',
      password: passwordField ? passwordField.value : '',
      confirmPassword: confirmPasswordField ? confirmPasswordField.value : '',
      phone: phoneField ? phoneField.value.trim() : '',
      fields: {
        fullNameField,
        emailField,
        passwordField,
        confirmPasswordField,
        phoneField,
      },
    };
  };

  const submitRegister = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const authApi = getAuthApi();
    const messageNode = getMessageNode(form);

    clearFormErrors(form);
    setMessage(messageNode, '', '');
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));

    const payload = getPayload(form);
    const fullNameField = payload.fields.fullNameField;
    const emailField = payload.fields.emailField;
    const passwordField = payload.fields.passwordField;
    const confirmPasswordField = payload.fields.confirmPasswordField;
    const phoneField = payload.fields.phoneField;

    if (!payload.fullName) {
      setFieldError(fullNameField, 'Vui lòng nhập họ và tên.');
      if (fullNameField) {
        fullNameField.focus();
      }
      return;
    }

    if (!payload.email) {
      setFieldError(emailField, 'Vui lòng nhập email.');
      if (emailField) {
        emailField.focus();
      }
      return;
    }

    if (!payload.password) {
      setFieldError(passwordField, 'Vui lòng nhập mật khẩu.');
      if (passwordField) {
        passwordField.focus();
      }
      return;
    }

    if (payload.password.length < 8) {
      setFieldError(passwordField, 'Mật khẩu phải có ít nhất 8 ký tự.');
      if (passwordField) {
        passwordField.focus();
      }
      return;
    }

    if (!payload.confirmPassword) {
      setFieldError(confirmPasswordField, 'Vui lòng xác nhận mật khẩu.');
      if (confirmPasswordField) {
        confirmPasswordField.focus();
      }
      return;
    }

    if (payload.password !== payload.confirmPassword) {
      setFieldError(confirmPasswordField, 'Mật khẩu xác nhận không khớp.');
      if (confirmPasswordField) {
        confirmPasswordField.focus();
      }
      return;
    }

    if (!authApi) {
      setMessage(messageNode, 'Không tìm thấy lớp xử lý đăng ký.', 'error');
      return;
    }

    const submitButton =
      form.querySelector('[data-submit-button]') ||
      form.querySelector('button[type="submit"]') ||
      form.querySelector('input[type="submit"]');

    setBusy(form, submitButton, true, 'Đang đăng ký...');

    try {
      const result = await authApi.register({
        fullName: payload.fullName,
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
      });

      const hasSession = !!(result && (result.token || result.accessToken || result.sessionToken || result.user));
      const redirectTarget = getRedirectTarget();

      if (hasSession) {
        window.location.assign(redirectTarget);
        return;
      }

      window.location.assign(`login.html?registered=1&redirect=${encodeURIComponent(redirectTarget)}`);
    } catch (error) {
      const normalized = normalizeAuthError(error);
      const fieldErrors = normalized.fields || {};

      if (fieldErrors.fullName && fullNameField) {
        setFieldError(fullNameField, fieldErrors.fullName);
      }

      if (fieldErrors.email && emailField) {
        setFieldError(emailField, fieldErrors.email);
      }

      if (fieldErrors.password && passwordField) {
        setFieldError(passwordField, fieldErrors.password);
      }

      if (fieldErrors.confirmPassword && confirmPasswordField) {
        setFieldError(confirmPasswordField, fieldErrors.confirmPassword);
      }

      if (fieldErrors.phone && phoneField) {
        setFieldError(phoneField, fieldErrors.phone);
      }

      if (!fieldErrors.fullName && !fieldErrors.email && !fieldErrors.password && !fieldErrors.confirmPassword && !fieldErrors.phone) {
        setMessage(messageNode, normalized.message, 'error');
      }
    } finally {
      setBusy(form, submitButton, false);
    }
  };

  const init = () => {
    const form = findForm();
    if (!form) {
      return;
    }

    const payload = getPayload(form);
    const messageNode = getMessageNode(form);

    form.dataset.authForm = 'register';
    form.setAttribute('novalidate', 'novalidate');

    handleFieldInput(payload.fields.fullNameField);
    handleFieldInput(payload.fields.emailField);
    handleFieldInput(payload.fields.passwordField);
    handleFieldInput(payload.fields.confirmPasswordField);
    handleFieldInput(payload.fields.phoneField);

    form.addEventListener('submit', submitRegister);

    const params = getSearchParams();
    if (params.get('registered') === '1') {
      setMessage(messageNode, 'Đăng ký thành công. Vui lòng đăng nhập.', 'success');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
