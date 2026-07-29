import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** This file's directory — `src/`, the root every entry point is named against. */
const SRC = __dirname;

/**
 * The secondary entry points, and what each is kept out of the production barrel
 * for. The message is the assertion's whole value: a failure has to say *why* the
 * separation exists, or the next person deletes the spec instead of the import.
 */
const SECONDARY_ENTRY_POINTS = [
  {
    directory: 'editors',
    reason:
      'an editor is optional, and the core must never take on a dependency one of them needs (ARCH-293)',
    specifier: '@nge/table/editors',
  },
  {
    directory: 'testing',
    reason:
      'a 10,000-row generator must not be one autocomplete away in application code (ARCH-241)',
    specifier: '@nge/table/testing',
  },
] as const;

/**
 * Packages the production barrel must not pull in, and what each is kept out for.
 *
 * ⚠️ **A secondary entry point is only worth having if the DEPENDENCY stays behind
 * it too.** The directory assertions below prove the barrel imports no file under
 * `editors/`; they say nothing about `@angular/cdk`, which is the thing that
 * separation was actually created to contain (ARCH-294). A core module growing a
 * convenient `import { Overlay }` would satisfy every other test in this file.
 */
const FORBIDDEN_PACKAGES = [
  {
    package: '@angular/cdk',
    reachableFrom: 'editors',
    reason:
      "only `<nge-cell-select>`'s overlay needs it, and a table that displays data must not pay for a dropdown (ARCH-294)",
  },
] as const;

/** Every relative specifier a file imports or re-exports, in source order. */
function relativeSpecifiersIn(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*['"](\.[^'"]*)['"]/g)].map(match => match[1]);
}

/**
 * Every PACKAGE specifier a file imports or re-exports — the complement of
 * {@link relativeSpecifiersIn}, which deliberately ignores them.
 */
function packageSpecifiersIn(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*['"]([^.'"][^'"]*)['"]/g)].map(match => match[1]);
}

/**
 * Resolve a relative specifier the way the bundler will — a `.ts` file, or the
 * `index.ts` of a directory.
 *
 * Returns `null` for a specifier that resolves to neither, which in this tree means
 * a `.scss` or an `.html`; those carry no imports to follow and no entry point to
 * reach.
 */
function resolveModule(fromFile: string, specifier: string): null | string {
  const base = resolve(dirname(fromFile), specifier);

  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Every file reachable from one module by following relative imports.
 *
 * Relative specifiers only, deliberately: a package name is a dependency rather
 * than a member of this library, and the question here is which of the library's
 * own files the barrel pulls in.
 */
function importClosureOf(entry: string): Set<string> {
  const seen = new Set<string>();
  const pending = [entry];

  while (pending.length > 0) {
    const file = pending.pop();

    if (file === undefined || seen.has(file)) {
      continue;
    }

    seen.add(file);

    for (const specifier of relativeSpecifiersIn(readFileSync(file, 'utf8'))) {
      const resolved = resolveModule(file, specifier);

      if (resolved !== null && !seen.has(resolved)) {
        pending.push(resolved);
      }
    }
  }

  return seen;
}

/**
 * ⚠️ **"The production barrel does not reach the secondary entry points" is a claim
 * that decays silently, so it is asserted rather than assumed.**
 *
 * Nothing about a stray import announces itself: a `export * from './editors'` added
 * for convenience compiles, lints, passes every other test, and quietly folds the
 * editors — and whatever they depend on — into every consumer of
 * `@nge/table`. The separation is only worth declaring if something checks
 * it, which is what ARCH-293's "verify rather than assume" is asking for.
 *
 * It walks the real import graph from `src/index.ts` rather than reading that one
 * file, because the reach that matters is transitive: a core module importing an
 * editor is exactly as bad as the barrel doing it, and rather harder to notice.
 */
describe('entry points', () => {
  const closure = importClosureOf(join(SRC, 'index.ts'));

  it.each(SECONDARY_ENTRY_POINTS)(
    'keeps the production barrel out of $specifier — $reason',
    ({ directory }) => {
      const prefix = `${directory}/`;
      const offenders = [...closure]
        .map(file => relative(SRC, file))
        .filter(path => path.startsWith(prefix))
        .sort();

      expect(offenders).toEqual([]);
    }
  );

  // The walker is only evidence if it actually walks. A resolver that silently
  // returned nothing would make every assertion above pass by reaching no file at
  // all — the shape of a green suite that tests nothing.
  it('reaches the core it is meant to be checking', () => {
    const reached = [...closure].map(file => relative(SRC, file));

    expect(reached).toContain('index.ts');
    expect(reached).toContain(join('lib', 'nge-table', 'nge-table.component.ts'));
    expect(reached).toContain(join('lib', 'edit', 'nge-cell-edit.ts'));
  });

  it.each(SECONDARY_ENTRY_POINTS)('gives $specifier a barrel of its own', ({ directory }) => {
    expect(existsSync(join(SRC, directory, 'index.ts'))).toBe(true);
  });

  /**
   * ⚠️ **The dependency half of the same claim, and the half the directory
   * assertions above cannot make.**
   *
   * ARCH-294's acceptance criterion is that `@angular/cdk` is a dependency of the
   * editors entry point *only*, "verified through the module graph, not by
   * inspection" — and inspection is exactly what reading `src/index.ts` would be.
   * A core module importing `Overlay` directly leaves every other test in this file
   * green while the whole point of the third entry point quietly evaporates.
   */
  describe('package boundaries', () => {
    /** Every package specifier reachable from one entry point's own files. */
    function packagesReachedFrom(entry: string): Set<string> {
      const packages = new Set<string>();

      for (const file of importClosureOf(entry)) {
        for (const specifier of packageSpecifiersIn(readFileSync(file, 'utf8'))) {
          packages.add(specifier);
        }
      }

      return packages;
    }

    it.each(FORBIDDEN_PACKAGES)(
      'keeps $package out of the production barrel — $reason',
      ({ package: forbidden }) => {
        const reached = [...packagesReachedFrom(join(SRC, 'index.ts'))]
          .filter(specifier => specifier === forbidden || specifier.startsWith(`${forbidden}/`))
          .sort();

        expect(reached).toEqual([]);
      }
    );

    // The falsifiability guard, in the shape ARCH-293 established for this file: an
    // extractor that quietly matched nothing would pass the assertion above against
    // every possible tree. This proves the walker sees the package where it IS.
    it.each(FORBIDDEN_PACKAGES)(
      'still finds $package from the $reachableFrom entry point',
      ({ package: forbidden, reachableFrom }) => {
        const reached = [...packagesReachedFrom(join(SRC, reachableFrom, 'index.ts'))].filter(
          specifier => specifier === forbidden || specifier.startsWith(`${forbidden}/`)
        );

        expect(reached.length).toBeGreaterThan(0);
      }
    );

    // And that it sees ordinary packages at all, so a regex that only ever matched
    // `@angular/cdk` could not masquerade as a general one.
    it('reads the packages the core genuinely depends on', () => {
      const packages = packagesReachedFrom(join(SRC, 'index.ts'));

      expect(packages).toContain('@angular/core');
      expect(packages).toContain('@tanstack/angular-table');
    });
  });
});
