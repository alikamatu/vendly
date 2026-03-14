# Contributing to Vendly

First off, thank you for considering contributing to Vendly! It's people like you that make Vendly a great tool for entrepreneurs.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our code of conduct. Please be respectful and professional in all interactions.

## 🛠 Development Workflow

### Branching Strategy
-   **main**: The production branch. Direct commits are discouraged.
-   **develop**: The integration branch for features.
-   **feature/xxx**: For new features.
-   **bugfix/xxx**: For bug fixes.
-   **hotfix/xxx**: For urgent production fixes.

### Pull Request Process
1.  Fork the repository and create your branch from `develop`.
2.  Install dependencies and ensure the project runs locally.
3.  Make your changes, ensuring they adhere to the coding standards.
4.  Run linting and tests:
    ```bash
    npm run lint
    npm run test
    ```
5.  Submit a Pull Request (PR) with a clear description of the changes and the problem they solve.
6.  Link any relevant issues in the PR description.

## 🎨 Coding Standards

-   **TypeScript**: All code must be written in TypeScript.
-   **Formatting**: We use Prettier for consistent formatting. Run `npm run format` before committing.
-   **Styling**: Use Tailwind CSS utility classes. Avoid inline styles unless absolutely necessary.
-   **Components**: Keep components small, focused, and reusable. Use functional components with hooks.
-   **State Management**: Use Zustand for global state and React hooks for local state.

## 🧪 Testing

-   **Unit Tests**: Use Jest for testing business logic and utilities.
-   **E2E Tests**: Use Cypress or Playwright for critical user flows (Coming Soon).

## 📝 Documentation

-   Keep documentation up to date. If you change a feature, update the relevant README.
-   Use clear, concise comments for complex logic. Use JSDoc for public-facing functions.

## 🏗 Submitting Changes

-   Commit messages should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
-   Example: `feat(api): add product video support` or `fix(web): resolve card layout on mobile`.

Thank you for contributing!
