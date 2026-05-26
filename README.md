# Ecommerce SOA Backend — Jest Testing Framework

A production-grade **Service-Oriented Architecture (SOA)** ecommerce backend built with Node.js + TypeScript, demonstrating a complete **multi-layer Jest testing strategy** across Unit, Integration, and End-to-End tests.

> Companion document: see **PROJECT_GUIDE.pdf** for the full architecture diagram, sequence diagrams, and a deep walkthrough of every test layer.

---

## Table of Contents
1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Quick Start](#quick-start)
5. [API Surface](#api-surface)
6. [Domain Model](#domain-model)
7. [Test Strategy — Full Breakdown](#test-strategy--full-breakdown)
8. [Jest Configuration](#jest-configuration)
9. [Running Tests](#running-tests)
10. [Environment Variables](#environment-variables)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Key Patterns](#key-patterns)

---

## Architecture

```
                          ┌─────────────────────────┐
                          │     HTTP Client / curl   │
                          └────────────┬────────────┘
                                       │ REST / JSON
                                       ▼
       ┌─────────────────────────────────────────────────────────────┐
       │            Express App – src/app.ts (createApp)              │
       │   cors │ json parser │ /health │ 404 │ central errorHandler  │
       └──┬─────────────┬─────────────┬──────────────┬───────────────┘
          │             │             │              │
          │  /api/auth  │ /api/prod.. │ /api/orders  │ /api/payments
          ▼             ▼             ▼              ▼
     ┌────────┐   ┌─────────┐   ┌─────────┐    ┌──────────┐
     │  User  │   │ Product │   │  Order  │    │ Payment  │
     │ Module │   │ Module  │   │ Module  │◄──►│ Module   │
     └───┬────┘   └────┬────┘   └────┬────┘    └────┬─────┘
         │             │             │              │
         ▼             ▼             ▼              ▼
     ┌──────────────────────────────────────────────────────┐
     │              Shared Layer                             │
     │   db pool (pg) │ auth (JWT) │ errors │ utils │ types │
     └──────────────────────────────────────────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │   PostgreSQL  +  Redis   │
                          └─────────────────────────┘
```

Each module owns its **routes**, **controller** (HTTP adapter), **service** (business logic), **repository** (data access), and an **`interfaces/`** folder declaring the service & repository contracts. Cross-module calls happen by importing the dependency's repository (e.g. `OrderService` uses `ProductRepository`), so unit tests can mock cleanly.

---

## Project Structure

```
ecommerce-soa-jest/
├── src/
│   ├── index.ts                       # App bootstrap (listen)
│   ├── app.ts                         # Express app factory, route mounting
│   ├── modules/
│   │   ├── user/
│   │   │   ├── interfaces/            # IUserService, IUserRepository
│   │   │   ├── user.routes.ts         # /register, /login, /profile, /deactivate
│   │   │   ├── user.controller.ts     # HTTP adapter (req/res → service)
│   │   │   ├── user.service.ts        # Business logic + bcrypt + JWT
│   │   │   └── user.repository.ts     # DB access
│   │   ├── product/
│   │   │   ├── interfaces/
│   │   │   ├── product.routes.ts      # CRUD + /search + stock
│   │   │   ├── product.controller.ts
│   │   │   ├── product.service.ts     # Validation, listing, search
│   │   │   └── product.repository.ts  # pg queries
│   │   ├── order/
│   │   │   ├── interfaces/
│   │   │   ├── order.routes.ts        # POST /, GET /:id, PATCH /:id/status, /:id/cancel
│   │   │   ├── order.controller.ts
│   │   │   ├── order.service.ts       # State machine, totals, stock
│   │   │   └── order.repository.ts
│   │   └── payment/
│   │       ├── interfaces/
│   │       ├── payment.routes.ts
│   │       ├── payment.controller.ts
│   │       ├── payment.service.ts     # Orchestrates gateway + persistence
│   │       ├── payment.gateway.ts     # PaymentGateway simulator
│   │       └── payment.repository.ts
│   └── shared/
│       ├── database/
│       │   └── index.ts               # pg Pool, initializeDatabase, truncateAllTables
│       ├── middleware/
│       │   ├── auth.ts                # JWT generate/verify, requireAuth, requireAdmin
│       │   └── errorHandler.ts        # Typed errors → HTTP responses
│       ├── types/index.ts             # Domain interfaces (User, Order, Payment…)
│       └── utils/index.ts             # calculateTax, applyDiscount, pagination
│
├── tests/
│   ├── unit/                          # No DB — repositories mocked
│   │   ├── product/
│   │   │   ├── product.service.test.ts
│   │   │   └── utils.test.ts
│   │   ├── order/order.service.test.ts
│   │   ├── payment/payment.service.test.ts
│   │   └── user/user.service.test.ts
│   ├── integration/                   # Real DB, single service per request
│   │   ├── auth-api.test.ts
│   │   └── product-api.test.ts
│   ├── e2e/                           # Multi-service flows
│   │   ├── checkout-flow.test.ts      # Browse → Order → Pay → Verify
│   │   └── refund-flow.test.ts        # Order → Pay → Refund
│   ├── fixtures/
│   │   └── testData.ts                # Reusable users, products, tokens
│   ├── mocks/
│   │   └── database.mock.ts           # jest.mock helpers for unit tests
│   └── setup/
│       ├── unit.setup.ts              # Silences console
│       ├── integration.globalSetup.ts # DB connectivity check (one-time)
│       ├── integration.setup.ts       # beforeEach truncate
│       ├── integration.globalTeardown.ts
│       ├── e2e.globalSetup.ts
│       ├── e2e.setup.ts
│       └── e2e.globalTeardown.ts
│
├── jest.config.ts                     # Multi-project config
├── docker-compose.test.yml            # Test PostgreSQL (5433) + Redis (6380)
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Runtime     | Node.js 20+                                |
| Language    | TypeScript 5.6 (strict mode)              |
| HTTP        | Express 4.21                               |
| Database    | PostgreSQL 16 (via `pg` driver)            |
| Cache       | Redis 7                                    |
| Auth        | JWT (`jsonwebtoken`) + bcrypt              |
| Validation  | Zod                                        |
| Testing     | Jest 29, ts-jest, Supertest                |
| CI          | GitHub Actions (multi-stage)               |
| Container   | Docker Compose for test DB                 |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Start the test database
docker compose -f docker-compose.test.yml up -d --wait
# (Postgres on 5433, Redis on 6380)

# 3. Run every test
npm test

# 4. Inspect coverage
npm run test:coverage
# → ./coverage/lcov-report/index.html
```

---

## API Surface

| Method | Path                                   | Auth        | Description                          |
|--------|----------------------------------------|-------------|--------------------------------------|
| GET    | `/health`                              | —           | Liveness probe                       |
| POST   | `/api/auth/register`                   | —           | Register + return JWT                |
| POST   | `/api/auth/login`                      | —           | Login + return JWT                   |
| GET    | `/api/auth/profile`                    | bearer      | Current user profile                 |
| PUT    | `/api/auth/profile`                    | bearer      | Update profile fields                |
| POST   | `/api/auth/deactivate`                 | bearer      | Deactivate own account               |
| GET    | `/api/products`                        | —           | Paginated list (filter, search)      |
| GET    | `/api/products/:id`                    | —           | Product detail                       |
| GET    | `/api/products/search?q=...`           | —           | Keyword search (ILIKE)               |
| POST   | `/api/products`                        | admin       | Create product                       |
| PUT    | `/api/products/:id`                    | admin       | Update fields                        |
| DELETE | `/api/products/:id`                    | admin       | Remove product                       |
| POST   | `/api/orders`                          | customer    | Create order (reserves stock)        |
| GET    | `/api/orders`                          | customer    | List own orders                      |
| GET    | `/api/orders/:id`                      | owner/admin | Order detail                         |
| PATCH  | `/api/orders/:id/status`               | admin       | Transition order status (FSM)        |
| POST   | `/api/orders/:id/cancel`               | owner/admin | Cancel + release stock               |
| POST   | `/api/payments`                        | customer    | Process payment (gateway sim)        |
| GET    | `/api/payments/:id`                    | owner/admin | Payment detail                       |
| GET    | `/api/payments/order/:orderId`         | owner/admin | Lookup payment by order              |
| POST   | `/api/payments/:id/refund`             | admin       | Refund                               |

---

## Domain Model

```
users (id, email, password_hash, role, …)
  └─< orders (id, user_id, subtotal, tax, discount, total, status, …)
        └─< order_items (id, order_id, product_id, quantity, unit_price, total_price)
        └── payments (id, order_id, user_id, amount, status, transaction_id, …)

products (id, name, description, price, stock, category, …)
coupons  (id, code, discount_type, discount_value, min_order_amount, expires_at, …)
```

### Order State Machine

```
pending ──► pending_payment ──► paid ──► processing ──► shipped ──► delivered
   │             │                 │                          
   └─► cancelled │                 └─► refunded               
                 └─► cancelled                              
```
Transitions are enforced in `OrderService.updateOrderStatus()`. Cancelling at any pre-paid state releases reserved stock.

---

## Test Strategy — Full Breakdown

The repo demonstrates the classic **test pyramid** with three distinct layers, each with its own Jest project (see [Jest Configuration](#jest-configuration)).

### 1. Unit Tests — `tests/unit/`

| Property           | Value                                        |
|--------------------|----------------------------------------------|
| Goal               | Validate pure business logic in isolation    |
| Database           | **Fully mocked** via `jest.mock()`           |
| External services  | Mocked (e.g. `PaymentGateway`)               |
| Speed              | ~30–80 ms per test                            |
| When to add        | Every branch of every service method         |

**Files**
- `product/product.service.test.ts` — listing, search, validation, stock decrement (uses the in-memory DB mock helper in `tests/mocks/database.mock.ts`).
- `product/utils.test.ts` — pure helpers (`calculateTax`, `applyDiscount`, `paginate`).
- `order/order.service.test.ts` — total calculation, FSM transitions, stock release on cancel, coupon validation.
- `payment/payment.service.test.ts` — happy path, declined card, amount-mismatch, refund, gateway simulator behavior.
- `user/user.service.test.ts` — registration, password hashing, login, duplicate-email rejection.

**Pattern used**
```ts
jest.mock('../../../src/modules/order/order.repository');
jest.mock('../../../src/modules/product/product.repository');

mockOrderRepo = new OrderRepository() as jest.Mocked<OrderRepository>;
mockProductRepo = new ProductRepository() as jest.Mocked<ProductRepository>;
service = new OrderService(mockOrderRepo, mockProductRepo);

mockProductRepo.findById.mockResolvedValueOnce({ ... });
```

### 2. Integration Tests — `tests/integration/`

| Property           | Value                                        |
|--------------------|----------------------------------------------|
| Goal               | Real HTTP → real DB round-trips per endpoint |
| Database           | Real PostgreSQL (test container)              |
| Isolation          | `truncateAllTables()` in `beforeEach`         |
| Tool               | `supertest` against `createApp()`             |
| Speed              | ~150–250 ms per test                          |

**Files**
- `auth-api.test.ts` — register, login, duplicate email, password-too-short, login-with-wrong-password, JWT shape validation.
- `product-api.test.ts` — list, filter by category, pagination, create with admin token, reject with customer token, search, update, delete.

**Lifecycle**
1. `integration.globalSetup.ts` — verifies test DB is reachable once.
2. `integration.setup.ts` (per file): `beforeAll → initializeDatabase()` (idempotent schema) → `beforeEach → truncateAllTables()` → `afterAll → closePool()`.
3. Tests seed only the rows they need via `INSERT` or by hitting the public API with an admin JWT.

### 3. End-to-End Tests — `tests/e2e/`

| Property           | Value                                        |
|--------------------|----------------------------------------------|
| Goal               | Multi-service business flows                  |
| Coverage           | User → Product → Order → Payment              |
| Speed              | ~400–700 ms per test                          |

**Files**
- `checkout-flow.test.ts` — eight-step browse-to-payment journey covering subtotal math, stock reservation, JWT cross-service propagation, ownership checks, decline path.
- `refund-flow.test.ts` — admin refund, order status flips to `refunded`, refund of a non-captured payment is rejected.

### Test Pyramid

```
                /\
               /  \   ~5 E2E flows         (~2.5 s)
              /----\
             /      \   ~15 integration     (~3.0 s)
            /--------\
           /          \   ~40 unit tests    (~1.5 s)
          /____________\
```

### Fixtures (`tests/fixtures/testData.ts`)

Centralized factories:
- `testUsers.admin / .customer / .customer2`
- `testProducts` (5 sample items, mixed categories)
- `testAddresses.istanbul / .newyork`
- `generateAdminToken() / generateCustomerToken()` — return signed JWTs
- `invalidProducts` and `invalidUsers` for negative tests

### Database Mock (`tests/mocks/database.mock.ts`)

Replaces the `pg` pool with `jest.fn()`s and exposes ergonomic helpers:
- `mockQueryReturning(row)` — for `INSERT … RETURNING *`
- `mockQueryCount(n)` — for `SELECT COUNT(*)`
- `mockQueryDelete(true/false)` — affects `rowCount`
- `resetDbMocks()` — clean slate per test

---

## Jest Configuration

`jest.config.ts` is a **multi-project** setup. Each project has its own `displayName`, `testMatch`, and lifecycle hooks:

| Project           | Pattern                                      | Setup                                  |
|-------------------|----------------------------------------------|----------------------------------------|
| `unit:product`    | `tests/unit/product/**/*.test.ts`            | `unit.setup.ts` (silences console)     |
| `unit:order`      | `tests/unit/order/**/*.test.ts`              | —                                      |
| `unit:payment`    | `tests/unit/payment/**/*.test.ts`            | —                                      |
| `unit:user`       | `tests/unit/user/**/*.test.ts`               | —                                      |
| `integration`     | `tests/integration/**/*.test.ts`             | `integration.globalSetup/teardown`     |
| `e2e`             | `tests/e2e/**/*.test.ts`                     | `e2e.globalSetup/teardown`             |

**Coverage thresholds**: branches ≥ 70 %, functions ≥ 75 %, lines ≥ 80 %, statements ≥ 80 % — enforced via `coverageThresholds.global`.

**Module aliases** (mirrored from `tsconfig.json`):
```ts
'@modules/*' → 'src/modules/*'
'@shared/*'  → 'src/shared/*'
'@tests/*'   → 'tests/*'
```

---

## Running Tests

```bash
# Everything (sequential to avoid DB contention)
npm test

# Single layer
npm run test:unit           # No DB needed — fastest
npm run test:integration    # Test DB required
npm run test:e2e            # Test DB required

# Single service
npm run test:product
npm run test:order
npm run test:payment

# Watch mode (TDD)
npm run test:watch

# Coverage with HTML report
npm run test:coverage

# CI mode (with JUnit + coverage artifacts)
npm run test:ci
```

---

## Environment Variables

A `.env.test` file (or container-injected vars) supplies:

| Variable      | Default          | Used by             |
|---------------|------------------|---------------------|
| `DB_HOST`     | `localhost`      | All DB code         |
| `DB_PORT`     | `5433`           | Test container      |
| `DB_NAME`     | `ecommerce_test` | Test DB             |
| `DB_USER`     | `postgres`       |                     |
| `DB_PASSWORD` | `postgres`       |                     |
| `JWT_SECRET`  | `test-jwt-...`   | Auth middleware     |
| `NODE_ENV`    | `test`           | All                 |

---

## CI/CD Pipeline

`.github/workflows/ci.yml` (described conceptually) runs three jobs:

1. **unit-tests** — installs deps, runs `npm run test:unit`. No services needed → fast feedback.
2. **integration-e2e-tests** — spins up `services.postgres` as a GitHub Actions service container, runs `npm run test:integration` then `npm run test:e2e`.
3. **coverage** — runs `npm run test:coverage`, uploads `coverage/lcov.info` + JUnit report as build artifacts, posts a summary to the PR.

---

## Key Patterns

**Layered Module** — Each module is split into four files (`*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`) with contracts in `interfaces/`. Routes wire Express, controllers translate HTTP, services hold business logic, repositories own SQL.

**Repository Pattern** — Every module owns a thin repository class (`product.repository.ts`, etc.). Services receive repositories through their constructor, which makes them trivially mockable.

**Gateway Isolation** — The payment gateway lives in its own `payment.gateway.ts` file, separated from `payment.service.ts` so it can be mocked independently in unit tests without touching the orchestration logic.

**Interface-First Services** — Each service and repository has a contract under `modules/<name>/interfaces/` (e.g. `IOrderService`, `IPaymentGateway`). Services depend on the interface types, not concrete classes, so the DI surface is explicit and mock-friendly.

**Dependency Injection (poor man's)** — Constructor parameters are typed against interfaces with concrete defaults, allowing real wiring in production while tests pass in `jest.Mocked<…>` instances:
```ts
export class OrderService implements IOrderService {
  constructor(
    private orderRepo:   IOrderRepository   = new OrderRepository(),
    private productRepo: IProductRepository = new ProductRepository(),
  ) {}
}
```

**Class-Based Routers** — Each module exposes a `XxxRoutes` class that registers controller methods on an Express `Router` in its constructor. The module's `index` export (`orderRoutes`, etc.) is the default-constructed router, but tests or alternate wirings can instantiate with a custom controller.

**Centralized Errors** — `errorHandler.ts` exports `NotFoundError`, `ValidationError`, `InsufficientStockError`, `PaymentFailedError`, `UnauthorizedError`, `ForbiddenError`. Express middleware maps them to status codes consistently.

**Factory Fixtures** — All test data lives in `tests/fixtures/testData.ts` so tests stay declarative.

**Database Isolation** — `truncateAllTables()` runs in every integration/E2E `beforeEach`, giving each test a clean slate without the cost of dropping/recreating schema.

**Pure Utility Layer** — Tax, discount, and pagination math live in `src/shared/utils/index.ts` and are 100 % covered by unit tests in `tests/unit/product-service/utils.test.ts`.

---

## License

MIT
