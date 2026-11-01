// Postgres schema for the app's own tables, kept apart from eve's workflow schemas.
// Set APP_SCHEMA to use another one; it is read once, when this module loads.
const DEFAULT_APP_SCHEMA = "roxi_agent";

export const APP_SCHEMA = process.env.APP_SCHEMA || DEFAULT_APP_SCHEMA;

// The name is interpolated into SQL unquoted, so only plain identifiers are allowed.
if (!/^[a-z_][a-z0-9_]*$/.test(APP_SCHEMA)) {
  throw new Error(`APP_SCHEMA must be a lowercase Postgres identifier, got "${APP_SCHEMA}".`);
}
