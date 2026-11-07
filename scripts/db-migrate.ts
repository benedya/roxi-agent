// Runs (or reverts the last of) the app-schema TypeORM migrations.
//
// Usage: npm run db:migrate            apply pending migrations
//        npm run db:migrate -- revert  undo the most recent migration
// Env:   DATABASE_URL, APP_SCHEMA (optional) (from .env.local)

// First: the schema module reads APP_SCHEMA when it loads.
import "#scripts/load-env";
import { createDataSource } from "#core/db/data-source";
import { APP_SCHEMA } from "#core/db/schema";

const dataSource = createDataSource();
await dataSource.initialize();
try {
  // The migrations table lives in the app schema, so it must exist before TypeORM looks for it.
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${APP_SCHEMA}`);

  if (process.argv[2] === "revert") {
    await dataSource.undoLastMigration({ transaction: "each" });
    console.log("Reverted the last app migration.");
  } else {
    const applied = await dataSource.runMigrations({ transaction: "each" });
    console.log(applied.length ? `Applied: ${applied.map((m) => m.name).join(", ")}` : "App schema up to date.");
  }
} finally {
  await dataSource.destroy();
}
