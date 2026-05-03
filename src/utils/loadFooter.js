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

const loadFooter = async () => {
  const footer = document.getElementById('site-footer');

  if (!footer) {
    return;
  }

  try {
    const response = await fetch(resolveSiteUrl('src/layout/footer.html'));

    if (!response.ok) {
      throw new Error(`Failed to load footer: ${response.status}`);
    }

    footer.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
    footer.innerHTML = '';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFooter);
} else {
  loadFooter();
}
