# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise meeting room management application built on Ant Design Pro with UMI 4 (via `@umijs/max`). Supports multi-tenant deployment for two companies (三生制药/zy and 三生国健/gj), selected at build time via `UMI_TAG` environment variable.

## Commands

```bash
# Development (defaults to zy tenant, dev API proxy)
npm run start:dev

# Development against prod API
npm run start:prod

# Build
npm run build:zy    # 三生制药 build
npm run build:gj    # 三生国健 build

# Lint (Biome + TypeScript check)
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type check only
npm run tsc

# Tests
npm test                          # run all tests
npx jest path/to/test             # run single test
npm run test:coverage             # with coverage
npm run test:update               # update snapshots
```

Dev server runs on port 9000. API requests proxy to `https://gptdev.3sbio.com` in dev mode.

## Architecture

### Framework Stack

- **UMI 4 Max** (`@umijs/max`) — routing, data flow, request, access control, openAPI
- **Ant Design 5** + **Pro Components** — UI layer
- **React 19** with `@ant-design/v5-patch-for-react-19`
- **Mako** bundler (enabled in config)
- **TailwindCSS 3** for utility styles (scoped to `src/pages`, `src/components`, `src/layouts`)
- **Biome** for linting/formatting (single quotes, space indentation)
- **Commitlint** with conventional commits enforced via Husky

### Multi-Tenant Build System

`config/config.dev.ts` and `config/config.prod.ts` branch on `process.env.UMI_TAG` (`zy` or `gj`) to inject different `process.env.*` variables at compile time: company name, WeChat OAuth config, API prefix, localStorage namespace. The namespace prefix (`BaseWeb3SZY/` or `BaseWeb3SGJ/`) isolates localStorage keys per tenant.

### Routing: Static + Dynamic

Static routes are defined in `config/routes.ts` (currently only `/user/login` and 404). The real navigation comes from **dynamic routes** fetched from the backend API (`system/menu/router`) after login.

`src/models/dynamicRoute.ts` — UMI model that fetches the route tree, deserializes it via `RouteUtils.serializationRemoteList()`, and exposes `dynamicRoute` + `firstPath` for the layout.

`src/layouts/BaseLayouts.tsx` — merges static and dynamic menus into ProLayout. Redirects unauthenticated users to `/user/login` and auto-navigates to `firstPath` on `/`.

Route items from backend have `type` (0=directory, 1=menu page, 2=button) and `targetType` (1=component, 2=iframe, 3=external link).

### Authentication & State

- OAuth2 password grant flow: `src/services/web/login/index.ts`
- Token stored in localStorage via `Web.ts` helpers (`Token`, `User`, `Dict`, `LayoutSetting`)
- `src/app.tsx` `getInitialState()` hydrates user/settings from localStorage cache
- `src/access.ts` exposes `canAdmin` based on `currentUser.access`
- On 401 responses, `RequestConfig.ts` response interceptor triggers `Notify.logout()` which shows a modal and redirects to login

### Request Layer

`src/utils/RequestConfig.ts` configures the UMI request plugin (axios-based):
- Request interceptor: prepends `process.env.requestPrefix` (default `/api`), attaches Bearer token
- Response interceptor: detects business errors (`success === false` or non-200 `code`) and throws `BizError`
- Error handler: maps HTTP status codes to Chinese messages, with deduplication (1.5s debounce)

### Services Organization

`src/services/web/` — organized by domain (login, notify, system). Each domain has `index.ts` for API functions and `typings.ts` for types. The `system/` subdomain covers config, dict, i18n, menu, organization, role.

### Path Aliases

```
@/*      → ./src/*
@@/*     → ./src/.umi/*
~/config/* → ./config/*
```

### Key Conventions

- Chinese UI text throughout (error messages, labels, notifications)
- `process.env.CI` is exposed as a define for conditional CI behavior
- Production builds strip `console.*` calls via `babel-plugin-transform-remove-console`
- Gzip compression enabled in production via `compression-webpack-plugin`
- Lint-staged runs `biome check --write` on commit for JS/TS/CSS/JSON/MD files
