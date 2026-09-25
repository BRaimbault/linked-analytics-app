---
name: dhis2-api-lookup
description: Look up real DHIS2 Web API details (endpoint paths, query parameters, response shapes, filter syntax) instead of relying on training data. Use when working with any /api/ endpoint - analytics, tracker, org units, eventVisualizations - or when an API call returns an unexpected shape.
---

# Understanding the DHIS2 Web API

AI models frequently hallucinate DHIS2 API details — endpoint paths, query parameters, response
shapes, and filter syntax all evolve between versions. Do not rely on training data for DHIS2 API
specifics. Instead, consult the actual API of the target instance using the approaches below.

Read `dhis2.env.json` (gitignored) for the DHIS2 server URL and credentials. Use these for all
API interactions described in this section.

### Tier 1: OpenAPI spec (endpoint structure, parameters, types)

Fetch the scoped OpenAPI spec for the endpoint you need. The DHIS2 API supports path-filtered
specs so you get only the relevant section:

```bash
curl -u <user>:<pass> "<server>/api/openapi.yaml?path=/<resource>"
```

Examples:

- `/api/openapi.yaml?path=/analytics` — analytics endpoints
- `/api/openapi.yaml?path=/trackedEntities` — tracker endpoints
- `/api/openapi.yaml?path=/organisationUnits` — org unit endpoints

This gives you endpoint paths, HTTP methods, query parameters, and request/response schemas —
accurate for the exact server version. Use this as the first step when working with any DHIS2
API endpoint.

### Tier 2: Probe the live API (verify actual response shapes)

When the OpenAPI spec doesn't fully answer the question — especially for complex endpoints like
`/api/analytics` where responses vary based on query parameters — make GET requests against the
dev instance to see actual data:

```bash
curl -u <user>:<pass> "<server>/api/<resource>?<params>"
```

**Rules:**

- **GET requests only** — never POST, PUT, PATCH, or DELETE against the instance
- **Use the dev/test instance** from `dhis2.env.json`, never a production server
- **Limit response size** — use `pageSize=1` or `pageSize=5` and `fields=` filtering to avoid
  flooding context with large responses

This is useful for understanding actual response shapes, testing filter syntax, verifying which
fields are returned, and exploring dimension/analytics data structures.

### Tier 3: Read the DHIS2 backend source (controller logic)

When you need to understand _how_ the API works — filter combination logic, validation rules,
side effects, or behavior not captured in specs — read the Java source code of the DHIS2 backend.

```bash
npx opensrc dhis2/dhis2-core --modify
```

This clones the DHIS2 backend source into `./opensrc/repos/github.com/dhis2/dhis2-core/`.
The directory is gitignored. Controllers are in `dhis-2/dhis-web-api/`, DTOs and models in
`dhis-2/dhis-api/`. Search for the controller class (e.g. `AnalyticsController`,
`OrganisationUnitController`).

If the user specifies a DHIS2 version, target that branch: `npx opensrc dhis2/dhis2-core#2.41 --modify`.

Use an Explore subagent to search the cloned source — the codebase is large and reading Java
inline floods context. The subagent can extract the API contract and return a compact summary.
