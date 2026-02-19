Admin app UI conventions

- Structure:
  - `components/ui` primitives (Button, Input)
  - `components/common` layout primitives (Container, Grid)
  - `components/layout` application frame (Header, Footer)
  - `lib/theme` ThemeProvider + hooks
  - `utils`, `hooks`, `types`, `constants` for shared logic

- Theme:
  - Toggle stored in `localStorage` key `admin-theme` and applied via `data-theme` on `<html>`
