# Agentech Website Working Notes

For Agentech UI, theme, screenshot-matching, navigation, browser verification, or public-preview work, read and follow [`docs/agentech-ui-change-playbook.md`](docs/agentech-ui-change-playbook.md) before editing.

- Preserve the user's existing worktree changes.
- Use `#f5f4f1` for new or restyled light-background page canvases unless the user specifies another color.
- Keep light and dark theme changes inside a page-specific scope. Prefer stable `data-*` hooks over selectors that depend on generated markup.
- Add a failing regression test before a visual behavior fix, then run the focused test, typecheck, and a production build.
- Verify the exact route and theme in a real browser. A public review URL is not complete until an unauthenticated request reaches the site rather than a Vercel login page.
