const setHomeLink = () => {
  const homeLink = document.querySelector('#site-header a[aria-label="Trang chủ"]');

  if (homeLink) {
    homeLink.setAttribute('href', '/index.html');
  }
};

const loadHeader = async () => {
  const header = document.getElementById('site-header');

  if (!header) {
    return;
  }

  try {
    const response = await fetch('/src/layout/header.html');

    if (!response.ok) {
      throw new Error(`Failed to load header: ${response.status}`);
    }

    header.innerHTML = await response.text();
    setHomeLink();
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
