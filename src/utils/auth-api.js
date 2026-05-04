(function (window) {
  'use strict';

  const STORAGE_KEY = 'project-forme-auth-session';
  const DEFAULT_FILE_API_BASE = 'http://localhost:3000/api';

  const memoryStorage = (() => {
    let store = {};

    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      },
      removeItem(key) {
        delete store[key];
      },
    };
  })();

  const getAvailableStorage = () => {
    try {
      const testKey = '__auth_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      try {
        const testKey = '__auth_storage_test__';
        window.sessionStorage.setItem(testKey, '1');
        window.sessionStorage.removeItem(testKey);
        return window.sessionStorage;
      } catch (sessionError) {
        return memoryStorage;
      }
    }
  };

  const storage = getAvailableStorage();

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

  const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

  const buildUrl = (path) => {
    if (!path) {
      return getApiBase();
    }

    if (isAbsoluteUrl(path)) {
      return path;
    }

    if (path.startsWith('/')) {
      return `${getApiBase()}${path}`;
    }

    return `${getApiBase()}/${path}`;
  };

  const readStoredSession = () => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const safeStorageSet = (key, value) => {
    try {
      storage.setItem(key, value);
    } catch (error) {
      try {
        memoryStorage.setItem(key, value);
      } catch (memoryError) {
        // no-op
      }
    }
  };

  const safeStorageRemove = (key) => {
    try {
      storage.removeItem(key);
    } catch (error) {
      try {
        memoryStorage.removeItem(key);
      } catch (memoryError) {
        // no-op
      }
    }
  };

  const dispatchChange = (session) => {
    window.dispatchEvent(
      new CustomEvent('auth:change', {
        detail: {
          session,
        },
      })
    );
  };

  const normalizeAddress = (value) => {
    if (!value || typeof value !== 'object') {
      return value || null;
    }

    const line1 = value.line1 || value.addressLine1 || value.address_line || value.street || value.streetAddress || value.address || '';
    const line2 = value.line2 || value.addressLine2 || value.ward || value.district || '';
    const city = value.city || value.province || value.state || '';
    const postalCode = value.postalCode || value.zipCode || value.zip || '';

    const formatted = [line1, line2, city, postalCode].filter(Boolean).join(', ');

    return {
      ...value,
      line1,
      addressLine1: value.addressLine1 || line1,
      address_line: value.address_line || line1,
      ward: value.ward || '',
      district: value.district || '',
      province: value.province || value.city || value.state || '',
      formatted: formatted || value.formatted || '',
    };
  };

  const normalizeUser = (value) => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value.user && typeof value.user === 'object' ? value.user : value;
    const fullName =
      source.fullName ||
      source.name ||
      source.hoTen ||
      source.hoten ||
      source.ten ||
      source.username ||
      source.displayName ||
      '';

    const email = source.email || source.emailAddress || '';
    const phone = source.phone || source.phoneNumber || source.sdt || source.soDienThoai || '';
    const avatar = source.avatar || source.avatarUrl || source.photoUrl || '';
    const address = normalizeAddress(source.address || source.defaultAddress || source.shippingAddress || null);

    return {
      ...source,
      id: source.id || source.userId || source.user_id || null,
      fullName,
      name: fullName || source.name || '',
      email,
      phone,
      avatar,
      address,
    };
  };

  const normalizeSession = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const source =
      (payload.session && typeof payload.session === 'object' && payload.session) ||
      (payload.data && typeof payload.data === 'object' && payload.data) ||
      payload;

    const token =
      source.token ||
      source.accessToken ||
      source.sessionToken ||
      source.jwt ||
      payload.token ||
      payload.accessToken ||
      payload.sessionToken ||
      payload.jwt ||
      null;

    const refreshToken = source.refreshToken || payload.refreshToken || null;
    const user = normalizeUser(source.user || payload.user || source);

    const session = {
      ...payload,
      ...source,
      token,
      accessToken: source.accessToken || token,
      sessionToken: source.sessionToken || token,
      refreshToken,
      user,
      loggedInAt: source.loggedInAt || payload.loggedInAt || new Date().toISOString(),
    };

    if (!session.user && (session.email || session.fullName || session.name)) {
      session.user = normalizeUser(session);
    }

    return session;
  };

  const extractMessage = (payload, fallbackMessage) => {
    if (!payload) {
      return fallbackMessage;
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return (
      payload.message ||
      payload.error ||
      payload.errorMessage ||
      payload.reason ||
      (payload.data && (payload.data.message || payload.data.error || payload.data.reason)) ||
      fallbackMessage
    );
  };

  const createAuthError = (message, status, payload) => {
    const error = new Error(message);
    error.name = 'AuthError';
    error.status = status || 0;
    error.payload = payload || null;
    error.data = payload || null;
    return error;
  };

  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204) {
      return null;
    }

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {
        message: text,
      };
    }
  };

  const request = async (path, options) => {
    const config = options || {};
    const method = config.method || 'GET';
    const headers = new Headers(config.headers || {});
    const body = config.body;
    const sendAuthHeader = config.auth !== false;
    const session = sendAuthHeader ? readStoredSession() : null;
    const token = session && (session.accessToken || session.token || session.sessionToken);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (token && sendAuthHeader) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-Session-Token', token);
      headers.set('X-Auth-Token', token);
    }

    let requestBody = body;

    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
      headers.set('Content-Type', 'application/json; charset=UTF-8');
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(path), {
      method,
      headers,
      body: requestBody,
      credentials: config.credentials || 'same-origin',
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      throw createAuthError(extractMessage(payload, 'Yêu cầu không thành công.'), response.status, payload);
    }

    return payload;
  };

  const writeSession = (session) => {
    const normalized = normalizeSession(session);
    if (!normalized) {
      safeStorageRemove(STORAGE_KEY);
      dispatchChange(null);
      return null;
    }

    safeStorageSet(STORAGE_KEY, JSON.stringify(normalized));
    dispatchChange(normalized);
    return normalized;
  };

  const clearSession = () => {
    safeStorageRemove(STORAGE_KEY);
    dispatchChange(null);
  };

  const getSessionToken = () => {
    const session = readStoredSession();
    return session ? session.accessToken || session.token || session.sessionToken || null : null;
  };

  const getSession = async (options) => {
    const config = options || {};
    const storedSession = readStoredSession();

    if (!storedSession) {
      return null;
    }

    if (!config.refresh) {
      return storedSession;
    }

    try {
      const payload = await request('/auth/me', {
        method: 'GET',
      });

      const normalized = normalizeSession({
        ...storedSession,
        ...payload,
        user: payload && payload.user ? payload.user : storedSession.user,
      });

      return writeSession(normalized);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearSession();
        return null;
      }

      return storedSession;
    }
  };

  const login = async (credentials) => {
    const payload = await request('/auth/login', {
      method: 'POST',
      body: credentials || {},
      auth: false,
    });

    const session = normalizeSession(payload);
    if (!session) {
      return payload;
    }

    return writeSession(session);
  };

  const register = async (profile) => {
    const payload = await request('/auth/register', {
      method: 'POST',
      body: profile || {},
      auth: false,
    });

    const session = normalizeSession(payload);
    if (!session) {
      return payload;
    }

    return writeSession(session);
  };

  const updateCurrentUser = async (profile) => {
    const payload = await request('/auth/me', {
      method: 'PATCH',
      body: profile || {},
    });

    const session = normalizeSession(payload);
    if (!session) {
      return payload;
    }

    return writeSession(session);
  };

  const logout = async () => {
    const session = readStoredSession();
    const token = session ? session.accessToken || session.token || session.sessionToken || null : null;

    try {
      await request('/auth/logout', {
        method: 'POST',
        body: token ? { token } : {},
      });
    } catch (error) {
      if (error.status !== 401 && error.status !== 403 && error.status !== 404) {
        throw error;
      }
    } finally {
      clearSession();
    }

    return true;
  };

  const hasSession = () => !!readStoredSession();

  const api = {
    STORAGE_KEY,
    getApiBase,
    buildUrl,
    request,
    getSession,
    getSessionToken,
    getStoredSession: readStoredSession,
    setSession: writeSession,
    clearSession,
    hasSession,
    isAuthenticated: hasSession,
    login,
    register,
    updateCurrentUser,
    logout,
    normalizeSession,
    normalizeUser,
  };

  window.AuthAPI = api;
  window.AuthSessionKey = STORAGE_KEY;
})(window);
