# Contributing to Vendly

First off, thank you for considering contributing to Vendly! It's people like you that make Vendly a great tool for entrepreneurs.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful and professional in all interactions.

## 🛠 Development Workflow

### Monorepo Tooling
Vendly uses **pnpm workspaces** and **Turborepo** to manage multiple applications and shared packages. 
- Always use `pnpm` instead of `npm` or `yarn`.
- Run commands from the root directory when possible using Turborepo or pnpm filters.

### Branching Strategy
-   **main**: The production branch. Direct commits are discouraged.
-   **develop**: The integration branch for features.
-   **feature/xxx**: For new features.
-   **bugfix/xxx**: For bug fixes.
-   **hotfix/xxx**: For urgent production fixes.

### Environment Setup
Before running the project locally, ensure you have the necessary environment variables set up:
1. Copy `apps/api/.env.example` to `apps/api/.env` and fill in required values (Database URL, JWT secret, Paystack keys, etc.).
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.

### Pull Request Process
1.  Fork the repository and create your branch from `develop`.
2.  Install dependencies at the root: `pnpm install`
3.  Make your changes, ensuring they adhere to the coding standards.
4.  Run linting, type-checking, and tests via Turborepo:
    ```bash
    pnpm turbo run lint
    pnpm turbo run type-check
    pnpm turbo run test
    ```
5.  Submit a Pull Request (PR) with a clear description of the changes and the problem they solve.

## 🎨 Coding Standards

-   **TypeScript**: All code must be written in TypeScript. Shared configs are in `packages/typescript-config`.
-   **Formatting**: We use Prettier for consistent formatting. Run `pnpm format` (or let the pre-commit hook handle it).
-   **Linting**: Shared ESLint configs live in `packages/eslint-config`.
-   **Styling**: Use Tailwind CSS utility classes. Avoid inline styles unless absolutely necessary.
-   **Components**: Keep components small, focused, and reusable. Use functional components with hooks.
-   **State Management**: Use Zustand for global state and React hooks for local state.

## 🗃 Database & Prisma Workflow

When making changes to the database schema (`apps/api/prisma/schema.prisma`):
1. Make your schema changes.
2. Generate the client: `pnpm --filter @vendly/api exec prisma generate`
3. Create a migration: `pnpm --filter @vendly/api exec prisma migrate dev --name your_migration_name`
4. If testing locally, you can seed data using:
   - `pnpm --filter @vendly/api run seed:admin`
   - `pnpm --filter @vendly/api run seed:categories`
   - `pnpm --filter @vendly/api run seed:locations`

## 🧪 Testing

-   **Unit Tests**: Use Jest for testing business logic and utilities.
-   **E2E Tests**: Use Cypress or Playwright for critical user flows (Coming Soon).

## 🏗 Git Hooks & Commits

-   **Husky**: We use Husky to run pre-commit and commit-msg hooks.
-   **Lint-Staged**: The pre-commit hook automatically runs ESLint with `--fix` and Prettier on staged files.
-   **Conventional Commits**: Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (enforced via commitlint).
    - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`, `build`
    - Example: `feat(api): add product video support` or `fix(web): resolve card layout on mobile`.
