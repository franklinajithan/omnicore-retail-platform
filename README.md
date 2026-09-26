# OmniCore Retail Platform

Multi-tenant retail operations platform for inventory, supplier management, purchasing, Windows POS, mobile store operations and CRM.

## Initial milestone

Inventory and supplier management first, followed by Windows POS and CRM.

## Planned architecture

- Monorepo with pnpm workspaces and Turborepo
- `apps/web`: Next.js head-office application
- `apps/api`: NestJS REST API
- `apps/pos`: Electron + React Windows POS
- `apps/mobile`: React Native + Expo
- `packages/database`: PostgreSQL + Prisma
- `packages/shared`: Shared validation schemas and types

See `docs/architecture.md` for architectural decisions as the project develops.
