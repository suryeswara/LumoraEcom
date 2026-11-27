# Storefront (React + Vite)

The web interface for the Lumora e-commerce platform. It talks to the Spring Boot API in `../SpringEcomAI`.

## Run it

```bash
cp .env.example .env        # VITE_BASE_URL points at the API, default http://localhost:8080
npm install
npm run dev                 # http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run check:design` | Enforces the design rules (spacing scale, fonts, icons, copy rules, no debug output) |

## Structure

```
src/
├── ui/            design system primitives: Button, Field, Dialog, ConfirmDialog, Alert, toast, Skeleton, Reveal, WordReveal
├── components/    pages and page level components (home/ holds the landing page sections)
├── Context/       app state (products, cart) and authentication
├── auth/          JWT helpers and the axios interceptor that attaches the token
├── hooks/         useTheme, useDocumentTitle
├── lib/           formatting helpers (currency, dates, images, API errors)
├── config/        brand.js, the store name in one place
└── index.css      design tokens, named text styles and motion
```

## Design rules

All visual values come from `src/index.css`: light and dark theme tokens, the named text styles, and the base motion curve. Use the text style classes (`heading-3`, `body-6`, `button-md`, `caption-2`) instead of raw font size utilities, and stay on the spacing scale (0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px). `npm run check:design` flags anything off the system.
