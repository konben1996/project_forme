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
  const baseUrl = `${window.location.origin}${getProjectBasePath()}`;
  return new URL(relativePath, baseUrl).href;
};

const setHeaderLinks = () => {
  const header = document.getElementById('site-header');

  if (!header) {
    return;
  }

  const homeLinks = header.querySelectorAll('.logo, a[aria-label="Trang chủ"]');
  const registerLinks = header.querySelectorAll('a[aria-label="Đăng ký tài khoản"]');
  const accountLinks = header.querySelectorAll('a[aria-label="Thông tin tài khoản"]');
  const cartLinks = header.querySelectorAll('a[aria-label="Giỏ hàng"]');
  const loginLinks = header.querySelectorAll('a[aria-label="Đăng nhập"]');

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
};

const loadHeader = async () => {
  const header = document.getElementById('site-header');

  if (!header) {
    return;
  }

  try {
    const response = await fetch(resolveSiteUrl('src/layout/header.html'));

    if (!response.ok) {
      throw new Error(`Failed to load header: ${response.status}`);
    }

    header.innerHTML = await response.text();
    setHeaderLinks();
  } catch (error) {
    console.error(error);
    header.innerHTML = '';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeader);
} else {
  loadHeader();
}
