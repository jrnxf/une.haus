<p align="center">
  <img src="./public/icons/logo-black.svg" alt="une.haus" width="80" height="80" />
</p>

<h1 align="center">une.haus</h1>

<p align="center">
  A modern web application built with TanStack Start, React, and Drizzle ORM.
</p>

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [PostgreSQL](https://www.postgresql.org/) database

### Installation

```bash
# Clone the repository
git clone https://github.com/jrnxf/une.haus.git
cd une.haus

# Install dependencies
bun install

# Set up environment variables
cp .env.local .env
```

### Development

```bash
bun dev
```

### Build

```bash
bun run build
```

### Production

```bash
bun run build
bun start
```

### Database

```bash
# Run migrations
bun run db:migrate

# Seed database (development only)
bun run db:seed
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Requests

- Keep PRs focused and atomic
- Include a clear description of changes
- Ensure all tests pass
- Follow existing code style

### Issues

Found a bug or have a feature request? [Open an issue](https://github.com/jrnxf/une.haus/issues/new) with:

- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behavior

---

## License

ISC
