// Loads .env.local into process.env. Import it first, so modules that read the env on load see it.

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall back to the existing environment.
}
