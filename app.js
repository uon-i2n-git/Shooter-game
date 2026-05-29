// Slop Burgers — single-page app + "best build" burger mini-game.
//
// The game is NOT about memorising a recipe. You place the burger's
// ingredients in whatever order you like; the game scores HOW WELL you
// built it (burger science) while a stability meter tracks whether the
// stack is about to topple. Score + stability + speed decide your tier:
// Bronze 10% / Silver 15% / Gold 20%. Gold is very hard — see gradeBuild().

const state = {
  view: 'menu',          // 'menu' | 'game' | 'cart'
  cart: [],              // [{ key, id, name, addons, unitPrice, price, discount, percent }]
  unlockedDiscounts: {}, // { configKey: { code, percent, tier } }
  cardAddons: {},        // { burgerId: Set(addonId) }
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

// ---------- config helpers ----------
function getCardAddons(id) {
  if (!state.cardAddons[id]) state.cardAddons[id] = new Set();
  return state.cardAddons[id];
}
function toggleAddon(id, addonId) {
  const s = getCardAddons(id);
  if (s.has(addonId)) s.delete(addonId); else s.add(addonId);
}
function configKey(id, set) {
  return id + '|' + [...set].sort().join('+');
}
function computePrice(burger, set) {
  let p = burger.price;
  for (const a of set) p += ADDON_BY_ID[a].price;
  return +p.toFixed(2);
}
function middleNames(burger) {
  return burger.recipe
    .filter(i => i !== 'bottom-bun' && i !== 'top-bun')
    .map(i => INGREDIENTS[i].label)
    .join(', ');
}
// Full ordered multiset the player must place: bun, ...middle + add-ons..., top.
function buildRequired(burger, addons) {
  const middle = burger.recipe.filter(k => k !== 'bottom-bun' && k !== 'top-bun');
  const extra = addons.map(a => ADDON_BY_ID[a].ingredient);
  return ['bottom-bun', ...middle, ...extra, 'top-bun'];
}

// ---------- MENU ----------
function renderMenu() {
  const tpl = document.getElementById('tpl-menu').content.cloneNode(true);
  app.appendChild(tpl);

  const grid = document.getElementById('menu-grid');
  for (const item of MENU) {
    const addons = getCardAddons(item.id);
    const price = computePrice(item, addons);
    const key = configKey(item.id, addons);
    const unlocked = state.unlockedDiscounts[key];

    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <div class="ingredients">${middleNames(item)}</div>
      <div class="addon-row">
        ${ADDONS.map(a => `
          <button class="addon-chip ${addons.has(a.id) ? 'on' : ''}"
                  data-addon="${a.id}" data-burger="${item.id}">
            ${addons.has(a.id) ? '✓ ' : '+ '}${a.label} $${a.price.toFixed(2)}
          </button>`).join('')}
      </div>
      <div class="price">$${price.toFixed(2)}</div>
      ${unlocked ? `<div class="discount-badge tier-${unlocked.tier.toLowerCase()}">${unlocked.tier} unlocked · ${unlocked.percent}% off</div>` : ''}
      <div class="actions">
        <button class="ghost-btn" data-play="${item.id}">Build it for a deal</button>
        <button class="primary-btn" data-add="${item.id}">Add to cart</button>
      </div>
    `;
    grid.appendChild(card);
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.addon) { toggleAddon(btn.dataset.burger, btn.dataset.addon); render('menu'); return; }
    if (btn.dataset.play)  startGame(btn.dataset.play);
    if (btn.dataset.add)   addToCart(btn.dataset.add);
  });
}

// ---------- SCORING ENGINE ----------
// pairScore(below, x): quality of placing x directly on top of `below`.
// 0 (terrible) .. 15 (perfect). Pure "is this a smart placement" — stability
// is handled separately.
function pairScore(belowKey, xKey) {
  const B = INGREDIENTS[belowKey];
  const X = INGREDIENTS[xKey];

  if (belowKey === 'bottom-bun') {
    if (X.barrier) return 15;          // seal the bun against sog
    if (X.role === 'protein') return 11; // patty on bun: solid but no seal
    if (X.wet) return 0;               // soggy bun
    return 7;                          // onion / cheese on bare bun: meh
  }
  if (xKey === 'cheese') {
    if (B.hot) return 15;              // melted on a hot patty
    if (B.role === 'protein') return 11;
    return 5;                          // cold, floating cheese
  }
  if (X.weight >= 4) {                 // a patty
    if (B.role === 'veg' || B.role === 'cheese') return 1; // crushes delicate layers
    return 13;                         // on sauce / protein: stacked solid
  }
  if (xKey === 'bacon') {
    if (B.role === 'protein') return 12;
    if (B.role === 'cheese') return 11;
    if (B.role === 'sauce') return 9;
    return 8;
  }
  if (X.role === 'sauce') {
    if (B.role === 'protein' || B.role === 'cheese') return 13; // dress the patty
    if (B.role === 'veg') return 8;
    return 6;
  }
  if (X.role === 'veg') {
    if (B.role === 'protein' || B.role === 'cheese') return 13; // fresh up high
    if (B.role === 'sauce') return 9;
    return 7;                          // veg on veg
  }
  return 7;
}

// How much a placement drains the stability meter.
function stabilityCost(belowKey, xKey) {
  if (!belowKey) return 0;             // bottom bun, nothing below
  if (xKey === 'top-bun') return 3;
  const B = INGREDIENTS[belowKey];
  const X = INGREDIENTS[xKey];
  let c = 4;                           // base settle
  if (X.weight >= 4 && (B.role === 'veg' || B.role === 'cheese')) c += 14; // crushing
  if (X.slip >= 2 && B.slip >= 2) c += 9;            // two slippery layers
  if (X.weight - B.weight >= 3) c += 6;              // top-heavy
  return c;
}

function placementMessage(belowKey, key, pts) {
  if (key === 'bottom-bun') return 'Solid foundation';
  if (key === 'top-bun')    return 'Capped it off';
  const B = INGREDIENTS[belowKey];
  const X = INGREDIENTS[key];
  if (belowKey === 'bottom-bun') {
    if (X.barrier) return 'Moisture barrier — bun stays crisp';
    if (X.wet)     return 'Soggy bun! wet straight on the bread';
  }
  if (key === 'cheese' && B.hot) return 'Melted cheese on a hot patty';
  if (X.weight >= 4 && (B.role === 'veg' || B.role === 'cheese')) return 'Crushing the layer below!';
  if (X.slip >= 2 && B.slip >= 2) return "Slippery — that'll slide";
  if (pts >= 13) return 'Perfect placement';
  if (pts >= 8)  return 'Good stack';
  return 'Messy — rethink the order';
}

// Held-Karp: best achievable middle ordering for this exact ingredient set,
// used as the denominator so a flawless build scores ~100%.
function optimalScore(required) {
  const middle = required.filter(k => k !== 'bottom-bun' && k !== 'top-bun');
  const m = middle.length;
  if (m === 0) return 20; // just buns
  const full = (1 << m) - 1;
  // dp[mask][j] = best score for placing set `mask`, ending at middle node j.
  const dp = Array.from({ length: 1 << m }, () => new Array(m).fill(-Infinity));
  for (let j = 0; j < m; j++) dp[1 << j][j] = pairScore('bottom-bun', middle[j]);
  for (let mask = 1; mask <= full; mask++) {
    for (let j = 0; j < m; j++) {
      if (dp[mask][j] === -Infinity || !(mask & (1 << j))) continue;
      for (let k = 0; k < m; k++) {
        if (mask & (1 << k)) continue;
        const nm = mask | (1 << k);
        const val = dp[mask][j] + pairScore(middle[j], middle[k]);
        if (val > dp[nm][k]) dp[nm][k] = val;
      }
    }
  }
  let best = -Infinity;
  for (let j = 0; j < m; j++) best = Math.max(best, dp[full][j]);
  return 10 /* bun */ + best + 10 /* top */;
}

// Final grade. Gold demands a near-optimal order, zero sloppy placements,
// a stack that stayed stable, AND quick play.
function gradeBuild(g) {
  const ratio = g.optimal > 0 ? Math.min(1, Math.max(0, g.earned) / g.optimal) : 0;
  const stabilityRetained = Math.max(0, g.stability) / 100;
  const speedFactor = Math.max(0, g.timeLeft) / g.initialTime;
  const composite = ratio * 70 + stabilityRetained * 18 + speedFactor * 12; // 0..100

  let tier = null;
  if (composite >= 90 && g.mistakes === 0 && ratio >= 0.95) tier = TIERS.gold;
  else if (composite >= 70) tier = TIERS.silver;
  else if (composite >= 50) tier = TIERS.bronze;

  return { tier, score: Math.round(composite), ratio, stabilityRetained, speedFactor };
}

// ---------- GAME ----------
function startGame(burgerId) {
  const burger = MENU.find(b => b.id === burgerId);
  const addonSet = getCardAddons(burgerId);
  const required = buildRequired(burger, [...addonSet]);
  const middleCount = required.length - 2;
  state.game = {
    burger,
    key: configKey(burgerId, addonSet),
    required,
    remaining: [...required],
    placed: [],
    stability: 100,
    combo: 0,
    maxCombo: 0,
    earned: 0,
    optimal: optimalScore(required),
    mistakes: 0,
    initialTime: 12 + middleCount * 3,
    timeLeft: 12 + middleCount * 3,
    timerHandle: null,
    over: false,
  };
  render('game');
}

function renderGame() {
  const tpl = document.getElementById('tpl-game').content.cloneNode(true);
  app.appendChild(tpl);

  const g = state.game;
  document.getElementById('game-title').textContent = `Build: ${g.burger.name}`;
  document.getElementById('back-btn').addEventListener('click', () => {
    stopGameTimer();
    render('menu');
  });

  refreshChecklist();
  refreshConveyor();
  refreshStats();
  applyLean();
  startGameTimer();
}

function currentPhase(g) {
  if (g.placed.length === 0) return 'foundation';
  if (g.remaining.length > 0 && g.remaining.every(k => k === 'top-bun')) return 'cap';
  return 'build';
}
function isEnabled(key, phase) {
  if (phase === 'foundation') return key === 'bottom-bun';
  if (phase === 'cap') return key === 'top-bun';
  return key !== 'top-bun' && key !== 'bottom-bun';
}

function refreshChecklist() {
  const g = state.game;
  const list = document.getElementById('checklist');
  const totals = {}, placedCounts = {};
  g.required.forEach(k => totals[k] = (totals[k] || 0) + 1);
  g.placed.forEach(k => placedCounts[k] = (placedCounts[k] || 0) + 1);
  list.innerHTML = Object.keys(totals).map(k => {
    const done = (placedCounts[k] || 0) >= totals[k];
    return `<li class="${done ? 'done' : ''}"><span>${INGREDIENTS[k].label}</span><span>${placedCounts[k] || 0}/${totals[k]}</span></li>`;
  }).join('');
}

function refreshConveyor() {
  const g = state.game;
  const conveyor = document.getElementById('conveyor');
  conveyor.innerHTML = '';
  const phase = currentPhase(g);

  const counts = {};
  g.remaining.forEach(k => counts[k] = (counts[k] || 0) + 1);
  // Stable display order: follow first appearance in `required`.
  const seen = new Set();
  const order = g.required.filter(k => counts[k] && !seen.has(k) && seen.add(k));

  for (const key of order) {
    const ing = INGREDIENTS[key];
    const btn = document.createElement('button');
    btn.className = 'ingredient-btn';
    btn.innerHTML = `${ing.label}${counts[key] > 1 ? ` <span class="count">${counts[key]}</span>` : ''}`;
    btn.style.borderLeft = `8px solid ${ing.color}`;
    if (!isEnabled(key, phase)) {
      btn.disabled = true;
      btn.classList.add('disabled');
    } else {
      btn.addEventListener('click', () => onPlace(key, btn));
    }
    conveyor.appendChild(btn);
  }
}

function onPlace(key, btn) {
  const g = state.game;
  if (g.over) return;
  if (!isEnabled(key, currentPhase(g))) return;

  const idx = g.remaining.indexOf(key);
  if (idx < 0) return;

  const belowKey = g.placed[g.placed.length - 1];
  let pts;
  if (key === 'bottom-bun' || key === 'top-bun') pts = 10;
  else pts = pairScore(belowKey, key);

  const isMiddle = key !== 'bottom-bun' && key !== 'top-bun';
  const good = isMiddle ? pts >= 8 : true;
  if (isMiddle && pts < 8) g.mistakes += 1;
  if (good) { g.combo += 1; g.maxCombo = Math.max(g.maxCombo, g.combo); }
  else g.combo = 0;

  g.earned += pts;
  g.stability -= stabilityCost(belowKey, key);
  g.remaining.splice(idx, 1);
  g.placed.push(key);

  addLayerToStack(key, good);
  showFeedback(placementMessage(belowKey, key, pts), good, pts);
  refreshStats();
  refreshChecklist();
  applyLean();

  if (g.stability <= 0) { finishGame('topple'); return; }
  if (g.remaining.length === 0) { finishGame('done'); return; }
  refreshConveyor();
}

function addLayerToStack(key, good) {
  const stack = document.getElementById('stack');
  const layer = document.createElement('div');
  layer.className = 'layer' + (good ? '' : ' bad');
  layer.textContent = INGREDIENTS[key].label;
  layer.style.background = INGREDIENTS[key].color;
  if (key === 'top-bun' || key === 'bottom-bun') {
    layer.style.padding = '14px 16px';
    layer.style.borderRadius = key === 'top-bun' ? '999px 999px 6px 6px' : '6px 6px 999px 999px';
  } else if (['mayo', 'ketchup', 'mustard', 'slop-sauce'].includes(key)) {
    layer.style.padding = '4px 16px';
    layer.style.fontSize = '11px';
    layer.style.fontStyle = 'italic';
  }
  stack.appendChild(layer);
}

function applyLean() {
  const g = state.game;
  const stack = document.getElementById('stack');
  if (!stack) return;
  const lean = Math.min((100 - Math.max(0, g.stability)) * 0.14, 16);
  stack.style.transform = `rotate(${lean}deg)`;
}

function showFeedback(msg, good, pts) {
  const fb = document.getElementById('feedback');
  if (!fb) return;
  fb.textContent = `${pts >= 0 ? '+' : ''}${pts} · ${msg}`;
  fb.className = 'feedback show ' + (good ? 'good' : 'bad');
  clearTimeout(fb._t);
  fb._t = setTimeout(() => fb.classList.remove('show'), 1100);
}

function refreshStats() {
  const g = state.game;
  document.getElementById('timer').textContent = Math.max(0, g.timeLeft);
  document.getElementById('combo').textContent = g.combo;
  const fill = document.getElementById('stability-fill');
  const pct = Math.max(0, g.stability);
  fill.style.width = pct + '%';
  fill.className = 'stability-fill' + (pct <= 25 ? ' danger' : pct <= 55 ? ' warn' : '');
}

function startGameTimer() {
  stopGameTimer();
  state.game.timerHandle = setInterval(() => {
    state.game.timeLeft -= 1;
    refreshStats();
    if (state.game.timeLeft <= 0) finishGame('time');
  }, 1000);
}
function stopGameTimer() {
  if (state.game && state.game.timerHandle) {
    clearInterval(state.game.timerHandle);
    state.game.timerHandle = null;
  }
}

function finishGame(reason) {
  const g = state.game;
  g.over = true;
  stopGameTimer();

  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');

  if (reason === 'topple' || reason === 'time') {
    overlay.innerHTML = `
      <h2>Slopped it.</h2>
      <p>${reason === 'topple'
            ? 'The whole stack toppled over.'
            : "Time's up — the kitchen's backed up."} No discount this round.</p>
      <div class="overlay-actions">
        <button class="primary-btn" id="overlay-retry">Try again</button>
        <button class="ghost-btn" id="overlay-back">Back to menu</button>
      </div>`;
  } else {
    const result = gradeBuild(g);
    if (result.tier) {
      const t = result.tier;
      const cls = t.name.toLowerCase();
      const code = ensureDiscountCode(g.key, t);
      overlay.innerHTML = `
        <h2>Order up!</h2>
        <div class="tier-badge tier-${cls}">${t.name} build · ${result.score}</div>
        <p>You built a <strong>${g.burger.name}</strong> worth <strong>${t.percent}% off</strong>.</p>
        <div class="code-box">${code}</div>
        <div class="overlay-actions">
          <button class="primary-btn" id="overlay-add">Add with ${t.percent}% off</button>
          <button class="ghost-btn" id="overlay-retry">Beat your score</button>
          <button class="ghost-btn" id="overlay-back">Back to menu</button>
        </div>`;
      document.getElementById('overlay-add').onclick = () => { addToCart(g.burger.id); render('cart'); };
    } else {
      overlay.innerHTML = `
        <h2>Built it.</h2>
        <div class="tier-badge tier-none">${result.score} · no tier</div>
        <p>Edible, but messy — no discount. Seal the bun, melt cheese on the patty, keep heavy low and work fast.</p>
        <div class="overlay-actions">
          <button class="primary-btn" id="overlay-retry">Try again</button>
          <button class="ghost-btn" id="overlay-add">Add at full price</button>
          <button class="ghost-btn" id="overlay-back">Back to menu</button>
        </div>`;
      document.getElementById('overlay-add').onclick = () => { addToCart(g.burger.id); render('cart'); };
    }
  }

  const retry = document.getElementById('overlay-retry');
  if (retry) retry.onclick = () => startGame(g.burger.id);
  document.getElementById('overlay-back').onclick = () => render('menu');
}

function ensureDiscountCode(key, tier) {
  const existing = state.unlockedDiscounts[key];
  if (existing) {
    if (tier.percent > existing.percent) { existing.percent = tier.percent; existing.tier = tier.name; }
    return existing.code;
  }
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const base = key.split('|')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const code = `SLOP-${base}-${suffix}`;
  state.unlockedDiscounts[key] = { code, percent: tier.percent, tier: tier.name };
  return code;
}

// ---------- CART ----------
function addToCart(burgerId) {
  const burger = MENU.find(b => b.id === burgerId);
  const addonSet = getCardAddons(burgerId);
  const addons = [...addonSet];
  const key = configKey(burgerId, addonSet);
  const unitPrice = computePrice(burger, addonSet);

  const unlocked = state.unlockedDiscounts[key];
  const alreadyDiscounted = state.cart.some(i => i.key === key && i.discount);
  const apply = unlocked && !alreadyDiscounted;
  const percent = apply ? unlocked.percent : 0;
  const price = apply ? +(unitPrice * (1 - percent / 100)).toFixed(2) : unitPrice;

  state.cart.push({
    key, id: burgerId, name: burger.name, addons,
    unitPrice, price, discount: apply ? unlocked.code : null, percent,
  });
  cartCount.textContent = state.cart.length;
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  rebalanceDiscounts();
  render('cart');
}

// Each unlocked discount applies to one matching item; re-evaluate after removal.
function rebalanceDiscounts() {
  const claimed = {};
  for (const item of state.cart) {
    const unlocked = state.unlockedDiscounts[item.key];
    if (unlocked && !claimed[item.key]) {
      item.discount = unlocked.code;
      item.percent = unlocked.percent;
      item.price = +(item.unitPrice * (1 - unlocked.percent / 100)).toFixed(2);
      claimed[item.key] = true;
    } else {
      item.discount = null;
      item.percent = 0;
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
    const addonText = item.addons.length
      ? item.addons.map(a => ADDON_BY_ID[a].label).join(', ')
      : 'No add-ons';
    const row = document.createElement('div');
    row.className = 'cart-item' + (item.discount ? ' discounted' : '');
    row.innerHTML = `
      <div>
        <div class="name">${item.name}</div>
        <div class="meta">
          ${addonText}
          ${item.discount
            ? ` · <span class="discount-badge">${item.discount} · ${item.percent}% off</span>`
            : ''}
        </div>
      </div>
      <div style="display:flex; align-items:center;">
        <div class="price">
          ${item.discount
            ? `<span style="color:var(--fg-3); text-decoration:line-through; font-weight:400; margin-right:6px;">$${item.unitPrice.toFixed(2)}</span>$${item.price.toFixed(2)}`
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
    state.unlockedDiscounts = {};
    state.cardAddons = {};
    render('menu');
  };
}

// boot
render('menu');
