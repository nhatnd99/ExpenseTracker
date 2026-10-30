/**
 * migrations.ts
 * Documents schema migration history.
 *
 * When the schema changes:
 * 1. Increment the version number in database.ts.
 * 2. Add a new version block in database.ts with the updated schema.
 * 3. Document the migration here for maintainability.
 *
 * Dexie handles the actual migration via the version().upgrade() callback.
 * See: https://dexie.org/docs/Tutorial/Design#database-versioning
 */

export const SCHEMA_MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema — monthlyPlans, categories, allocations, transactions',
    date: '2024-01-01',
  },
] as const

