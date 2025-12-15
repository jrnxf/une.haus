# Docker Development Setup

## Quick Start

1. Start the PostgreSQL database:

```bash
docker compose up -d
```

2. Set up your `.env` file with the local database connection:

```bash
DATABASE_URL=postgresql://unehaus:unehaus_dev_password@localhost:5432/unehaus
```

3. Run migrations:

```bash
bun run db:migrate
```

4. (Optional) Seed the database:

```bash
bun run db:seed
```

5. Start the development server:

```bash
bun run dev
```

## Docker Commands

- **Start database**: `docker compose up -d`
- **Stop database**: `docker compose down`
- **View logs**: `docker compose logs -f postgres`
- **Reset database** (deletes all data): `docker compose down -v`
- **Connect to database**: `docker compose exec postgres psql -U unehaus -d unehaus`

## Database Connection

The PostgreSQL database is accessible at:

- **Host**: localhost
- **Port**: 5432
- **Database**: unehaus
- **User**: unehaus
- **Password**: unehaus_dev_password

## Switching Between Local and Remote

To switch back to Neon (or any remote database), simply update your `DATABASE_URL` in `.env` to point to the remote database.

The code now uses standard PostgreSQL client (`postgres-js`) which works with both local and remote PostgreSQL databases.
