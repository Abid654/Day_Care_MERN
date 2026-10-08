# Database per daycare

## Architecture

`main_db` is the control database. Its `Tenant` collection stores the daycare name, owner email, status, and generated database name. Parent accounts also live in `main_db`. A daycare signup creates a `provisioning` tenant record, generates a random `daycare_<24-hex-object-id>_db` name on the server, initializes the tenant's collections/indexes, creates the daycare admin `User` in that database, then activates the tenant.

Daycare login resolves the owner email through `main_db.Tenant`, opens that database, and verifies the password against its local `User` collection. The JWT contains `userId`, `role`, and the opaque Tenant document ID; it never contains a database name. Authentication verifies the JWT, fetches an active Tenant mapping from `main_db`, and then attaches `req.db` and connection-specific `req.models`. The mapping name is checked against the generated database naming format before use.

The backend has one main Mongo connection. `useDb(..., { useCache: true })` creates a separate Mongoose Connection and model namespace for each tenant database while reusing the Mongo client's connection pool. Tenant-owned schemas are compiled for that tenant connection, so ordinary model operations run against only the authenticated daycare database. Tenant document `tenantId` fields and shared-database query filters are not used.

## Adding tenant routes

Run `authMiddleware` before `requireTenant`:

```js
router.use(authMiddleware, requireTenant);
router.get("/children", (req, res) => req.models.Child.find({}));
```

Use only `req.models` for daycare-specific records. Use `req.mainModels` only for intentionally central records. Never accept a database name or choose a tenant connection from request data. `req.user.tenantId` is safe to use as a tenant identity, but it is not a database name or a data filter.

`models/*.js` export schemas; `config/db.js` compiles them on the appropriate connection. Adding a tenant-owned model means adding its schema name to the tenant model list there. Signup initializes each model so MongoDB creates its collection and declared indexes.

The backend currently includes daycare profile and admin review endpoints. Parent accounts are central identities; cross-database relationships to parents need explicit application-level lookups through `req.mainModels` rather than normal Mongoose `populate`.

## Daycare operations dashboard

The owner dashboard uses `/daycare/management/*`. Its children, attendance, fees, staffing, care records, requests, documents, settings, and audit logs are read and written through `req.models` on the active tenant connection. The module controller uses a server-side allowlist for fields and model names, scopes caregiver records to assigned children, and checks class capacity and pickup authorizations on the backend.

Manager and caregiver login credentials are stored as `User` records in their daycare database. `main_db.TenantMembership` stores the email lookup, tenant reference, role, permissions, and active status needed to resolve those accounts at login. JWTs carry the user ID, role, tenant ID, and token version; no database name is accepted from a client. User status changes and password resets revoke prior tokens.

Document files are kept outside the public `/uploads` static directory. Download routes require authentication and resolve the document record inside the current tenant database before reading a server-generated storage key. The manager/caregiver API permissions are enforced by middleware and remain subject to the owner-only restrictions on account administration.

Daycare parent contact records in the tenant database are not yet linked to central parent login accounts. Notification/announcement records are tenant-scoped dashboard data; delivery to parent devices or email requires an explicit parent-account linkage and delivery service integration.

## Daycare review and parent listings

Daycare owners edit and submit their profile through the authenticated `/daycare/profile` endpoint. A profile edit always resets the tenant directory status to `pending`. Admin-only `/admin/daycares` and `/admin/daycares/:tenantId/review` endpoints use the verified admin JWT role; the database name is still resolved only from the central Tenant record. Approving requires a submitted profile and marks both the tenant directory entry and profile verified. Rejection leaves the daycare able to sign in and edit/resubmit, but `/daycares` returns only active, approved, verified profiles to parents.

## Platform admin bootstrap

Set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 8 characters), and `ADMIN_PHONE` in the backend environment. On backend startup, `services/adminBootstrap.js` hashes the password and creates an `admin` user in `main_db.User`. It is idempotent: an existing admin is left unchanged, and an email already owned by a non-admin causes startup to fail with a safe message. Leave all four variables unset to disable bootstrap. Sign in at the frontend `/admin` page. Do not commit real `.env` credentials; `.env.example` contains placeholders only.

## Existing data

This change applies to new registrations and the new `main_db`. It does not copy legacy shared-database accounts or daycare data into the new databases. Do not run the previous `scripts/migrateTenants.js`: it was written for shared-database `tenantId` fields and is no longer compatible. Back up the old database and plan a separate, reviewed data-copy migration before moving existing accounts. Existing records remain in their original database until that migration is carried out.
