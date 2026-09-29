const $ = (selector) => document.querySelector(selector);
const productList = $('#product-list');
const cartList = $('#cart-list');
const stockList = $('#stock-list');
const cart = new Map();

let session = null;
try { session = JSON.parse(localStorage.getItem('session') || 'null'); } catch { session = null; }

function saveSession(nueva) {
  session = nueva;
  try { nueva ? localStorage.setItem('session', JSON.stringify(nueva)) : localStorage.removeItem('session'); } catch { /* almacenamiento no disponible */ }
  updateSessionUI();
}

function updateSessionUI() {
  const status = $('#session-status');
  const logoutButton = $('#logout-button');
  if (session) {
    status.textContent = `${session.clienteId} (${session.rol})`;
    $('#login-form').hidden = true;
    logoutButton.hidden = false;
    $('#history-client').value = session.clienteId;
    $('#order-form [name="clienteId"]').value = session.clienteId;
  } else {
    status.textContent = 'Sin sesión';
    $('#login-form').hidden = false;
    logoutButton.hidden = true;
  }
}

/** Adjunta el access token JWT a las llamadas que requieren autenticación (rutas ADMIN o de propiedad del recurso). */
function authHeaders() {
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

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
    <button class="button secondary" type="submit">Guardar</button>
    <button class="button danger delete-product" data-id="${p.id}" type="button">Eliminar</button></form>`).join('') : '<p class="empty">No hay productos.</p>';
}

async function loadProducts() {
  const category = $('#category-filter').value.trim();
  const query = category ? `?categoria=${encodeURIComponent(category)}` : '';
  try { renderProducts(await api(`/api/productos${query}`)); return true; }
  catch (error) { productList.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; feedback($('#notice'), error.message, 'error'); return false; }
}

async function loadSellerOrders() {
  const target = $('#seller-orders');
  try {
    const orders = await api('/api/pedidos', { headers: { ...authHeaders() } });
    target.innerHTML = orders.length ? orders.map((order) => `<article class="order-row">
      <div><strong>#${order.id}</strong> ${escapeHtml(order.clienteId)} <span class="status">${escapeHtml(order.estado)}</span>
      <p class="meta">${(order.items || [{ producto: order.producto, cantidad: order.cantidad }]).map((i) => `${escapeHtml(i.producto)} x${i.cantidad}`).join(', ')}</p></div>
      <small>${new Date(order.createdAt).toLocaleString('es-AR')}</small>
    </article>`).join('') : '<p class="empty">No hay pedidos.</p>';
  } catch (error) { target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; return false; }
  return true;
}

async function loadHistory(clienteId) {
  const target = $('#history-list');
  try {
    const orders = await api(`/api/pedidos/historial/${encodeURIComponent(clienteId)}`, { headers: { ...authHeaders() } });
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
$('#refresh-products').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  busy(button, true);
  const loaded = await loadProducts();
  feedback($('#notice'), loaded ? 'Productos actualizados correctamente.' : 'No se pudieron actualizar los productos.', loaded ? 'success' : 'error');
  busy(button, false);
});
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
  try { await api('/api/productos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(data) }); form.reset(); feedback($('#notice'), 'Producto creado correctamente.'); await loadProducts(); } catch (error) { feedback($('#notice'), error.message, 'error'); } finally { busy(button, false); }
});
$('#stock-list').addEventListener('submit', async (e) => {
  if (!e.target.classList.contains('stock-row')) return;
  e.preventDefault(); const form = e.target; const button = form.querySelector('button'); busy(button, true);
  try {
    await api(`/api/productos/${form.dataset.id}/stock`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ stock: Number(new FormData(form).get('stock')) }) });
    feedback($('#notice'), 'Stock actualizado correctamente.'); await loadProducts();
  } catch (error) { feedback($('#notice'), error.message, 'error'); } finally { busy(button, false); }
});
$('#stock-list').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('delete-product')) return;
  const button = e.target;
  if (!window.confirm('¿Eliminar este producto del catálogo?')) return;
  busy(button, true);
  try {
    await api(`/api/productos/${button.dataset.id}`, { method: 'DELETE', headers: { ...authHeaders() } });
    feedback($('#notice'), 'Producto eliminado correctamente.');
    await loadProducts();
  } catch (error) {
    feedback($('#notice'), error.message, 'error');
  } finally {
    busy(button, false);
  }
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
$('#refresh-orders').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  busy(button, true);
  const loaded = await loadSellerOrders();
  feedback($('#notice'), loaded ? 'Pedidos actualizados correctamente.' : 'No se pudieron actualizar los pedidos.', loaded ? 'success' : 'error');
  busy(button, false);
});

$('#show-register').addEventListener('click', () => { $('#login-form').hidden = true; $('#register-form').hidden = false; });
$('#hide-register').addEventListener('click', () => { $('#register-form').hidden = true; $('#login-form').hidden = !!session; });

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget; const button = form.querySelector('button[type="submit"]'); busy(button, true); feedback($('#session-notice'), '');
  const data = Object.fromEntries(new FormData(form));
  if (!data.totp) delete data.totp;
  try {
    const sesion = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    saveSession(sesion);
    form.reset();
    feedback($('#session-notice'), `Sesión iniciada como ${sesion.clienteId}.`);
  } catch (error) { feedback($('#session-notice'), error.message, 'error'); } finally { busy(button, false); }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const form = e.currentTarget; const button = form.querySelector('button[type="submit"]'); busy(button, true); feedback($('#session-notice'), '');
  const data = Object.fromEntries(new FormData(form));
  data.twoFactorEnabled = form.elements.twoFactorEnabled.checked;
  try {
    await api('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    form.reset(); $('#register-form').hidden = true; $('#login-form').hidden = false;
    feedback($('#session-notice'), 'Cuenta creada. Ahora podes iniciar sesión.');
  } catch (error) { feedback($('#session-notice'), error.message, 'error'); } finally { busy(button, false); }
});

$('#logout-button').addEventListener('click', async () => {
  try { if (session?.refreshToken) await api('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: session.refreshToken }) }); } catch { /* revocación best-effort */ }
  saveSession(null);
  feedback($('#session-notice'), 'Sesión cerrada.');
});

updateSessionUI();
loadProducts();
