# Shared Calendar — Contributor Notes

> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

**Bespoke shared library** — deliberately outside the auto-injected lib-type standard system (the
`libs/*/<type>/**` glob does not match it), so nothing auto-injects here. These notes are the
guidance.

## Shared specifics

- **Holds** the `nge-calendar` system: `nge-calendar`, `nge-date-picker`, `nge-time-picker`, the
  `views/` (month / week / day), `core/` primitives, `interaction/` gestures and `theme/`.
- **`--nge-calendar-*` is the token contract.** Defaults live in this lib's `theme/`; the
  `@nge/themes` personas bridge them onto `--dlc-*` in `_dlc-calendar-tokens.scss`. Adding or
  renaming a token means updating that bridge.
- **`nge-calendar-store.ts` is the reference component-scoped `@ngrx/signals` SignalStore idiom
  for this repo** — a thin composition root over a `features/with-*.ts` split. The
  `ngrx-component-state` skill now cites it directly, alongside the single-file
  `libs/ledger/ui/*/**.store.ts` stores as the smaller case; it no longer points at the source
  repo's Firestore-flavoured examples.
- **Jest:** consumers rendering `<nge-calendar>` need the guarded `ResizeObserver` no-op stub in
  their `test-setup.ts` (jsdom lacks it).
- Never Angular Material.
- Test: `npx nx run shared-calendar:test` · Lint: `npx nx run shared-calendar:lint`
