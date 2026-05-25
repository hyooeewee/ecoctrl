// Server test setup: configure test database connection if needed
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-tests-only";

const TEST_ENV = "server";
export { TEST_ENV };
