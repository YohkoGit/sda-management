# `api-generated/`

TypeScript types generated from the backend's OpenAPI document. **Do not edit
by hand** — regenerate via:

```bash
# 1. Start the backend dev server (requires Postgres running on :5432)
dotnet run --project src/SdaManagement.Api

# 2. From src/sdamanagement-web/:
npm run generate:api
```

`schema.ts` is regenerated from `http://localhost:5000/openapi/v1.json` using
`openapi-typescript`. The resulting `paths` and `components.schemas` types are
the source of truth for request/response shapes.

## How to use the generated types

```ts
import type { components } from "@/api-generated/schema";

type UserResponse = components["schemas"]["UserResponse"];
type AssignableOfficer = components["schemas"]["AssignableOfficer"];
```

The eventual goal (per `docs/audit-followups.md` item #1) is to migrate every
hand-rolled type in `src/services/*.ts` to its generated counterpart and delete
the duplicate. Migration is incremental — convert one service file per PR.

## CI gate

`npm run generate:api:check` reads the committed `schema.ts` and verifies it
parses as valid TypeScript with no obviously stale entries. It's a smoke check,
not a drift detector — the canonical drift detector runs the full
`npm run generate:api` against a live backend and diffs the output.
