# Contributing to PI-CY

Thank you for your interest in contributing to PI-CY!

## Development Setup

### Prerequisites

- Node.js >= 22.19.0
- Rust >= 1.75.0
- npm >= 10.0.0

### Getting Started

```bash
git clone https://github.com/YOUR_ORG/pi-cy.git
cd pi-cy
npm install
npm run dev        # Start Vite dev server
cargo tauri dev    # Start Tauri desktop app
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build frontend |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `cargo tauri dev` | Start Tauri in dev mode |
| `cargo tauri build` | Build desktop app |

## Project Structure

```
src/
├── server/         # Backend (TypeScript)
├── web/            # Frontend (React + TypeScript)
│   ├── components/ # UI components
│   ├── stores/     # State management
│   ├── api/        # API client
│   └── styles/     # CSS
src-tauri/          # Tauri Rust backend
tests/              # Tests
docs/               # Documentation
scripts/            # Build scripts
```

## Code Style

- TypeScript: Strict mode, no `any`
- Rust: `rustfmt` default formatting
- CSS: Tailwind CSS utility classes
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes
4. Run `npm run typecheck && npm run lint`
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feat/amazing-feature`)
7. Open a Pull Request

## Reporting Bugs

Use the [Bug Report](https://github.com/YOUR_ORG/pi-cy/issues/new?template=bug_report.yml) template.

## Feature Requests

Use the [Feature Request](https://github.com/YOUR_ORG/pi-cy/issues/new?template=feature_request.yml) template.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
