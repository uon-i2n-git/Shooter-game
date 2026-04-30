// Slop Burgers menu data.
// Each ingredient has a color used to render the burger stack visually.
// Recipes are ORDERED — bottom of bun first, top of bun last.

const INGREDIENTS = {
  'bottom-bun':    { label: 'Bottom Bun',    color: '#d4a26a' },
  'top-bun':       { label: 'Top Bun',       color: '#d4a26a' },
  'patty':         { label: 'Beef Patty',    color: '#6b4226' },
  'cheese':        { label: 'Cheese',        color: '#ffd95c' },
  'lettuce':       { label: 'Lettuce',       color: '#7bc46c' },
  'tomato':        { label: 'Tomato',        color: '#e26060' },
  'onion':         { label: 'Onion',         color: '#e8d8ee' },
  'pickle':        { label: 'Pickle',        color: '#9ab36a' },
  'bacon':         { label: 'Bacon',         color: '#a0593b' },
  'mayo':          { label: 'Mayo',          color: '#fdf6e3' },
  'ketchup':       { label: 'Ketchup',       color: '#c0392b' },
  'mustard':       { label: 'Mustard',       color: '#e0b020' },
  'slop-sauce':    { label: 'Slop Sauce',    color: '#7d4d2c' },
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

const DISCOUNT_PERCENT = 15;
