const FOOTER_TEMPLATE = `
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <h3>Computer Store</h3>
      <p>Cửa hàng máy tính, laptop, linh kiện và phụ kiện chính hãng.</p>
    </div>

    <div>
      <h4>Hỗ trợ</h4>
      <ul>
        <li><a href="#">Chính sách bảo hành</a></li>
        <li><a href="#">Chính sách đổi trả</a></li>
        <li><a href="#">Hướng dẫn mua hàng</a></li>
      </ul>
    </div>

    <div>
      <h4>Liên hệ</h4>
      <ul>
        <li>Hotline: 0900 000 001</li>
        <li>Email: support@computerstore.vn</li>
        <li>TP. Hồ Chí Minh</li>
      </ul>
    </div>
  </div>
</footer>
`;

const getFooterProjectBasePath = () => {
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

const resolveFooterUrl = (relativePath) => {
  const baseUrl = new URL(getFooterProjectBasePath(), window.location.href);
  return new URL(relativePath, baseUrl).href;
};

const loadFooter = async () => {
  const footer = document.getElementById('site-footer');

  if (!footer) {
    return;
  }

  if (window.location.protocol === 'file:') {
    footer.innerHTML = FOOTER_TEMPLATE;
    return;
  }

  try {
    const response = await fetch(resolveFooterUrl('src/layout/footer.html'));

    if (!response.ok) {
      throw new Error(`Failed to load footer: ${response.status}`);
    }

    footer.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
    footer.innerHTML = FOOTER_TEMPLATE;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFooter);
} else {
  loadFooter();
}
