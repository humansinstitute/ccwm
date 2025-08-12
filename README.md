# ccwm

test claude code integraiton

## Features

- Node.js/Express backend
- SQLite database
- Git worktrees for main and hotfix branches
- Structured project layout
- Testing setup with Jest
- Linting with ESLint
- Code formatting with Prettier

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git
- SQLite3

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Seed the database (optional):
```bash
npm run db:seed
```

### Development

Start the development server:
```bash
npm run dev
```

### Working with Worktrees

Switch to a worktree:
```bash
npm run worktree:switch main
# or
npm run worktree:switch hotfix
```

Create a new worktree:
```bash
npm run worktree:create feature-name
```

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Project Structure

```
.
├── src/
│   ├── controllers/    # Route controllers
│   ├── models/         # Data models
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   └── db/            # Database connection
├── tests/
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── config/            # Configuration files
├── db/
│   └── migrations/    # Database migrations
├── scripts/           # Utility scripts
├── public/            # Static files
└── views/             # View templates
```

## License

MIT

## Author

humansinstitute
