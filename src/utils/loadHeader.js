(function (window, document) {
  'use strict';

  const HEADER_TEMPLATE_URL = new URL('../layout/header.html', document.currentScript ? document.currentScript.src : window.location.href).href;
  const HEADER_SLOT_SELECTORS = [
    '[data-header-slot]',
    '[data-layout-header-slot]',
    '#header-slot',
    '#site-header-slot',
    '.header-slot',
    '#site-header',
  ];

  const HEADER_ROOT_SELECTORS = [
    '[data-auth-header]',
    'header[data-auth-header]',
    'header.site-header',
    'header.header',
    '.site-header',
    '.header',
    '#site-header',
    '#header',
  ];

  const AUTH_VISIBLE_LOGGED_IN = '[data-auth-visible="logged-in"], [data-auth-state="logged-in"]';
  const AUTH_VISIBLE_LOGGED_OUT = '[data-auth-visible="logged-out"], [data-auth-state="logged-out"]';
  const AUTH_STORAGE_KEY = window.AuthSessionKey || 'project-forme-auth-session';
  const AUTH_STORAGE_NAMES = ['localStorage', 'sessionStorage'];
  const THEME_STORAGE_KEY = window.ThemeStorageKey || 'project-forme-theme';
  const THEME_LIGHT = 'light';
  const THEME_DARK = 'dark';
  const TOPBAR_SCROLL_THRESHOLD = 8;
  let headerRootsObserver = null;
  let topbarScrollRafId = null;
  let topbarScrollBound = false;
  let themeToggleBound = false;

  const HEADER_TEMPLATE = [
    '<div id="site-header" class="site-header" data-auth-header>',
    '  <div class="topbar">',
    '    <div class="container topbar__inner">',
    '      <p>Hotline: 0900 000 001 | Hỗ trợ 8:00 - 21:00</p>',
    '      <div class="topbar__links">',
    '        <a href="#promotions">Khuyến mãi</a>',
    '        <a href="#reviews">Đánh giá</a>',
    '        <a href="#newsletter">Nhận tin</a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '',
    '  <header class="header">',
    '    <div class="container header__inner">',
    '      <a class="logo" href="../../index.html" aria-label="Computer Store">',
    '        <span class="logo__mark">CS</span>',
    '        <span class="logo__text">',
    '          <strong>Computer</strong>',
    '          <small>Store</small>',
    '        </span>',
    '      </a>',
    '',
    '      <div class="header__actions">',
    '        <a href="../../index.html" aria-label="Trang chủ">Trang Chủ</a>',
    '        <a href="register.html" aria-label="Đăng ký tài khoản" data-auth-visible="logged-out">Đăng ký</a>',
    '        <a href="account-info.html" aria-label="Thông tin tài khoản" data-auth-visible="logged-in" hidden>Thông tin tài khoản</a>',
    '        <a href="cart.html" aria-label="Giỏ hàng">Giỏ hàng</a>',
    '        <a href="login.html" aria-label="Đăng nhập" data-auth-visible="logged-out">Đăng nhập</a>',
    '        <a href="login.html?logout=1" aria-label="Đăng xuất" data-auth-action="logout" data-auth-visible="logged-in" hidden>Đăng xuất</a>',
    '      </div>',
    '',
    '      <div class="header__theme">',
    '        <button class="theme-toggle" type="button" aria-label="Chuyển giao diện sáng tối">',
    '          <span class="theme-toggle__icon" aria-hidden="true">☀</span>',
    '        </button>',
    '      </div>',
    '',
    '      <div class="header__mobile-menu">',
    '        <button class="mobile-menu-toggle" type="button" aria-label="Mở menu điều hướng" aria-controls="mobile-header-drawer" aria-expanded="false">',
    '          <span class="mobile-menu-toggle__icon" aria-hidden="true">☰</span>',
    '        </button>',
    '      </div>',
    '    </div>',
    '',
    '    <div class="header__mobile-drawer" id="mobile-header-drawer" aria-hidden="true">',
    '      <button class="header__mobile-drawer-backdrop" type="button" aria-label="Đóng menu điều hướng"></button>',
    '      <aside class="header__mobile-drawer-panel" aria-label="Menu điều hướng">',
    '        <div class="header__mobile-drawer-header">',
    '          <strong>Menu điều hướng</strong>',
    '          <button class="header__mobile-drawer-close" type="button" aria-label="Đóng menu điều hướng">×</button>',
    '        </div>',
    '',
    '        <nav class="header__mobile-drawer-links" aria-label="Menu tài khoản và thao tác">',
    '          <a href="../../index.html" aria-label="Trang chủ">Trang Chủ</a>',
    '          <a href="register.html" aria-label="Đăng ký tài khoản" data-auth-visible="logged-out">Đăng ký</a>',
    '          <a href="account-info.html" aria-label="Thông tin tài khoản" data-auth-visible="logged-in" hidden>Thông tin tài khoản</a>',
    '          <a href="cart.html" aria-label="Giỏ hàng">Giỏ hàng</a>',
    '          <a href="login.html" aria-label="Đăng nhập" data-auth-visible="logged-out">Đăng nhập</a>',
    '          <a href="login.html?logout=1" aria-label="Đăng xuất" data-auth-action="logout" data-auth-visible="logged-in" hidden>Đăng xuất</a>',
    '        </nav>',
    '      </aside>',
    '    </div>',
    '  </header>',
    '</div>',
  ].join('\n');

  const getAuthApi = () => window.AuthAPI || null;

  const readSessionFromStorage = (storage) => {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const getStoredSession = () => {
    const authApi = getAuthApi();

    if (authApi && typeof authApi.getStoredSession === 'function') {
      return authApi.getStoredSession();
    }

    for (const storageName of AUTH_STORAGE_NAMES) {
      try {
        const storage = window[storageName];
        const session = readSessionFromStorage(storage);
        if (session) {
          return session;
        }
      } catch (error) {
        // no-op
      }
    }

    return null;
  };

  const clearStoredSession = () => {
    const authApi = getAuthApi();

    if (authApi && typeof authApi.clearSession === 'function') {
      authApi.clearSession();
      return;
    }

    AUTH_STORAGE_NAMES.forEach((storageName) => {
      try {
        const storage = window[storageName];
        if (storage) {
          storage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch (error) {
        // no-op
      }
    });

    window.dispatchEvent(
      new CustomEvent('auth:change', {
        detail: {
          session: null,
        },
      })
    );
  };

  const injectAuthVisibilityStyles = () => {
    const styleId = 'auth-state-visibility-rules';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      'html[data-auth-state="logged-in"] [data-auth-visible="logged-out"],',
      'html[data-auth-state="logged-in"] [data-auth-state="logged-out"] {',
      '  display: none !important;',
      '}',
      'html[data-auth-state="logged-out"] [data-auth-visible="logged-in"],',
      'html[data-auth-state="logged-out"] [data-auth-state="logged-in"] {',
      '  display: none !important;',
      '}',
    ].join('\n');

    document.head.appendChild(style);
  };

  const getProjectBasePath = () => {
    const { pathname } = window.location;
    const srcMarker = '/src/';
    const srcIndex = pathname.indexOf(srcMarker);

    if (srcIndex !== -1) {
      return `${pathname.slice(0, srcIndex + 1)}`;
    }

    if (pathname.endsWith('/index.html')) {
      return `${pathname.slice(0, -'/index.html'.length)}/`;
    }

    if (pathname.endsWith('/')) {
      return pathname;
    }

    return `${pathname.replace(/[^/]*$/, '')}`;
  };

  const resolveSiteUrl = (relativePath) => {
    const baseUrl = new URL(getProjectBasePath(), window.location.href);
    return new URL(relativePath, baseUrl).href;
  };

  const applyHeaderLinks = (root) => {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return;
    }

    const homeLinks = root.querySelectorAll('.logo, a[aria-label="Trang chủ"]');
    const registerLinks = root.querySelectorAll('a[aria-label="Đăng ký tài khoản"]');
    const accountLinks = root.querySelectorAll('a[aria-label="Thông tin tài khoản"]');
    const cartLinks = root.querySelectorAll('a[aria-label="Giỏ hàng"]');
    const loginLinks = root.querySelectorAll('a[aria-label="Đăng nhập"]');
    const logoutLinks = root.querySelectorAll('a[aria-label="Đăng xuất"]');

    homeLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('index.html'));
    });

    registerLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('src/pages/register.html'));
    });

    accountLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('src/pages/account-info.html'));
    });

    cartLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('src/pages/cart.html'));
    });

    loginLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('src/pages/login.html'));
    });

    logoutLinks.forEach((link) => {
      link.setAttribute('href', resolveSiteUrl('src/pages/login.html?logout=1'));
    });
  };

  const getMobileDrawer = (root) => root.querySelector('.header__mobile-drawer');

  const getMobileDrawerToggle = (root) => root.querySelector('.mobile-menu-toggle');

  const getThemeToggle = (root) => root.querySelector('.theme-toggle');

  const getThemeToggleIcon = (root) => root.querySelector('.theme-toggle__icon');

  const getTopbar = (root) => root.querySelector('.topbar');

  const setTopbarVisibility = (root, isScrolled) => {
    const topbar = getTopbar(root);

    if (!topbar) {
      return;
    }

    topbar.classList.toggle('is-hidden', isScrolled);
  };

  const updateTopbarVisibility = () => {
    const isScrolled = (window.scrollY || document.documentElement.scrollTop || 0) > TOPBAR_SCROLL_THRESHOLD;

    getHeaderRoots().forEach((root) => {
      setTopbarVisibility(root, isScrolled);
    });
  };

  const getThemeStorage = () => {
    for (const storageName of AUTH_STORAGE_NAMES) {
      try {
        const storage = window[storageName];
        const testKey = `${THEME_STORAGE_KEY}-test`;
        storage.setItem(testKey, '1');
        storage.removeItem(testKey);
        return storage;
      } catch (error) {
        // no-op
      }
    }

    return null;
  };

  const getStoredTheme = () => {
    const storage = getThemeStorage();

    if (!storage) {
      return '';
    }

    try {
      const value = storage.getItem(THEME_STORAGE_KEY);
      return value === THEME_DARK || value === THEME_LIGHT ? value : '';
    } catch (error) {
      return '';
    }
  };

  const saveTheme = (theme) => {
    const storage = getThemeStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // no-op
    }
  };

  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      return storedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }

    return THEME_LIGHT;
  };

  const getActiveTheme = () => (
    document.documentElement.dataset.theme === THEME_DARK ? THEME_DARK : THEME_LIGHT
  );

  const applyTheme = (theme) => {
    const nextTheme = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;

    if (nextTheme === THEME_DARK) {
      document.documentElement.dataset.theme = THEME_DARK;
    } else {
      delete document.documentElement.dataset.theme;
    }

    return nextTheme;
  };

  const updateThemeToggleState = (root, theme) => {
    const isDark = theme === THEME_DARK;
    const icon = getThemeToggleIcon(root);
    const toggle = getThemeToggle(root);

    if (icon) {
      icon.textContent = isDark ? '☾' : '☀';
    }

    if (toggle) {
      toggle.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
      toggle.setAttribute('title', isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    }
  };

  const syncThemeToggleState = () => {
    const theme = getActiveTheme();

    getHeaderRoots().forEach((root) => {
      updateThemeToggleState(root, theme);
    });
  };

  const bindThemeToggleBehavior = () => {
    if (themeToggleBound) {
      syncThemeToggleState();
      return;
    }

    themeToggleBound = true;

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('.theme-toggle') : null;

      if (!target) {
        return;
      }

      event.preventDefault();

      const currentTheme = getActiveTheme();
      const nextTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;

      applyTheme(nextTheme);
      saveTheme(nextTheme);
      syncThemeToggleState();
    });

    syncThemeToggleState();
  };

  const bindTopbarScrollBehavior = () => {
    if (!topbarScrollBound) {
      topbarScrollBound = true;

      const scheduleUpdate = () => {
        if (topbarScrollRafId !== null) {
          return;
        }

        const raf = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
        topbarScrollRafId = raf(() => {
          topbarScrollRafId = null;
          updateTopbarVisibility();
        });
      };

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });
      window.addEventListener('orientationchange', scheduleUpdate);
    }

    updateTopbarVisibility();
  };

  const setMobileDrawerState = (root, isOpen) => {
    const drawer = getMobileDrawer(root);
    const toggle = getMobileDrawerToggle(root);

    if (!drawer || !toggle) {
      return;
    }

    drawer.classList.toggle('is-open', isOpen);
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  const closeMobileDrawer = (root) => {
    setMobileDrawerState(root, false);
  };

  const openMobileDrawer = (root) => {
    setMobileDrawerState(root, true);
  };

  const bindMobileDrawerInteractions = (root) => {
    const drawer = getMobileDrawer(root);
    const toggle = getMobileDrawerToggle(root);

    if (!drawer || !toggle || root.dataset.mobileDrawerBound === '1') {
      return;
    }

    const closeTargets = drawer.querySelectorAll(
      '.header__mobile-drawer-backdrop, .header__mobile-drawer-close, .header__mobile-drawer-links a'
    );

    const handleToggleClick = (event) => {
      event.preventDefault();
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) {
        closeMobileDrawer(root);
      } else {
        openMobileDrawer(root);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeMobileDrawer(root);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 1024 && drawer.classList.contains('is-open')) {
        closeMobileDrawer(root);
      }
    };

    toggle.addEventListener('click', handleToggleClick);
    closeTargets.forEach((element) => {
      element.addEventListener('click', () => {
        closeMobileDrawer(root);
      });
    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize, { passive: true });

    root.dataset.mobileDrawerBound = '1';
    setMobileDrawerState(root, false);
  };

  const syncHeaderHeight = () => {
    const headerHost = document.getElementById('site-header');
    const siteHeader = headerHost?.querySelector('.site-header');

    if (!siteHeader) {
      return;
    }

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty('--site-header-height', `${siteHeader.offsetHeight}px`);
    };

    updateHeaderHeight();

    if (siteHeader.dataset.heightObserverBound === 'true') {
      return;
    }

    siteHeader.dataset.heightObserverBound = 'true';

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateHeaderHeight();
      });

      observer.observe(siteHeader);
    }

    window.addEventListener('resize', updateHeaderHeight, { passive: true });
    window.addEventListener('orientationchange', updateHeaderHeight);
  };

  const getHeaderRoots = () => {
    const roots = [];

    HEADER_ROOT_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!roots.includes(node)) {
          roots.push(node);
        }
      });
    });

    return roots.filter((node) => !roots.some((other) => other !== node && other.contains(node)));
  };

  const watchForHeaderRoots = () => {
    if (headerRootsObserver || typeof MutationObserver === 'undefined') {
      return;
    }

    if (getHeaderRoots().length) {
      enhanceHeader();
      return;
    }

    const target = document.body || document.documentElement;
    if (!target) {
      return;
    }

    headerRootsObserver = new MutationObserver(() => {
      if (!getHeaderRoots().length) {
        return;
      }

      if (headerRootsObserver) {
        headerRootsObserver.disconnect();
        headerRootsObserver = null;
      }

      enhanceHeader();
    });

    headerRootsObserver.observe(target, {
      childList: true,
      subtree: true,
    });
  };

  const getSlot = () => {
    for (const selector of HEADER_SLOT_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return null;
  };

  const setHidden = (nodes, hidden) => {
    nodes.forEach((node) => {
      node.hidden = hidden;
      node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    });
  };

  const getUserDisplayName = (session) => {
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

  const updateHeaderState = (root, session) => {
    if (!root) {
      return;
    }

    const loggedIn = !!session;
    const userName = getUserDisplayName(session);

    root.dataset.authState = loggedIn ? 'logged-in' : 'logged-out';

    const loggedInNodes = root.querySelectorAll(AUTH_VISIBLE_LOGGED_IN);
    const loggedOutNodes = root.querySelectorAll(AUTH_VISIBLE_LOGGED_OUT);

    setHidden(loggedInNodes, !loggedIn);
    setHidden(loggedOutNodes, loggedIn);

    root.querySelectorAll('[data-auth-user-name]').forEach((node) => {
      node.textContent = userName || 'Khách hàng';
      node.hidden = !loggedIn;
    });

    root.querySelectorAll('[data-auth-link="login"]').forEach((node) => {
      node.setAttribute('href', resolveSiteUrl('src/pages/login.html'));
    });

    root.querySelectorAll('[data-auth-link="register"]').forEach((node) => {
      node.setAttribute('href', resolveSiteUrl('src/pages/register.html'));
    });

    root.querySelectorAll('[data-auth-link="account"]').forEach((node) => {
      node.setAttribute('href', resolveSiteUrl('src/pages/account-info.html'));
    });

    root.querySelectorAll('[data-auth-action="logout"], [data-auth-link="logout"]').forEach((node) => {
      if (node.tagName === 'BUTTON') {
        node.type = 'button';
      }
    });
  };

  const attachLogoutHandlers = (root) => {
    const authApi = getAuthApi();
    const elements = root.querySelectorAll('[data-auth-action="logout"], [data-auth-link="logout"]');

    if (!elements.length) {
      return;
    }

    const handler = async (event) => {
      event.preventDefault();

      if (!authApi) {
        clearStoredSession();
        window.location.assign(resolveSiteUrl('src/pages/login.html?logout=1'));
        return;
      }

      try {
        await authApi.logout();
      } catch (error) {
        // Session is already cleared locally in logout().
      } finally {
        window.location.assign(resolveSiteUrl('src/pages/login.html?logout=1'));
      }
    };

    elements.forEach((element) => {
      if (element.dataset.logoutBound === '1') {
        return;
      }

      element.dataset.logoutBound = '1';
      element.addEventListener('click', handler);
    });
  };

  const enhanceHeader = () => {
    const roots = getHeaderRoots();

    if (!roots.length) {
      syncHeaderHeight();
      bindTopbarScrollBehavior();
      return;
    }

    roots.forEach((root) => {
      if (!root.dataset.authHeader) {
        root.dataset.authHeader = 'true';
      }

      applyHeaderLinks(root);
      bindMobileDrawerInteractions(root);
      attachLogoutHandlers(root);
      updateHeaderState(root, getStoredSession());
    });

    bindThemeToggleBehavior();
    bindTopbarScrollBehavior();
    syncHeaderHeight();
  };

  const injectHeaderIfNeeded = async () => {
    const slot = getSlot();

    if (slot && !slot.querySelector('[data-auth-header]')) {
      if (window.location.protocol === 'file:') {
        slot.innerHTML = HEADER_TEMPLATE;
      } else {
        try {
          const response = await fetch(HEADER_TEMPLATE_URL, {
            cache: 'no-store',
          });

          if (response.ok) {
            slot.innerHTML = await response.text();
          } else {
            slot.innerHTML = HEADER_TEMPLATE;
          }
        } catch (error) {
          slot.innerHTML = HEADER_TEMPLATE;
        }
      }
    }

    enhanceHeader();
  };

  const init = () => {
    injectAuthVisibilityStyles();

    const session = getStoredSession();
    document.documentElement.dataset.authState = session ? 'logged-in' : 'logged-out';
    applyTheme(getPreferredTheme());

    injectHeaderIfNeeded().catch(() => {
      enhanceHeader();
    });

    watchForHeaderRoots();
    bindTopbarScrollBehavior();

    window.addEventListener('auth:change', (event) => {
      const nextSession = event && event.detail ? event.detail.session : null;
      const roots = getHeaderRoots();

      roots.forEach((root) => {
        updateHeaderState(root, nextSession);
      });

      document.documentElement.dataset.authState = nextSession ? 'logged-in' : 'logged-out';
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HeaderLoader = {
    enhanceHeader,
    updateHeaderState,
  };
})(window, document);
