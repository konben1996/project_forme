const loadFooter = async () => {
  const footer = document.getElementById('site-footer');

  if (!footer) {
    return;
  }

  try {
    const response = await fetch('/src/layout/footer.html');

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
