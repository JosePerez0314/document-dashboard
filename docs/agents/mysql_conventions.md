# Database & MySQL Engineering Conventions

We are interacting with MySQL using raw queries and managing schema changes through manual SQL migration files in `/db/migrations/`.

## Strict SQL Rules

1. **SQL Injection Prevention:** Never concatenate strings to build queries. Always use parameterized queries or prepared statements when interacting with the database in `lib/db.ts` or API routes.
2. **Normalization:** As established in `002_normalize_expedientes_schema.sql`, maintain strict database normalization (3NF). Use foreign keys with appropriate `ON DELETE` and `ON UPDATE` constraints to maintain relational integrity.
3. **Indexing:** Any column used in a `WHERE`, `JOIN`, or `ORDER BY` clause must be evaluated for an index. When writing `SELECT` queries, consider the execution plan.
4. **Transactions:** Any business logic that requires multiple inserts or updates (e.g., updating an `expediente` status AND logging the action in an audit table) MUST be wrapped in a single SQL transaction (`START TRANSACTION`, `COMMIT`, `ROLLBACK`).
5. **Soft Deletes:** Never `DELETE` records from the `expedientes` table. Implement soft deletes using an `is_active` boolean or a `deleted_at` timestamp.

When writing a new `.sql` migration file, ensure it is idempotent or cleanly structured to avoid breaking existing development databases.
