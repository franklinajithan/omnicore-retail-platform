# OmniCore Catalogue QA Test Plan v1.0

Statuses: Not implemented, Ready for testing, Passed, Failed, Blocked. Ready for testing does not mean tested.

| ID | Test | Steps | Expected | Initial status |
|---|---|---|---|---|
| CAT-001 | Open catalogue | Homepage -> Open Product Catalogue | Catalogue opens | Ready for testing |
| CAT-002 | Responsive layout | Open at desktop, tablet and mobile widths | No unusable controls or horizontal clipping | Ready for testing |
| CAT-003 | Dashboard counters | Add product | Totals update | Ready for testing |
| CAT-004 | Add product | Submit valid unique SKU and name | Product appears in list | Ready for testing |
| CAT-005 | Required fields | Submit missing name/SKU | Validation error | Ready for testing |
| CAT-006 | Duplicate SKU | Add same SKU twice | Duplicate rejected | Ready for testing |
| CAT-007 | Product search | Search name, SKU, barcode, category, manufacturer | Matching rows only | Ready for testing |
| CAT-008 | Persistence | Add product then refresh | Product retained | Not implemented |
| CAT-009 | Edit product | Edit product details | Changes saved | Not implemented |
| CAT-010 | Deactivate | Deactivate product | Historical records retained | Not implemented |
| CAT-011 | Barcode validation | Submit invalid or conflicting barcodes | Validation rejects them | Not implemented |
| CAT-012 | Add category | Create unique category | Category displayed | Ready for testing |
| CAT-013 | Duplicate category | Create duplicate ignoring case | Duplicate rejected | Ready for testing |
| CAT-014 | Add manufacturer | Create unique manufacturer | Manufacturer displayed | Ready for testing |
| CAT-015 | Product relationships | Assign category and manufacturer | Relationships display and persist | Partially implemented |
| CAT-016 | Category hierarchy | Add department/category/subcategory | Hierarchy stored | Not implemented |
| CAT-017 | API validation | Send invalid request directly | API rejects it | Not implemented |
| CAT-018 | Tenant isolation | Access another tenant's product | Access denied | Not implemented |
| CAT-019 | Role permissions | Unauthorized user changes product | Change rejected | Not implemented |
| CAT-020 | Cross-tenant relationships | Assign foreign category/manufacturer | Request rejected | Not implemented |

## Execution template

- Test ID:
- Build / commit:
- Environment:
- Steps performed:
- Expected result:
- Actual result:
- Status: Passed / Failed / Blocked
- Screenshot or log:
- GitHub issue / fix PR:
- Retest result:

## Notes

The initial catalogue UI is an in-memory prototype. CAT-008 and all database/security cases are intentionally not ready. The test statuses above are implementation estimates, not recorded test executions. Run UI tests against a deployed or locally started application, and run database tests against an isolated test database.
