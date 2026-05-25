// Server test setup: configure test database connection if needed
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-tests-only";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://test:test@localhost:5432/test";

const TEST_ENV = "server";
export { TEST_ENV };
