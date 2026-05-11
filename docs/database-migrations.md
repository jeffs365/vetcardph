# Database Migrations

VetCard now has a Prisma Migrate baseline at:

`backend/prisma/migrations/20260504192000_baseline/migration.sql`

The baseline represents the schema that previously existed through `prisma db push`. Existing local databases should mark this migration as applied instead of running it over existing tables:

```sh
npm --workspace @vetcard/backend exec -- prisma migrate resolve --applied 20260504192000_baseline
```

For new schema changes, prefer:

```sh
npm run db:migrate
```

For deployment environments, use:

```sh
npm run db:migrate:deploy
```

`db:push` is still available for throwaway local experimentation, but committed schema changes should go through Prisma Migrate.
