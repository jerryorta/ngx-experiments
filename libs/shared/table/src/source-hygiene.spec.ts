import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The library's own source tree, walked from this file's directory.
 *
 * `__dirname` rather than a path built from `process.cwd()`, because the working
 * directory of a Jest run depends on how it was invoked (`nx run`, a watch, an IDE) and
 * this assertion must mean the same thing from all of them.
 */
const SRC = __dirname;

/** Everything that ships or is compiled — the tree a reviewer expects to be able to read. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);

    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

/**
 * ⚠️ **A NUL byte in a source file is never intentional, and it is not cosmetic.**
 *
 * Git classifies a file containing one as **binary**, which costs three things that only
 * show up when they are needed: a pull request renders `Bin 0 -> N bytes` instead of a
 * diff, so the file ships **unreviewed**; `git blame` cannot attribute a line; and the
 * next edit conflicts as a binary file, resolvable only by choosing a whole side.
 *
 * ARCH-285 is why this exists. `nge-fill-values.ts` joined a `Map` key with a NUL —
 * collision-proof, functionally correct, every spec green, verified in a browser — and
 * merged with nobody having seen its diff. The defect was invisible to lint, to
 * TypeScript, and to 717 passing tests, because none of them read bytes.
 *
 * There is no false-positive case to weigh: nothing this library legitimately contains
 * needs a NUL. The fix is always to encode the intent some other way — for that key, a
 * nested `Map` with no separator at all.
 */
describe('source hygiene', () => {
  it('has no NUL bytes in any file under src/', () => {
    const offenders = sourceFiles(SRC)
      .filter(path => readFileSync(path).includes(0))
      .map(path => path.slice(SRC.length + 1));

    expect(offenders).toEqual([]);
  });
});
