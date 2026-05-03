const HERO_SELECTOR = '.auth-page__hero';
const TABLET_BREAKPOINT = 1024;

const toggleAuthHero = () => {
  const hero = document.querySelector(HERO_SELECTOR);

  if (!hero) {
    return;
  }

  const shouldHideHero = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT}px)`).matches;
  hero.style.display = shouldHideHero ? 'none' : '';
};

const initLoginPage = () => {
  toggleAuthHero();

  window.addEventListener('resize', toggleAuthHero);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
  initLoginPage();
}
