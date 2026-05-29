// Slop Burgers — single-page app + burger-builder mini-game.

const state = {
  view: 'menu',       // 'menu' | 'game' | 'cart'
  cart: [],           // [{ id, name, price, unitPrice, discount }]
  unlockedDiscounts: {}, // { burgerId: code }
  game: null,
};

const app = document.getElementById('app');
const navMenu = document.getElementById('nav-menu');
const navCart = document.getElementById('nav-cart');
const cartCount = document.getElementById('cart-count');

navMenu.addEventListener('click', () => render('menu'));
navCart.addEventListener('click', () => render('cart'));

function render(view) {
  state.view = view;
  navMenu.classList.toggle('active', view === 'menu');
  navCart.classList.toggle('active', view === 'cart');
  cartCount.textContent = state.cart.length;

  app.innerHTML = '';
  if (view === 'menu') renderMenu();
  else if (view === 'game') renderGame();
  else if (view === 'cart') renderCart();
}

// ---------- MENU ----------
function renderMenu() {
  const tpl = document.getElementById('tpl-menu').content.cloneNode(true);
  app.appendChild(tpl);

  const grid = document.getElementById('menu-grid');
  for (const item of MENU) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    const unlocked = state.unlockedDiscounts[item.id];
    const ingredientNames = item.recipe
      .filter(i => i !== 'bottom-bun' && i !== 'top-bun')
      .map(i => INGREDIENTS[i].label)
      .join(', ');

    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="ingredients">${ingredientNames}</div>
      <div class="price">$${item.price.toFixed(2)}</div>
      ${unlocked ? `<div class="discount-badge">${DISCOUNT_PERCENT}% OFF unlocked: ${unlocked}</div>` : ''}
      <div class="actions">
        <button class="ghost-btn" data-play="${item.id}">Build it (${DISCOUNT_PERCENT}% off)</button>
        <button class="primary-btn" data-add="${item.id}">Add to cart</button>
      </div>
    `;
    grid.appendChild(card);
  }

  grid.addEventListener('click', (e) => {
    const playId = e.target.dataset.play;
    const addId = e.target.dataset.add;
    if (playId) startGame(playId);
    if (addId) addToCart(addId);
  });
}

// ---------- GAME ----------
function startGame(burgerId) {
  const burger = MENU.find(b => b.id === burgerId);
  state.game = {
    burger,
    step: 0,
    lives: 3,
    timeLeft: 30 + burger.recipe.length * 2,
    timerHandle: null,
    over: false,
  };
  render('game');
}

function renderGame() {
  const tpl = document.getElementById('tpl-game').content.cloneNode(true);
  app.appendChild(tpl);

  const g = state.game;
  document.getElementById('game-title').textContent = `Make it: ${g.burger.name}`;
  document.getElementById('back-btn').addEventListener('click', () => {
    stopGameTimer();
    render('menu');
  });

  refreshRecipeUI();
  refreshConveyor();
  refreshStats();
  startGameTimer();
}

function refreshRecipeUI() {
  const g = state.game;
  const list = document.getElementById('recipe-list');
  list.innerHTML = '';
  g.burger.recipe.forEach((ing, idx) => {
    const li = document.createElement('li');
    li.textContent = INGREDIENTS[ing].label;
    if (idx < g.step) li.classList.add('done');
    else if (idx === g.step) li.classList.add('current');
    list.appendChild(li);
  });
  const next = g.burger.recipe[g.step];
  document.getElementById('next-ingredient').textContent = next ? INGREDIENTS[next].label : '—';
}

function refreshConveyor() {
  const g = state.game;
  const conveyor = document.getElementById('conveyor');
  conveyor.innerHTML = '';

  // Show the correct next ingredient mixed with random distractors.
  const correct = g.burger.recipe[g.step];
  if (!correct) return;

  const pool = Object.keys(INGREDIENTS).filter(k => k !== correct);
  shuffle(pool);
  const distractors = pool.slice(0, 5);
  const choices = shuffle([correct, ...distractors]);

  for (const ing of choices) {
    const btn = document.createElement('button');
    btn.className = 'ingredient-btn';
    btn.textContent = INGREDIENTS[ing].label;
    btn.style.borderLeft = `8px solid ${INGREDIENTS[ing].color}`;
    btn.addEventListener('click', () => onPickIngredient(ing, btn));
    conveyor.appendChild(btn);
  }
}

function onPickIngredient(ing, btn) {
  const g = state.game;
  if (g.over) return;
  const correct = g.burger.recipe[g.step];

  if (ing === correct) {
    btn.classList.add('flash-good');
    addLayerToStack(ing);
    g.step += 1;
    if (g.step >= g.burger.recipe.length) {
      finishGame(true);
      return;
    }
    refreshRecipeUI();
    setTimeout(refreshConveyor, 220);
  } else {
    btn.classList.add('flash-bad');
    g.lives -= 1;
    refreshStats();
    if (g.lives <= 0) finishGame(false);
  }
}

function addLayerToStack(ing) {
  const stack = document.getElementById('stack');
  const layer = document.createElement('div');
  layer.className = 'layer';
  layer.textContent = INGREDIENTS[ing].label;
  layer.style.background = INGREDIENTS[ing].color;
  // Buns get a slightly taller, rounder shape. Sauces are thinner.
  if (ing === 'top-bun' || ing === 'bottom-bun') {
    layer.style.padding = '14px 16px';
    layer.style.borderRadius = ing === 'top-bun' ? '999px 999px 6px 6px' : '6px 6px 999px 999px';
  } else if (['mayo', 'ketchup', 'mustard', 'slop-sauce'].includes(ing)) {
    layer.style.padding = '4px 16px';
    layer.style.fontSize = '11px';
    layer.style.fontStyle = 'italic';
  }
  stack.appendChild(layer);
}

function refreshStats() {
  const g = state.game;
  document.getElementById('lives').textContent = g.lives;
  document.getElementById('timer').textContent = g.timeLeft;
}

function startGameTimer() {
  stopGameTimer();
  state.game.timerHandle = setInterval(() => {
    state.game.timeLeft -= 1;
    refreshStats();
    if (state.game.timeLeft <= 0) finishGame(false);
  }, 1000);
}

function stopGameTimer() {
  if (state.game && state.game.timerHandle) {
    clearInterval(state.game.timerHandle);
    state.game.timerHandle = null;
  }
}

function finishGame(won) {
  const g = state.game;
  g.over = true;
  stopGameTimer();

  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');

  if (won) {
    const code = ensureDiscountCode(g.burger.id);
    overlay.innerHTML = `
      <h2>Order up!</h2>
      <p>You built a perfect <strong>${g.burger.name}</strong>.</p>
      <div class="code-box">${code}</div>
      <p>${DISCOUNT_PERCENT}% off applies automatically when you add this exact burger.</p>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="primary-btn" id="overlay-add">Add with discount</button>
        <button class="ghost-btn" id="overlay-back">Back to menu</button>
      </div>
    `;
    document.getElementById('overlay-add').addEventListener('click', () => {
      addToCart(g.burger.id);
      render('cart');
    });
    document.getElementById('overlay-back').addEventListener('click', () => render('menu'));
  } else {
    overlay.innerHTML = `
      <h2>Slopped it.</h2>
      <p>The kitchen's a mess. No discount this time.</p>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="primary-btn" id="overlay-retry">Try again</button>
        <button class="ghost-btn" id="overlay-back">Back to menu</button>
      </div>
    `;
    document.getElementById('overlay-retry').addEventListener('click', () => startGame(g.burger.id));
    document.getElementById('overlay-back').addEventListener('click', () => render('menu'));
  }
}

function ensureDiscountCode(burgerId) {
  if (state.unlockedDiscounts[burgerId]) return state.unlockedDiscounts[burgerId];
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `SLOP-${burgerId.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}-${suffix}`;
  state.unlockedDiscounts[burgerId] = code;
  return code;
}

// ---------- CART ----------
function addToCart(burgerId) {
  const burger = MENU.find(b => b.id === burgerId);
  const hasDiscount = !!state.unlockedDiscounts[burgerId];
  // Discount applies once per unlocked code — only the first matching item in the cart gets it.
  const alreadyDiscounted = state.cart.some(i => i.id === burgerId && i.discount);
  const applyDiscount = hasDiscount && !alreadyDiscounted;

  const unitPrice = burger.price;
  const finalPrice = applyDiscount
    ? +(unitPrice * (1 - DISCOUNT_PERCENT / 100)).toFixed(2)
    : unitPrice;

  state.cart.push({
    id: burger.id,
    name: burger.name,
    unitPrice,
    price: finalPrice,
    discount: applyDiscount ? state.unlockedDiscounts[burgerId] : null,
  });
  cartCount.textContent = state.cart.length;
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  // Re-evaluate discounts so removing a discounted item lets the next match claim it.
  rebalanceDiscounts();
  render('cart');
}

function rebalanceDiscounts() {
  const claimed = {};
  for (const item of state.cart) {
    const code = state.unlockedDiscounts[item.id];
    if (code && !claimed[item.id]) {
      item.discount = code;
      item.price = +(item.unitPrice * (1 - DISCOUNT_PERCENT / 100)).toFixed(2);
      claimed[item.id] = true;
    } else {
      item.discount = null;
      item.price = item.unitPrice;
    }
  }
}

function renderCart() {
  const tpl = document.getElementById('tpl-cart').content.cloneNode(true);
  app.appendChild(tpl);
  const list = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  const checkout = document.getElementById('checkout-btn');

  if (state.cart.length === 0) {
    list.innerHTML = `<div class="empty">Cart is empty. Go build a burger!</div>`;
    summary.innerHTML = '';
    checkout.style.display = 'none';
    return;
  }

  state.cart.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'cart-item' + (item.discount ? ' discounted' : '');
    row.innerHTML = `
      <div>
        <div class="name">${item.name}</div>
        <div class="meta">
          ${item.discount
            ? `<span class="discount-badge">${item.discount} · ${DISCOUNT_PERCENT}% off</span>`
            : `Standard price`}
        </div>
      </div>
      <div style="display:flex; align-items:center;">
        <div class="price">
          ${item.discount
            ? `<span style="color:var(--muted); text-decoration:line-through; font-weight:400; margin-right:6px;">$${item.unitPrice.toFixed(2)}</span>$${item.price.toFixed(2)}`
            : `$${item.price.toFixed(2)}`}
        </div>
        <button class="remove" data-remove="${idx}">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.addEventListener('click', (e) => {
    const idx = e.target.dataset.remove;
    if (idx !== undefined) removeCartItem(+idx);
  });

  const subtotal = state.cart.reduce((s, i) => s + i.unitPrice, 0);
  const total = state.cart.reduce((s, i) => s + i.price, 0);
  const savings = subtotal - total;

  summary.innerHTML = `
    <div class="row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    ${savings > 0 ? `<div class="row savings"><span>Game discounts</span><span>-$${savings.toFixed(2)}</span></div>` : ''}
    <div class="row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
  `;
  checkout.style.display = 'block';
  checkout.onclick = () => {
    alert(`Order placed! Total: $${total.toFixed(2)}\n\nThanks for slopping with us.`);
    state.cart = [];
    state.unlockedDiscounts = {}; // discounts are single-use per session
    render('menu');
  };
}

// ---------- utils ----------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// boot
render('menu');
