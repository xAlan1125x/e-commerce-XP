const productList = document.querySelector('#product-list');
const orderProduct = document.querySelector('#order-product');
const notice = document.querySelector('#notice');

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Error HTTP ${response.status}`);
  return body;
}

function renderProducts(products) {
  productList.innerHTML = products.length
    ? products.map((product) => `
        <article class="product-card">
          <h3>${escapeHtml(product.nombre)}</h3>
          <p class="price">$${Number(product.precio).toLocaleString('es-AR')}</p>
          <p class="meta">Categoría: ${escapeHtml(product.categoria)}</p>
          <p class="meta">Stock: ${product.stock} unidades</p>
        </article>`).join('')
    : '<p class="empty">No hay productos para mostrar.</p>';
  orderProduct.innerHTML = products.map((product) =>
    `<option value="${escapeHtml(product.nombre)}">${escapeHtml(product.nombre)} (${product.stock})</option>`).join('');
}

async function loadProducts() {
  const category = document.querySelector('#category-filter').value.trim();
  const query = category ? `?categoria=${encodeURIComponent(category)}` : '';
  try { renderProducts(await api(`/api/productos${query}`)); }
  catch (error) { productList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

document.querySelector('#filter-form').addEventListener('submit', (event) => { event.preventDefault(); loadProducts(); });
document.querySelector('#refresh-products').addEventListener('click', loadProducts);
document.querySelector('#product-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  data.precio = Number(data.precio);
  data.stock = Number(data.stock);
  try {
    await api('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    notice.textContent = 'Producto creado correctamente.';
    form.reset();
    await loadProducts();
  } catch (error) { notice.textContent = error.message; }
});
document.querySelector('#order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  data.cantidad = Number(data.cantidad);
  const result = document.querySelector('#order-result');
  try {
    const order = await api('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    result.textContent = `Pedido #${order.id} creado. Stock restante: ${order.stockRestante}.`;
    await loadProducts();
  } catch (error) { result.textContent = error.message; }
});
loadProducts();
