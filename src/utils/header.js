const THEME_KEY = 'computer-store-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const HEADER_SELECTOR = '#site-header';
const TOGGLE_SELECTOR = '.theme-toggle';
const ICON_SELECTOR = '.theme-toggle__icon';
const ACTIONS_SELECTOR = '.header__actions';
const MOBILE_DRAWER_SELECTOR = '.header__mobile-drawer';
const MOBILE_DRAWER_TOGGLE_SELECTOR = '.mobile-menu-toggle';
const MOBILE_DRAWER_CLOSE_SELECTOR = '.header__mobile-drawer-close';
const MOBILE_DRAWER_BACKDROP_SELECTOR = '.header__mobile-drawer-backdrop';
const MOBILE_DRAWER_LINK_SELECTOR = '.header__mobile-drawer-links a';
const COMPACT_HEADER_MAX_WIDTH = 1280;
const MOBILE_DRAWER_OPEN_CLASS = 'is-open';
const BODY_DRAWER_OPEN_CLASS = 'header-drawer-open';

const getSavedTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === THEME_DARK || savedTheme === THEME_LIGHT) {
    return savedTheme;
  }

  return null;
};

const getPreferredTheme = () => {
  const savedTheme = getSavedTheme();

  if (savedTheme) {
    return savedTheme;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
};

const getCurrentTheme = () => {
  return document.documentElement.dataset.theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
};

const updateThemeButton = (button, theme) => {
  if (!button) {
    return;
  }

  button.setAttribute('aria-pressed', String(theme === THEME_DARK));
  button.setAttribute('aria-label', theme === THEME_DARK ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');

  const icon = button.querySelector(ICON_SELECTOR);

  if (icon) {
    icon.textContent = theme === THEME_DARK ? '☾' : '☀';
  }
};

const initializeTheme = () => {
  applyTheme(getPreferredTheme());
};

const isCompactHeader = () => window.innerWidth <= COMPACT_HEADER_MAX_WIDTH;

const setHeaderActionsVisibility = (actions, isCompact) => {
  actions.hidden = isCompact;
  actions.setAttribute('aria-hidden', String(isCompact));
  actions.style.display = isCompact ? 'none' : '';
};

const closeMobileDrawer = (drawer, toggle) => {
  drawer.classList.remove(MOBILE_DRAWER_OPEN_CLASS);
  drawer.setAttribute('aria-hidden', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove(BODY_DRAWER_OPEN_CLASS);
  document.body.style.overflow = '';
};

const openMobileDrawer = (drawer, toggle) => {
  drawer.classList.add(MOBILE_DRAWER_OPEN_CLASS);
  drawer.setAttribute('aria-hidden', 'false');
  toggle.setAttribute('aria-expanded', 'true');
  document.body.classList.add(BODY_DRAWER_OPEN_CLASS);
  document.body.style.overflow = 'hidden';
};

const bindResponsiveHeader = () => {
  const actions = document.querySelector(ACTIONS_SELECTOR);
  const drawer = document.querySelector(MOBILE_DRAWER_SELECTOR);
  const toggle = document.querySelector(MOBILE_DRAWER_TOGGLE_SELECTOR);

  if (!actions || actions.dataset.responsiveBound === 'true') {
    return;
  }

  const applyVisibility = () => {
    const compact = isCompactHeader();
    setHeaderActionsVisibility(actions, compact);

    if (!compact && drawer && toggle) {
      closeMobileDrawer(drawer, toggle);
    }
  };

  actions.dataset.responsiveBound = 'true';
  applyVisibility();

  window.addEventListener('resize', applyVisibility, { passive: true });
  window.addEventListener('orientationchange', applyVisibility);
};

const bindMobileDrawer = () => {
  const drawer = document.querySelector(MOBILE_DRAWER_SELECTOR);
  const toggle = document.querySelector(MOBILE_DRAWER_TOGGLE_SELECTOR);

  if (!drawer || !toggle || drawer.dataset.bound === 'true') {
    return;
  }

  const closeButton = drawer.querySelector(MOBILE_DRAWER_CLOSE_SELECTOR);
  const backdrop = drawer.querySelector(MOBILE_DRAWER_BACKDROP_SELECTOR);
  const links = drawer.querySelectorAll(MOBILE_DRAWER_LINK_SELECTOR);

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      closeMobileDrawer(drawer, toggle);
    }
  };

  const handleToggle = () => {
    if (drawer.classList.contains(MOBILE_DRAWER_OPEN_CLASS)) {
      closeMobileDrawer(drawer, toggle);
      return;
    }

    openMobileDrawer(drawer, toggle);
  };

  toggle.dataset.bound = 'true';
  drawer.dataset.bound = 'true';

  toggle.addEventListener('click', handleToggle);

  if (closeButton) {
    closeButton.addEventListener('click', () => closeMobileDrawer(drawer, toggle));
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => closeMobileDrawer(drawer, toggle));
  }

  links.forEach((link) => {
    link.addEventListener('click', () => closeMobileDrawer(drawer, toggle));
  });

  document.addEventListener('keydown', handleKeydown);

  if (!isCompactHeader()) {
    closeMobileDrawer(drawer, toggle);
  }
};

const bindThemeToggle = () => {
  const button = document.querySelector(TOGGLE_SELECTOR);

  if (!button || button.dataset.bound === 'true') {
    return;
  }

  button.dataset.bound = 'true';

  updateThemeButton(button, getCurrentTheme());

  button.addEventListener('click', () => {
    const nextTheme = getCurrentTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(nextTheme);
    updateThemeButton(button, nextTheme);
  });
};

const observeHeader = () => {
  const headerHost = document.querySelector(HEADER_SELECTOR);

  if (!headerHost || headerHost.dataset.observed === 'true') {
    bindResponsiveHeader();
    bindMobileDrawer();
    bindThemeToggle();
    return;
  }

  headerHost.dataset.observed = 'true';

  const observer = new MutationObserver(() => {
    bindResponsiveHeader();
    bindMobileDrawer();
    bindThemeToggle();
  });

  observer.observe(headerHost, {
    childList: true,
    subtree: true
  });

  bindResponsiveHeader();
  bindMobileDrawer();
  bindThemeToggle();
};

initializeTheme();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeHeader);
} else {
  observeHeader();
}
