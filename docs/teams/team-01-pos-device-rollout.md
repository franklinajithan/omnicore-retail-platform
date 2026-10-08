# Team 01 — POS device authentication rollout

## Current implementation
- Head-office OWNER/ADMIN registers devices with POST /core/v1/stores/:storeId/devices.
- Registration returns a signed one-hour bearer credential. Treat it as a secret; never put it in logs.
- Renew via POST /core/v1/stores/:storeId/devices/:deviceId/credential using authorized head-office credentials.
- List devices via GET /core/v1/stores/:storeId/devices.
- Revoke via PATCH /core/v1/stores/:storeId/devices/:deviceId/disable.
- POS catalog and sale requests verify the signature, tenant/store/device identity, and enabled database record.
- OMNICORE_POS_DEVICE_SECRET must be configured on the API and have at least 32 characters.

## Important production blockers
1. No device-initiated renewal protocol exists. Current one-hour tokens require head-office issuance, so unattended tills will lose connectivity.
2. The database credentialHash field is populated with random data but is not used for authentication or rotation. Do not treat it as a validated per-device credential.
3. Reissuing a token does not invalidate older unexpired tokens. Disabling the device does block database-authorized requests.
4. Device registration, renewal and revocation are not yet audit-logged.
5. POS clients using legacy tokens without deviceId will be rejected. Coordinate client upgrades and provisioning before enabling.
6. Add secure transport, storage, credential redaction, rate limits, and end-to-end integration tests before production use.

## Verification
Run the API typecheck and tests in the Team 01 CI workflow. Do not claim production readiness without a green workflow and POS client integration tests.
