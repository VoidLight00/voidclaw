# Contributing to VoidClaw

Thank you for your interest in contributing to VoidClaw! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v22.12.0 or higher
- npm (comes with Node.js)
- macOS or Windows

### Getting Started

```bash
# Clone the repository
git clone https://github.com/VoidLight00/voidclaw.git
cd voidclaw

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Available Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start in development mode    |
| `npm run build`     | Type check + build           |
| `npm run lint`      | Run ESLint                   |
| `npm run format`    | Run Prettier                 |
| `npm run typecheck` | Run TypeScript type checking |

## Architecture

VoidClaw follows the standard Electron 3-layer architecture:

```
src/
├── main/         # Main process (Node.js, system access)
├── preload/      # Preload scripts (contextBridge IPC API)
└── renderer/     # Renderer process (React UI)
```

When adding a new IPC channel, you must update three files:

1. `src/main/ipc-handlers.ts` — Register the handler
2. `src/preload/index.ts` — Expose via `electronAPI`
3. `src/preload/index.d.ts` — Add type declaration

## How to Contribute

### Reporting Bugs

Use the [bug report template](https://github.com/VoidLight00/voidclaw/issues/new?template=bug_report.md) to file a bug. Include:

- Steps to reproduce
- Expected vs actual behavior
- OS and app version

### Suggesting Features

Use the [feature request template](https://github.com/VoidLight00/voidclaw/issues/new?template=feature_request.md).

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run checks:
   ```bash
   npm run typecheck
   npm run lint
   ```
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `chore:` for maintenance
6. Push and open a Pull Request

### Code Style

- **Prettier**: Single quotes, no semicolons, 100 char width, no trailing commas
- **Indentation**: 2 spaces, LF line endings
- Run `npm run format` before committing

## Need Help?

- Open a [GitHub Discussion](https://github.com/VoidLight00/voidclaw/discussions)
- Check existing [issues](https://github.com/VoidLight00/voidclaw/issues)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
