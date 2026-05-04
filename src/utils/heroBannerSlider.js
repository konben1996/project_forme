const HERO_CONTENT_SELECTOR = '.hero__content';
const HERO_BANNER_SELECTOR = '.hero__banner';
const HERO_PREV_BUTTON_SELECTOR = '[data-hero-action="prev"]';
const HERO_NEXT_BUTTON_SELECTOR = '[data-hero-action="next"]';
const HERO_DOTS_SELECTOR = '.hero__dots';
const ACTIVE_CLASS = 'is-active';
const DOT_ACTIVE_CLASS = 'is-active';
const STATE_IDLE = 'idle';
const STATE_ACTIVE = 'active';
const STATE_ENTER_LEFT = 'enter-left';
const STATE_ENTER_RIGHT = 'enter-right';
const STATE_EXIT_LEFT = 'exit-left';
const STATE_EXIT_RIGHT = 'exit-right';
const ROTATION_INTERVAL = 3500;
const TRANSITION_DURATION = 350;
const SWIPE_THRESHOLD = 40;

const setBannerState = (banner, state) => {
  banner.dataset.bannerState = state;
  banner.classList.toggle(ACTIVE_CLASS, state === STATE_ACTIVE);
  banner.setAttribute('aria-hidden', String(state !== STATE_ACTIVE));
};

const applyInitialState = (banners, activeIndex) => {
  banners.forEach((banner, index) => {
    setBannerState(banner, index === activeIndex ? STATE_ACTIVE : STATE_IDLE);
  });
};

const rotateBanner = (banners, fromIndex, toIndex, direction) => {
  const fromBanner = banners[fromIndex];
  const toBanner = banners[toIndex];
  const enterState = direction === 'next' ? STATE_ENTER_RIGHT : STATE_ENTER_LEFT;
  const exitState = direction === 'next' ? STATE_EXIT_LEFT : STATE_EXIT_RIGHT;

  fromBanner.classList.remove(ACTIVE_CLASS);
  fromBanner.setAttribute('aria-hidden', 'true');
  fromBanner.dataset.bannerState = exitState;

  toBanner.setAttribute('aria-hidden', 'false');
  toBanner.dataset.bannerState = enterState;

  window.requestAnimationFrame(() => {
    setBannerState(toBanner, STATE_ACTIVE);
  });

  window.setTimeout(() => {
    if (fromBanner.dataset.bannerState === exitState) {
      setBannerState(fromBanner, STATE_IDLE);
    }
  }, TRANSITION_DURATION);
};

const buildDots = (heroContent, banners, handleManualNavigation) => {
  const dotsContainer = heroContent.querySelector(HERO_DOTS_SELECTOR);

  if (!dotsContainer || dotsContainer.dataset.bound === 'true') {
    return [];
  }

  const dots = banners.map((_, index) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.className = 'hero__dot';
    dot.setAttribute('aria-label', `Chuyển đến banner ${index + 1}`);

    dot.addEventListener('click', () => {
      const direction = index > Number(heroContent.dataset.activeIndex || 0) ? 'next' : 'prev';
      handleManualNavigation(index, direction);
    });

    dotsContainer.appendChild(dot);
    return dot;
  });

  dotsContainer.dataset.bound = 'true';
  return dots;
};

const syncDots = (dots, activeIndex) => {
  dots.forEach((dot, index) => {
    dot.classList.toggle(DOT_ACTIVE_CLASS, index === activeIndex);
    dot.setAttribute('aria-current', String(index === activeIndex));
  });
};

const startHeroBannerRotation = () => {
  const heroContent = document.querySelector(HERO_CONTENT_SELECTOR);

  if (!heroContent || heroContent.dataset.sliderBound === 'true') {
    return;
  }

  const banners = Array.from(heroContent.querySelectorAll(HERO_BANNER_SELECTOR));
  const prevButton = heroContent.querySelector(HERO_PREV_BUTTON_SELECTOR);
  const nextButton = heroContent.querySelector(HERO_NEXT_BUTTON_SELECTOR);

  if (banners.length < 2) {
    return;
  }

  heroContent.dataset.sliderBound = 'true';

  const initialIndex = Math.max(
    0,
    banners.findIndex((banner) => banner.classList.contains(ACTIVE_CLASS))
  );

  let activeIndex = initialIndex === -1 ? 0 : initialIndex;
  let intervalId = null;
  let isPaused = false;
  let isAnimating = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStarted = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goToBanner = (nextIndex, direction) => {
    if (isAnimating || nextIndex === activeIndex) {
      return;
    }

    isAnimating = true;
    const previousIndex = activeIndex;
    activeIndex = nextIndex;
    heroContent.dataset.activeIndex = String(activeIndex);

    rotateBanner(banners, previousIndex, nextIndex, direction);
    syncDots(dots, activeIndex);

    window.setTimeout(() => {
      isAnimating = false;
    }, TRANSITION_DURATION);
  };

  const handleManualNavigation = (targetIndex, direction) => {
    stopTimer();
    goToBanner(targetIndex, direction);

    if (!isPaused) {
      startTimer();
    }
  };

  const dots = buildDots(heroContent, banners, handleManualNavigation);

  const startTimer = () => {
    if (intervalId !== null || prefersReducedMotion) {
      return;
    }

    intervalId = window.setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      goToBanner(nextIndex, 'next');
    }, ROTATION_INTERVAL);
  };

  const stopTimer = () => {
    if (intervalId === null) {
      return;
    }

    window.clearInterval(intervalId);
    intervalId = null;
  };

  applyInitialState(banners, activeIndex);
  heroContent.dataset.activeIndex = String(activeIndex);
  syncDots(dots, activeIndex);

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      const previousIndex = (activeIndex - 1 + banners.length) % banners.length;
      handleManualNavigation(previousIndex, 'prev');
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const nextIndex = (activeIndex + 1) % banners.length;
      handleManualNavigation(nextIndex, 'next');
    });
  }

  heroContent.addEventListener('mouseenter', () => {
    isPaused = true;
    stopTimer();
  });

  heroContent.addEventListener('mouseleave', () => {
    isPaused = false;
    startTimer();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
      return;
    }

    if (!isPaused) {
      startTimer();
    }
  });

  heroContent.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const previousIndex = (activeIndex - 1 + banners.length) % banners.length;
      handleManualNavigation(previousIndex, 'prev');
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = (activeIndex + 1) % banners.length;
      handleManualNavigation(nextIndex, 'next');
    }
  });

  heroContent.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length === 0) {
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStarted = true;
  }, { passive: true });

  heroContent.addEventListener('touchend', (event) => {
    if (!touchStarted || !event.changedTouches || event.changedTouches.length === 0) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    touchStarted = false;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      const nextIndex = (activeIndex + 1) % banners.length;
      handleManualNavigation(nextIndex, 'next');
      return;
    }

    const previousIndex = (activeIndex - 1 + banners.length) % banners.length;
    handleManualNavigation(previousIndex, 'prev');
  }, { passive: true });

  startTimer();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startHeroBannerRotation);
} else {
  startHeroBannerRotation();
}
