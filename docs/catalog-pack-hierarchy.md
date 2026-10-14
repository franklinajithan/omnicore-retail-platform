# Product barcode and pack hierarchy

Code-only development: Product Master Data supports linking a barcode to a pack and parent/child pack configuration.

Each ProductPack has a base-unit quantity. A parent-child component specifies how many child packs it contains, and the API requires parent units = child units * quantity. Both packs and assigned barcode must belong to the same product. Directed cycles are rejected. Changes create catalogue audit events.

Example: consumer unit = 1 each; inner = 6 each; outer case = 24 each; case contains four inners.

Known limitations: no effective-dated versioning of conversions; historical delivery pack conversions are not preserved. Multi-child aggregate consistency is not verified. Employee RBAC wiring remains incomplete. Migrations, builds, tests and deployment are deferred by user request.
