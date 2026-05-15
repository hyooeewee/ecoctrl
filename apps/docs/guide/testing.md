# Testing

Every package in the EcoCtrl monorepo ships with [Vitest](https://vitest.dev/) tests. This page covers how to run them, what conventions to follow, and how the test infrastructure is wired up.

## Running tests

From the monorepo root:

```bash
pnpm test              # run all tests across all packages once
pnpm test:watch        # watch mode in all packages
pnpm test:coverage     # generate coverage reports
pnpm test:ui           # open the Vitest UI
```

To run a specific package's tests:

```bash
cd packages/server
pnpm test              # server unit tests

cd apps/admin
pnpm test              # admin component tests

cd apps/web
pnpm test              # web component tests
```

## Test configuration

Only `packages/server` has a `vitest.config.ts` (environment: `node`). The frontend apps (`apps/admin`, `apps/web`) have testing dependencies installed (`@testing-library/react`, `@vitest/coverage-v8`) but no active Vitest configuration yet.

### Server tests (`packages/server`)

The server test suite runs against the configured database (PostgreSQL in production, or a local instance in CI). There is no in-memory fallback — tests expect `DATABASE_URL` to be available:

```ts
import { describe, it, expect } from "vitest";
import { createUser } from "@/repositories/users";

describe("users repository", () => {
  it("creates a user", async () => {
    const user = await createUser({
      username: "test",
      email: "test@example.com",
      password: "hash",
    });
    expect(user).toBeDefined();
    expect(user.username).toBe("test");
  });
});
```

### Frontend tests (`apps/admin`, `apps/web`)

Testing libraries (`@testing-library/react`, `@testing-library/jest-dom`) are installed but no Vitest config is present yet. When configured, tests will look like:

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@ecoctrl/ui";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

## Conventions

- **Test files**: co-located with source (`*.test.ts` or `*.test.tsx`) or in a dedicated `__tests__/` directory.
- **Naming**: `describe` the module, `it` describes the behavior.
- **Mocking**: prefer minimal mocks. For API tests, mock the repository layer rather than the database.
- **Coverage**: There is no enforced threshold yet. New server features should include tests for the happy path and at least one error case.

## CI integration

The root `package.json` does not define test scripts. Run tests from the server package directly:

```bash
cd packages/server
pnpm test              # run server tests
pnpm test:coverage     # generate coverage report
```

## Adding tests for a new feature

1. Write the test first (or alongside the implementation).
2. If testing a repository function, add the test in `packages/server/src/repositories/__tests__/`.
3. If testing a React component, add the test next to the component file (once a Vitest config is added to the app).
4. Run `pnpm test` from the server package directory to verify.
5. Run `pnpm test:coverage` to check coverage impact.

## Debugging tips

- Use `vitest --reporter=verbose` for detailed per-test output.
- Use `vitest --testNamePattern="creates a user"` to run a single test.
- The Vitest UI (`pnpm test:ui`) is useful for visually inspecting test results and coverage maps.
