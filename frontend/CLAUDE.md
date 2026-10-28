# Frontend — React (Vite) + Impeccable

Read the root `CLAUDE.md` first. Everything here adds to it.

## Design source of truth

- Visual design is driven by the **Impeccable** skill. `PRODUCT.md`, `DESIGN.md` and the
  `.impeccable/` folder (created by `/impeccable init` / `document`) define the product
  context, tokens, type, color and motion. Read them before any UI work and never contradict
  them. If a needed decision is missing, extend `DESIGN.md` rather than inventing ad-hoc styles.
- Use Impeccable commands for design work (`shape`, `craft`, `animate`, `harden`, `audit`,
  `polish`, ...) when a session prompt asks for them.
- The chosen mockup direction lives in `frontend/mockups/` (reference only, never imported).

## Stack

Vite, React 19, React Router 7, TanStack Query 5, axios, `motion` (Framer Motion,
`motion/react`), Recharts, react-hook-form + zod, sonner (toasts), react-markdown +
remark-math + rehype-katex (Codeforces `$$$...$$$` LaTeX → `$...$`), Tailwind CSS v4 with
design tokens as CSS variables (unless DESIGN.md decides otherwise).
Tests: Vitest, @testing-library/react + user-event + jest-dom, MSW, jsdom.

## Folder structure

```
frontend/src/
├─ main.jsx, App.jsx, router.jsx
├─ api/            client.js (axios + interceptors) · endpoints/<feature>.api.js
├─ errors/         ApiError.js · getUserMessage.js · messages/<feature>.messages.js
├─ hooks/          queries/<feature>.queries.js · mutations/<feature>.mutations.js
│                  useAuth, useApiErrorToast, useParallax, useReducedMotionSafe ...
├─ components/
│  ├─ ui/          Button, Card, Input, Tag, Skeleton, Toast wrappers, EmptyState ...
│  ├─ motion/      Pressable, FadeIn, StaggerList, ParallaxLayer, PageTransition, CountUp
│  ├─ layout/      AppShell, Navbar, Sidebar, ProtectedRoute, ErrorBoundary
│  └─ <feature>/   landing/, auth/, dashboard/, stuck/, problems/, practice/, history/
├─ pages/          one thin page per route that composes feature components
├─ lib/            queryKeys.js, formatters, latex.js, constants
├─ styles/         tokens.css, globals.css
└─ test/           setup.js, msw/handlers/<feature>.js, msw/server.js, renderWithProviders.jsx
```

## Component rules

- One component per file, **≤ 100 lines**. Split into sub-components and custom hooks early.
- Function components with arrow syntax and named exports. Props destructured. No class
  components (except `ErrorBoundary`, which React requires; keep it tiny).
- Components never call axios directly. Data comes from hooks in `hooks/queries` and
  `hooks/mutations`, which call `api/endpoints`.
- Logic (formatting, mapping, math) lives in `lib/` or hooks, never inline in JSX.
- Accessible by default: semantic elements, labels, focus states, keyboard support,
  `aria-live` for async results, color is never the only signal.

## Data, loading and optimistic updates

- Query keys come from `lib/queryKeys.js` (key factory). `staleTime` is tuned per feature.
- **Skeleton loading, not spinners**, for content: every data component has a matching
  `<Feature>Skeleton` with the same layout. Spinners only inside buttons.
- **Optimistic updates** (`onMutate` snapshot → `onError` rollback plus error toast →
  `onSettled` invalidate) for: practice list add/status/remove, stuck history delete, and
  the sync button state. Each optimistic flow has a test that covers rollback.

## Errors (user-specific messages)

- `api/client.js` converts every failure into an `ApiError { status, code, message, details,
  requestId, isNetwork, isTimeout }`.
- `getUserMessage(error, context, params)` returns friendly, specific text. The `messages/`
  files map `code` → message function, with optional per-context overrides. Example: context
  `linkHandle` + `CF_HANDLE_NOT_FOUND` → `We couldn't find "${params.handle}" on Codeforces.
  Check the spelling and try again.` Fallbacks: per HTTP status, then a generic message.
  Network errors and timeouts get their own messages.
- Never show raw server messages or stack traces. Show the `requestId` in small text on
  unexpected errors so users can report them.
- Form validation errors (`VALIDATION_FAILED` with field details) map to inline field errors.
- Route-level `errorElement` plus an `ErrorBoundary` with a friendly recovery screen.
- Every error message code in `backend/src/errors/codes.js` must have a frontend message.
  A test enforces this (compare against a copied code list in `src/errors/codes.js`).

## Motion

- `Pressable` wraps clickable things: `whileTap={{ scale: 0.97 }}` plus a subtle hover lift.
- Page transitions, staggered list entrances, count-up stat numbers, tag "pop" on add, and a
  success micro-animation after optimistic actions.
- Parallax: `useParallax` (`useScroll` + `useTransform`) for the landing hero layers and a
  subtle dashboard header. Keep it on `transform`/`opacity` only.
- **Respect `prefers-reduced-motion`**: every motion primitive degrades to no movement.

## Testing rules

- Every component, hook and lib file has a test. Use `renderWithProviders` (QueryClient,
  Router) and MSW handlers. Never hit the real backend.
- Test the states: skeleton → data, empty state, error message text (user-specific),
  optimistic update and rollback, and the reduced-motion branch for motion primitives.
- Tests follow the 100-line rule too. Split by state or behavior.

## Env and commands

`VITE_API_URL` (empty in dev; Vite proxies `/api` to `http://localhost:4000`).
`npm run dev`, `npm run build`, `npm run preview`, `npm test`, `npm run test:cov`, `npm run lint`.
