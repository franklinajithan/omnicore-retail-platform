# OmniCore POS
Windows desktop till application.

## Development
From apps/pos run `npm install` then `npm run dev`.

## Windows installer
Run `npm run build`. electron-builder outputs the NSIS .exe installer to `apps/pos/release`.

Phase 1 includes the installable Electron shell, till-first UI, scanner input and basket prototype. Next: SQLite offline store, OmniCore API sync, payments, receipt printer/cash drawer, sessions and transaction persistence.
