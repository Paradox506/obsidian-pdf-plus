# Upgrade Regression Checklist (Phase 0 Baseline)

Use this checklist before and after any upgrade or internal refactor.

## Environment
- Obsidian desktop loads the plugin without startup errors.
- `pnpm dev` rebuilds successfully.
- Plugin can be enabled/disabled and reloaded.

## Link and Selection Flow
- Copy link to text selection works.
- Copy link to current page view works.
- Auto copy mode works when enabled.
- Auto paste and auto focus do not conflict.

## Write-File Flow
- Add highlight/underline to file from selection succeeds.
- Link to newly created annotation is copied.
- Edit annotation contents works.
- Delete annotation works (with warning options).

## Viewer and Embed Behavior
- Open `#page` links lands on correct page.
- `#selection`, `#annotation`, and `#rect` highlights appear correctly.
- Cropped PDF embed with `rect` works.
- No severe visual regression when switching pages quickly.

## Backlink Visualization
- Backlink highlights are visible in PDF view.
- Hover interactions between PDF view and backlink pane still work.
- Annotation backlink highlighting remains aligned after zoom changes.

## Sanity Checks
- Console has no new recurring errors.
- Core commands still appear in command palette.
- Settings tab renders and persists changes.
