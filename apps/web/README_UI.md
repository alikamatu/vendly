UI / Component Conventions

- Directory layout:
  - `components/ui` : primitive, opinionated UI controls (Button, Input, etc.)
  - `components/common` : layout primitives (Container, Stack)
  - `components/layout` : app-level composition (Header, Footer)
  - `hooks`, `utils`, `lib`, `types` : support code

- Guidelines:
  - Keep components small, typed, and composable.
  - Prefer props over context for local behavior; expose hooks/context for global state.
  - Add stories/tests next to components when available.
