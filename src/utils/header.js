const THEME_KEY = 'computer-store-theme';
const HEADER_SELECTOR = '#site-header';
const TOGGLE_SELECTOR = '.theme-toggle';
const ICON_SELECTOR = '.theme-toggle__icon';
const ACTIONS_SELECTOR = '.header__actions';
const COMPACT_HEADER_MAX_WIDTH = 1280;

const getSavedTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  return savedTheme === 'dark' ? 'dark' : 'light';
};

const setTheme = (theme, button) => {
  document.documentElement.dataset.theme = theme;

  if (button) {
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    const icon = button.querySelector(ICON_SELECTOR);

    if (icon) {
      icon.textContent = theme === 'dark' ? '☾' : '☀';
    }
  }
};

const isCompactHeader = () => window.innerWidth <= COMPACT_HEADER_MAX_WIDTH;

const setHeaderActionsVisibility = (actions, isCompact) => {
  actions.hidden = isCompact;
  actions.setAttribute('aria-hidden', String(isCompact));
  actions.style.display = isCompact ? 'none' : '';
};

const bindResponsiveHeader = () => {
  const actions = document.querySelector(ACTIONS_SELECTOR);

  if (!actions || actions.dataset.responsiveBound === 'true') {
    return;
  }

  const applyVisibility = () => setHeaderActionsVisibility(actions, isCompactHeader());

  actions.dataset.responsiveBound = 'true';
  applyVisibility();

  window.addEventListener('resize', applyVisibility, { passive: true });
  window.addEventListener('orientationchange', applyVisibility);
};

const bindThemeToggle = () => {
  const button = document.querySelector(TOGGLE_SELECTOR);

  if (!button || button.dataset.bound === 'true') {
    return;
  }

  button.dataset.bound = 'true';

  setTheme(getSavedTheme(), button);

  button.addEventListener('click', () => {
    const nextTheme = getSavedTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme, button);
  });
};

const observeHeader = () => {
  const headerHost = document.querySelector(HEADER_SELECTOR);

  if (!headerHost || headerHost.dataset.observed === 'true') {
    bindResponsiveHeader();
    bindThemeToggle();
    return;
  }

  headerHost.dataset.observed = 'true';

  const observer = new MutationObserver(() => {
    bindResponsiveHeader();
    bindThemeToggle();
  });

  observer.observe(headerHost, {
    childList: true,
    subtree: true
  });

  bindResponsiveHeader();
  bindThemeToggle();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeHeader);
} else {
  observeHeader();
}
