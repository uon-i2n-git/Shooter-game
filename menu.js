// Slop Burgers menu data + ingredient "physics".
//
// Each ingredient carries properties the build-game uses to judge a stack:
//   weight  — how heavy (crushes delicate layers below it)
//   slip    — how slippery (two slick layers stacked = unstable)
//   role    — bun | protein | cheese | veg | sauce
//   hot     — a hot patty melts cheese placed directly on it
//   wet     — straight onto a bare bun this makes it soggy
//   barrier — sitting on the bun, this seals it (lettuce / certain sauces)

const INGREDIENTS = {
  'bottom-bun': { label: 'Bottom Bun', color: '#d4a26a', weight: 2, slip: 0, role: 'bun' },
  'top-bun':    { label: 'Top Bun',    color: '#d4a26a', weight: 2, slip: 0, role: 'bun' },
  'patty':      { label: 'Beef Patty', color: '#6b4226', weight: 5, slip: 0, role: 'protein', hot: true },
  'cheese':     { label: 'Cheese',     color: '#ffd95c', weight: 1, slip: 1, role: 'cheese' },
  'lettuce':    { label: 'Lettuce',    color: '#7bc46c', weight: 1, slip: 2, role: 'veg', barrier: true },
  'tomato':     { label: 'Tomato',     color: '#e26060', weight: 2, slip: 3, role: 'veg', wet: true },
  'onion':      { label: 'Onion',      color: '#e8d8ee', weight: 1, slip: 2, role: 'veg' },
  'pickle':     { label: 'Pickle',     color: '#9ab36a', weight: 1, slip: 3, role: 'veg', wet: true },
  'bacon':      { label: 'Bacon',      color: '#a0593b', weight: 2, slip: 1, role: 'protein' },
  'mayo':       { label: 'Mayo',       color: '#fdf6e3', weight: 0, slip: 2, role: 'sauce', wet: true, barrier: true },
  'ketchup':    { label: 'Ketchup',    color: '#c0392b', weight: 0, slip: 3, role: 'sauce', wet: true },
  'mustard':    { label: 'Mustard',    color: '#e0b020', weight: 0, slip: 3, role: 'sauce', wet: true },
  'slop-sauce': { label: 'Slop Sauce', color: '#7d4d2c', weight: 0, slip: 3, role: 'sauce', wet: true, barrier: true },
};

const MENU = [
  {
    id: 'classic-slop',
    name: 'Classic Slop',
    price: 9.50,
    description: 'The OG. Single patty, single cheese, slop sauce.',
    recipe: ['bottom-bun', 'patty', 'cheese', 'lettuce', 'tomato', 'slop-sauce', 'top-bun'],
  },
  {
    id: 'double-trouble',
    name: 'Double Trouble',
    price: 13.50,
    description: 'Double patty, double cheese, mayo.',
    recipe: ['bottom-bun', 'patty', 'cheese', 'patty', 'cheese', 'mayo', 'top-bun'],
  },
  {
    id: 'bacon-pile',
    name: 'Bacon Pile',
    price: 12.00,
    description: 'Patty, bacon, cheese, onion, ketchup.',
    recipe: ['bottom-bun', 'patty', 'bacon', 'cheese', 'onion', 'ketchup', 'top-bun'],
  },
  {
    id: 'green-machine',
    name: 'Green Machine',
    price: 10.50,
    description: 'Patty, cheese, lettuce, pickle, mustard.',
    recipe: ['bottom-bun', 'patty', 'cheese', 'lettuce', 'pickle', 'mustard', 'top-bun'],
  },
  {
    id: 'triple-slop',
    name: 'Triple Slop',
    price: 16.00,
    description: 'Three patties, three cheese, bacon, slop sauce. For the brave.',
    recipe: ['bottom-bun', 'patty', 'cheese', 'patty', 'cheese', 'patty', 'cheese', 'bacon', 'slop-sauce', 'top-bun'],
  },
];

// Paid add-ons. Each bumps the price AND adds a real layer you must place,
// so a loaded burger is a bigger, harder build.
const ADDONS = [
  { id: 'extra-cheese', label: 'Extra Cheese', price: 1.50, ingredient: 'cheese' },
  { id: 'extra-patty',  label: 'Extra Patty',  price: 3.00, ingredient: 'patty' },
  { id: 'add-bacon',    label: 'Add Bacon',    price: 2.00, ingredient: 'bacon' },
];
const ADDON_BY_ID = Object.fromEntries(ADDONS.map(a => [a.id, a]));

// Reward tiers. Gold is deliberately brutal — see app.js gradeBuild().
const TIERS = {
  gold:   { name: 'Gold',   percent: 20 },
  silver: { name: 'Silver', percent: 15 },
  bronze: { name: 'Bronze', percent: 10 },
};
