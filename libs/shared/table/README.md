# shared-table

`@nge/table` — the `<nge-table>` system built on the headless
[`@tanstack/table-core`](https://tanstack.com/table/v8) engine.

## Documentation

Architecture, the four extension axes, the naming convention, and the `--nge-table-*`
token contract live in **`docs/architecture/table.md`**. Contributor notes and gotchas are
in `AGENTS.md` next to this file.

## Running unit tests

Run `nx test shared-table` to execute the unit tests.

## Type-checking

This library has no `build` target, so lint and test do not run `tsc` over the full
source. Type-check explicitly:

```
npx tsc -p libs/shared/table/tsconfig.lib.json --noEmit
```
