# Slop Burgers

A burger-ordering app with a built-in mini-game. Customers build the burger
they want by stacking ingredients in the correct order; nailing the recipe
unlocks a 15% discount that auto-applies when that exact burger is added to
their cart.

## Run it

It's a static site — no build step. Either:

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Or open `index.html` directly in a browser.

## How it works

- `menu.js` — burger menu + ingredient palette. Recipes are ordered lists
  (bottom bun → top bun).
- `app.js` — view rendering, the stacking mini-game, cart, and discount logic.
- `styles.css` — kitchen-themed UI.

### Game rules

- A timer counts down (longer recipes get more time).
- 3 lives. Click the wrong ingredient → lose a life.
- Stack the recipe in order, top to bottom of the ticket.
- Win → discount code unlocks for that exact burger.
- The discount only applies to the matching item in the cart, once per session.
