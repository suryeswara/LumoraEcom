# Project Memory — Lumora (AI-Powered E-Commerce Platform)

This file is the project-scoped memory for the **Lumora** full-stack e-commerce repository (`SpringEcomAI` + `e-com-Frontend`).

## Repository Map

- `SpringEcomAI/` — Java 21 / Spring Boot 3.5.3 REST API, Spring Security (stateless JWT), Spring Data JPA, Spring AI 1.0 (OpenAI-compatible client + PgVectorStore).
- `e-com-Frontend/` — React 18 / Vite 5 / Tailwind CSS 4 SPA, React Router 6, Axios, Phosphor icons, self-hosted Geist font.
- `docker-compose.yml` — Full-stack orchestration (`pgvector/pgvector:pg16` + `backend` on `:8080` + `frontend` nginx on `:3000`).
- `.github/workflows/ci.yml` — Runs `mvn -B verify` (backend + Testcontainers) and `npm run lint`, `npm run check:design`, `npm run build` (frontend).
- `BACKEND_DESIGN.md` — Complete backend architecture, folder/file analysis, API, DB, and AI/RAG design.
- `FRONTEND_DESIGN.md` — Complete frontend architecture, folder/file analysis, design system, state, and routing design.

## Build, Run & Test Commands

### Backend (`SpringEcomAI/`)
- Run tests (unit + Testcontainers integration, skips integration if Docker unavailable):
  `./mvnw verify` (Windows: `.\mvnw.cmd verify`)
- Run locally:
  `.\mvnw.cmd spring-boot:run`
- Note: `spring.docker.compose.enabled=false` is set in `SpringEcomAI/src/main/resources/application.properties`. Start PostgreSQL + `pgvector` (`CREATE EXTENSION IF NOT EXISTS vector;`) or use root `docker-compose.yml`.

### Frontend (`e-com-Frontend/`)
- Install: `npm ci`
- Dev server: `npm run dev` (expects `VITE_BASE_URL`, defaults to `http://localhost:8080` in `src/axios.jsx`)
- Lint: `npm run lint` (`eslint . --ext js,jsx --max-warnings 0`)
- Design system check: `npm run check:design` (`node scripts/check-design.mjs`)
- Production build: `npm run build`

## Critical Architecture & Invariants

1. **AI Provider Configuration**:
   - `SpringEcomAI/src/main/resources/application.properties` routes `spring.ai.openai.base-url` to Google AI Studio's OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`) using `gemini-flash-lite-latest` for chat and `gemini-embedding-001` (`dimensions=1536`) for embeddings.
   - `AIImageGeneratorService` uses `OpenAiImageOptions` with `model("gpt-image-1")`.
   - Never commit or hardcode real API keys or DB passwords in docs or code; use env vars (`GEMINI_API_KEY` / `OPENAI_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SPRING_DATASOURCE_*`).

2. **Concurrency-Safe Ordering (`OrderService`)**:
   - `OrderService.placeOrder` merges duplicate item lines into a `TreeMap<Integer, Integer>` and locks `Product` rows with `SELECT ... FOR UPDATE` (`ProductRepo.findByIdForUpdate`) in **ascending product ID order** to prevent overselling and deadlocks.
   - `OrderService.restoreStock` (on cancellation) sorts items by ascending product ID and uses the same pessimistic lock.
   - Order lifecycle state machine lives in `OrderStatus` (`PLACED -> CONFIRMED -> SHIPPED -> DELIVERED`, and `PLACED | CONFIRMED -> CANCELLED`).

3. **Eventually-Consistent Vector Store (`vector/`)**:
   - Relational PostgreSQL tables are the source of truth.
   - `ProductService` and `OrderService` publish `VectorUpsertEvent` / `VectorDeleteEvent`; `VectorIndexListener` handles them with `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)` so failed/rolled-back transactions never pollute `vector_store` and slow embedding calls never hold DB locks.
   - `POST /api/admin/reindex` (`VectorIndexService.reindexAll`) rebuilds `vector_store` from `product` and `orders`.

4. **Tenant-Safe RAG (`ChatBotService` & `VectorDocs`)**:
   - Metadata keys: `type` (`product` | `order`), `productId`, `orderId`, `ownerEmail`.
   - Customer PII (name, email) is stored in metadata, **not** embedded in document content.
   - `ChatBotService` filters `vector_store` *before* the LLM sees context: `(type == 'product') OR (type == 'order' AND ownerEmail == callerEmail)`.
   - `ProductService.semanticSearchProducts` filters `type == 'product'`, then re-ranks via `ChatClient` and loads authoritative entities from `ProductRepo.findAllById`.

5. **Security & Auth (`security/`)**:
   - Stateless JWT (HS256 via `JwtService`, `JwtAuthFilter`). Registration (`POST /api/auth/register`) always assigns `Role.USER`. First `ADMIN` is seeded by `AdminSeeder` from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   - Ownership-scoped order queries return `404` (not `403`) to prevent order ID enumeration.
   - Login returns a uniform `"Invalid email or password"` error for unknown email or wrong password.

6. **Frontend-Backend Sync Points**:
   - **Categories**: `ProductDraftNormalizer.CATEGORIES` in backend MUST stay in sync with `CATEGORIES` in `e-com-Frontend/src/components/ProductEditor.jsx` (`Laptop`, `Headphone`, `Mobile`, `Electronics`, `Toys`, `Fashion`, `Other`).
   - **Order Status Transitions**: `NEXT_STATUS` / `CANCELLABLE` in `e-com-Frontend/src/components/Order.jsx` mirror `OrderStatus.java` (server is authoritative).

7. **Frontend Design Rules (`e-com-Frontend/scripts/check-design.mjs`)**:
   - Always use named text styles (`.heading-1..6`, `.title-1..5`, `.body-1..6`, `.button-lg..xsm`, `.caption-1..5`) instead of raw `text-*` / `font-*` classes.
   - Use only approved spacing tokens (`0, 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24`), no arbitrary values (except `max-w-[680px]` and `transition-[...]`), no `italic` or gradient utilities, no `console.*`, `alert`, `confirm`, external CDN URLs, or unapproved icon/UI libraries.
   - Copy in JSX is AST-checked: no hyphens between words (`A-B`), no em/en dashes (`—`/`–`), no `!`, and no banned marketing filler words.

8. **Admin dashboard, notifications and payments**:
   - `/admin` (React, `components/admin/`) talks to `AdminDashboardController` (`/api/admin/**`, ADMIN only). Aggregates are JPQL in `OrderRepo`; lists use interface projections (`repo/Projections`) so product image bytes are never loaded.
   - `NotificationService` writes `admin_notification` rows inside the order transaction (one `NEW_ORDER` per product line, plus `LOW_STOCK`, `OUT_OF_STOCK`, `ORDER_CANCELLED`). Threshold: `app.stock.low-threshold`.
   - Only `USER` accounts may `POST /api/orders/place`; admins manage the store.
   - Payments are recorded, not processed (`PaymentMethod` COD/UPI/CARD collected on delivery; `PaymentStatus` PENDING/PAID/FAILED/REFUNDED). Delivery settles a pending payment; cancelling a paid order marks it REFUNDED.
   - `AdminAiService` sends the model a SQL-derived snapshot with no customer name, email, phone or address. Alerts come from `AdminService.alerts()` (code, not AI).
   - Frontend payment labels in `lib/format.js` must stay in sync with `PaymentMethod` and `PaymentStatus`.
9. **Login is required to see products**: `GET /api/products`, `/api/product/**` and smart search need a JWT (any role). The public site is only the landing page (`/`), login, register and legal pages. `/shop`, `/product/:id`, `/cart` and `/search-results` are `ProtectedRoute`s; `AppProvider` loads products only after login and empties the cart on logout. Admins see "Edit product" instead of "Add to cart".
10. **Secrets**: `application.properties` imports an optional `.env` (`SpringEcomAI/.env` or the repo root `.env`). Put `DB_PASSWORD`, `GEMINI_API_KEY`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` there. Never commit it.
