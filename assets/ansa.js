/* ============================================================
   REPUESTOS ANSA — Global JavaScript
   ============================================================ */

// ── CART ──────────────────────────────────────────────────────
const ANSACart = {
  async add(variantId, quantity = 1) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    });
    const data = await res.json();
    ANSACart.updateCount();
    ANSACart.showNotification(data.product_title);
    return data;
  },

  async getCart() {
    const res = await fetch('/cart.js');
    return res.json();
  },

  async updateCount() {
    const cart = await ANSACart.getCart();
    const badges = document.querySelectorAll('[data-cart-count]');
    badges.forEach(b => {
      b.textContent = cart.item_count;
      b.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });
  },

  showNotification(title) {
    const el = document.getElementById('cart-notification');
    if (!el) return;
    el.querySelector('[data-notification-title]').textContent = title;
    el.classList.add('is-visible');
    clearTimeout(ANSACart._timer);
    ANSACart._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
  }
};

// ── ADD TO CART FORMS ─────────────────────────────────────────
document.addEventListener('submit', async (e) => {
  if (!e.target.matches('[data-add-to-cart-form]')) return;
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('[data-add-to-cart-btn]');
  const variantId = form.querySelector('[name="id"]').value;

  btn.disabled = true;
  btn.textContent = 'Agregando...';
  try {
    await ANSACart.add(variantId);
    btn.textContent = '✓ Agregado';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Agregar al carro';
    }, 2000);
  } catch {
    btn.disabled = false;
    btn.textContent = 'Agregar al carro';
  }
});

// ── MOBILE NAV TOGGLE ─────────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const mobileNav = document.getElementById('mobile-nav');
if (navToggle && mobileNav) {
  navToggle.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

// ── DRAWER CART ───────────────────────────────────────────────
const cartToggle = document.querySelectorAll('[data-cart-toggle]');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');

cartToggle.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!cartDrawer) return;
    cartDrawer.classList.toggle('is-open');
    cartOverlay?.classList.toggle('is-visible');
    document.body.style.overflow = cartDrawer.classList.contains('is-open') ? 'hidden' : '';
    if (cartDrawer.classList.contains('is-open')) {
      await ANSACart.renderDrawer();
    }
  });
});

cartOverlay?.addEventListener('click', () => {
  cartDrawer?.classList.remove('is-open');
  cartOverlay.classList.remove('is-visible');
  document.body.style.overflow = '';
});

ANSACart.renderDrawer = async function() {
  const cart = await ANSACart.getCart();
  const container = document.getElementById('cart-drawer-items');
  if (!container) return;

  if (cart.item_count === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Tu carro está vacío</p>
        <a href="/collections/all" class="btn btn-primary">Ver productos</a>
      </div>`;
    return;
  }

  const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
  container.innerHTML = cart.items.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <div class="cart-item__image">
        <img src="${item.featured_image?.url || ''}" alt="${item.product_title}" loading="lazy">
      </div>
      <div class="cart-item__info">
        <div class="cart-item__brand">${item.vendor}</div>
        <div class="cart-item__title">${item.product_title}</div>
        <div class="cart-item__variant">${item.variant_title !== 'Default Title' ? item.variant_title : ''}</div>
        <div class="cart-item__price">${formatter.format(item.final_line_price / 100)}</div>
        <div class="cart-item__qty">
          <button class="qty-btn" data-action="decrease" data-key="${item.key}">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="increase" data-key="${item.key}">+</button>
        </div>
      </div>
      <button class="cart-item__remove" data-key="${item.key}">✕</button>
    </div>
  `).join('');

  document.getElementById('cart-drawer-total').textContent = formatter.format(cart.total_price / 100);
};

// Cart quantity & remove
document.addEventListener('click', async (e) => {
  if (e.target.matches('[data-action]') || e.target.matches('.cart-item__remove')) {
    const key = e.target.dataset.key;
    const action = e.target.dataset.action;
    const item = document.querySelector(`.cart-item[data-key="${key}"]`);
    const currentQty = item ? parseInt(item.querySelector('span').textContent) : 0;

    let newQty = currentQty;
    if (action === 'increase') newQty++;
    else if (action === 'decrease') newQty--;
    else newQty = 0; // remove

    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: Math.max(0, newQty) })
    });
    await ANSACart.updateCount();
    await ANSACart.renderDrawer();
  }
});

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ANSACart.updateCount();
});
