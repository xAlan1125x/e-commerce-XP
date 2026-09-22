const $ = (selector) => document.querySelector(selector);
const productList = $('#product-list');
const cartList = $('#cart-list');
const stockList = $('#stock-list');
const cart = new Map();

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Error HTTP ${response.status}`);
  return body;
}

function feedback(element, message, state = 'success') {
  element.className = `notice ${state}`;
  element.textContent = message;
  clearTimeout(element.feedbackTimer);
  if (message) element.feedbackTimer = setTimeout(() => { element.textContent = ''; element.className = 'notice'; }, 4500);
}

function busy(button, value) {
  if (!button) return;
  if (value) { button.dataset.label = button.textContent; button.disabled = true; button.textContent = 'Procesando...'; }
  else { button.disabled = false; button.textContent = button.dataset.label || button.textContent; }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function renderCart() {
  const items = [...cart.values()];
  cartList.innerHTML = items.length ? items.map((item) => `
    <div class="cart-row"><span>${escapeHtml(item.producto)}</span>
      <input class="cart-quantity" data-product="${escapeHtml(item.producto)}" type="number" min="1" max="${item.stock}" value="${item.cantidad}">
      <button class="link-button remove-cart" data-product="${escapeHtml(item.producto)}" type="button">Quitar</button>
    </div>`).join('') : '<p class="empty">El carrito esta vacio.</p>';
}

function renderProducts(products) {
  productList.innerHTML = products.length ? products.map((p) => `
    <article class="product-card">
      <h3>${escapeHtml(p.nombre)}</h3>
      <p class="price">$${Number(p.precio).toLocaleString('es-AR')}</p>
      <p class="meta">Categoria: ${escapeHtml(p.categoria)}</p><p class="meta">Stock: ${p.stock} unidades</p>
      <button class="button add-cart" data-product="${escapeHtml(p.nombre)}" data-price="${p.precio}" data-stock="${p.stock}" type="button" ${p.stock < 1 ? 'disabled' : ''}>${p.stock ? 'Agregar al carrito' : 'Sin stock'}</button>
    </article>`).join('') : '<p class="empty">No hay productos para mostrar.</p>';
  stockList.innerHTML = products.length ? products.map((p) => `<form class="stock-row" data-id="${p.id}">
    <span>${escapeHtml(p.nombre)}</span><input name="stock" type="number" min="0" step="1" value="${p.stock}" required>
    <button class="button secondary" type="submit">Guardar</button></form>`).join('') : '<p class="empty">No hay productos.</p>';
}

async function loadProducts() {
  const category = $('#category-filter').value.trim();
  const query = category ? `?categoria=${encodeURIComponent(category)}` : '';
  try { renderProducts(await api(`/api/productos${query}`)); }
  catch (error) { productList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; feedback($('#notice'), error.message, 'error'); }
}

async function loadSellerOrders() {
  const target = $('#seller-orders');
  try {
    const orders = await api('/api/pedidos');
    target.innerHTML = orders.length ? orders.map((order) => `<article class="order-row">
      <div><strong>#${order.id}</strong> ${escapeHtml(order.clienteId)} <span class="status">${escapeHtml(order.estado)}</span>
      <p class="meta">${(order.items || [{ producto: order.producto, cantidad: order.cantidad }]).map((i) => `${escapeHtml(i.producto)} x${i.cantidad}`).join(', ')}</p></div>
      <small>${new Date(order.createdAt).toLocaleString('es-AR')}</small>
    </article>`).join('') : '<p class="empty">No hay pedidos.</p>';
  } catch (error) { target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; }
}

async function loadHistory(clienteId) {
  const target = $('#history-list');
  try {
    const orders = await api(`/api/pedidos/historial/${encodeURIComponent(clienteId)}`);
    target.innerHTML = orders.length ? orders.map((order) => `<article class="order-row">
      <div><strong>#${order.id}</strong> <span class="status">${escapeHtml(order.estado)}</span>
      <p class="meta">${(order.items || []).map((i) => `${escapeHtml(i.producto)} x${i.cantidad}`).join(', ')}</p></div>
      ${order.estado !== 'Cancelado' && order.estado !== 'Enviado' && order.estado !== 'Entregado' ? `<button class="button danger cancel-order" data-id="${order.id}" type="button">Cancelar</button>` : ''}
    </article>`).join('') : '<p class="empty">No hay pedidos para este cliente.</p>';
  } catch (error) { target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; feedback($('#notice'), error.message, 'error'); }
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab, .tab-panel').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active'); $(`#${tab.dataset.tab}-tab`).classList.add('active');
  if (tab.dataset.tab === 'seller') loadSellerOrders();
}));
$('#filter-form').addEventListener('submit', (e) => {
  e.preventDefault(); const button = e.currentTarget.querySelector('button'); busy(button, true);
  loadProducts().finally(() => busy(button, false));
});
$('#refresh-products').addEventListener('click', (e) => { busy(e.currentTarget, true); loadProducts().finally(() => busy(e.currentTarget, false)); });
$('#product-list').addEventListener('click', (e) => {
  if (!e.target.classList.contains('add-cart')) return;
  const b = e.target;
  const current = cart.get(b.dataset.product)?.cantidad || 0;
  const stock = Number(b.dataset.stock);
  cart.set(b.dataset.product, { producto: b.dataset.product, precioUnitario: Number(b.dataset.price), stock, cantidad: Math.min(stock, current + 1) });
  renderCart();
});
$('#cart-list').addEventListener('input', (e) => { if (!e.target.classList.contains('cart-quantity')) return; const item = cart.get(e.target.dataset.product); item.cantidad = Math.max(1, Math.min(item.stock, Number(e.target.value) || 1)); renderCart(); });
$('#cart-list').addEventListener('click', (e) => { if (e.target.classList.contains('remove-cart')) { cart.delete(e.target.dataset.product); renderCart(); } });
$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget; const button = form.querySelector('button'); busy(button, true); feedback($('#notice'), ''); const data = Object.fromEntries(new FormData(form)); data.precio = Number(data.precio); data.stock = Number(data.stock);
  try { await api('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); form.reset(); feedback($('#notice'), 'Producto creado correctamente.'); await loadProducts(); } catch (error) { feedback($('#notice'), error.message, 'error'); } finally { busy(button, false); }
});
$('#stock-list').addEventListener('submit', async (e) => {
  if (!e.target.classList.contains('stock-row')) return;
  e.preventDefault(); const form = e.target; const button = form.querySelector('button'); busy(button, true);
  try {
    await api(`/api/productos/${form.dataset.id}/stock`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: Number(new FormData(form).get('stock')) }) });
    feedback($('#notice'), 'Stock actualizado correctamente.'); await loadProducts();
  } catch (error) { feedback($('#notice'), error.message, 'error'); } finally { busy(button, false); }
});
$('#order-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget; const button = form.querySelector('button'); const items = [...cart.values()].map(({ producto, cantidad, precioUnitario }) => ({ producto, cantidad, precioUnitario })); if (!items.length) return feedback($('#order-result'), 'Agrega al menos un producto.', 'error');
  busy(button, true); feedback($('#order-result'), ''); const clienteId = new FormData(form).get('clienteId');
  try { const order = await api('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId, items }) }); cart.clear(); renderCart(); feedback($('#order-result'), `Pedido #${order.id} creado correctamente.`); await Promise.all([loadProducts(), loadHistory(clienteId)]); } catch (error) { feedback($('#order-result'), error.message, 'error'); } finally { busy(button, false); }
});
$('#history-form').addEventListener('submit', (e) => {
  e.preventDefault(); const button = e.currentTarget.querySelector('button'); busy(button, true);
  loadHistory($('#history-client').value.trim()).finally(() => busy(button, false));
});
$('#history-list').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('cancel-order')) return; const button = e.target; busy(button, true);
  try { await api(`/api/pedidos/${button.dataset.id}/cancelar`, { method: 'PATCH' }); feedback($('#notice'), 'Pedido cancelado y stock reintegrado.'); await Promise.all([loadHistory($('#history-client').value.trim()), loadProducts()]); } catch (error) { feedback($('#notice'), error.message, 'error'); } finally { busy(button, false); }
});
$('#refresh-orders').addEventListener('click', (e) => { busy(e.currentTarget, true); loadSellerOrders().finally(() => busy(e.currentTarget, false)); });
loadProducts();
