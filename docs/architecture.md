# OmniCore Architecture

## Goals

Build a multi-tenant SaaS retail platform supporting 2–10 stores initially, with inventory and supplier management as the first production release.

## Applications

- `apps/web`: Head-office dashboard (Next.js)
- `apps/api`: Business API (NestJS)
- `apps/pos`: Offline-first Windows POS (Electron)
- `apps/mobile`: Store operations (React Native/Expo)

## Core principles

1. Every retailer is a tenant; enforce tenant scope on all data and background jobs.
2. Stock changes must be immutable, traceable ledger movements.
3. Receiving and transaction APIs must support idempotency.
4. Never store payment card data; integrate certified payment terminals.
5. Implement inventory, suppliers, purchase orders and goods receipts before POS and CRM.

## Initial domain model

Tenant, Store, User, Role, Product, Barcode, Supplier, SupplierProduct, InventoryLocation, StockMovement, PurchaseOrder, PurchaseOrderLine, GoodsReceipt and GoodsReceiptLine.

## Status

Initial repository scaffold. Application packages and database migrations remain to be implemented and tested.
