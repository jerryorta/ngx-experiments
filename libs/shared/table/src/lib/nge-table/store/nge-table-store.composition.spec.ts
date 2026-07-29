import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// A namespace import, not a default one: `esModuleInterop` is off in this
// workspace, so `import ts from 'typescript'` resolves to `undefined` at runtime
// while compiling perfectly.
import * as ts from 'typescript';

/**
 * `signalStore`'s hard ceiling — the arity of its widest overload.
 *
 * Not a number `@ngrx/signals` documents or exports; it is `f1 … f15` in
 * `node_modules/@ngrx/signals/types/ngrx-signals.d.ts`, with no rest overload to
 * fall back on. `signalStoreFeature` has the same shape and a **lower** ceiling of
 * ten, so a grouped feature is a budget of its own rather than somewhere to put
 * everything.
 */
const SIGNAL_STORE_CEILING = 15;

/**
 * Where the alarm goes off, deliberately well short of {@link SIGNAL_STORE_CEILING}.
 *
 * ⚠️ **Failing AT the ceiling would be useless.** Past it, inference does not throw
 * and the call is not rejected — it simply stops matching an overload, every store
 * member degrades to an index signature, and `store.table` types as `Function`. The
 * build then reports around forty `TS4111` / `TS2339` errors in
 * `nge-table.component.ts` and **none at all** in the store that caused them, so
 * every signal points at a file nobody touched. ARCH-292 lost time to exactly that,
 * and ARCH-297 exists because the store had already reached fifteen.
 *
 * Five slots of margin is what turns the fix from a rescue into a refactor: whoever
 * trips this still has room to land their feature and regroup afterwards. The fix is
 * always the same — move a cohesive set of blocks into
 * `store/features/with-nge-table-<concern>.ts` and compose it with `withFeature()`,
 * which costs the root **one** slot however many blocks the feature holds. See
 * `libs/shared/table/AGENTS.md` § The store's composition root.
 */
const NGE_TABLE_STORE_SLOT_BUDGET = 10;

const STORE_SOURCE = join(__dirname, 'nge-table-store.ts');

/**
 * How many features a composition root passes to `signalStore`.
 *
 * Parsed rather than matched with a regex for two reasons that both bite here: the
 * store file's own prose names `withMethods` and `withFeature` in comments, and
 * counting balanced parentheses is where a regex stops being honest. The AST answers
 * the question actually being asked — the call's argument count.
 *
 * Takes source text rather than reading the file itself, so the extractor can be
 * proven against a tree whose answer is known.
 */
function signalStoreArgumentCount(source: string, fileName = 'store.ts'): number {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  let count: null | number = null;

  const visit = (node: ts.Node): void => {
    if (count !== null) {
      return;
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'signalStore'
    ) {
      count = node.arguments.length;

      return;
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(parsed, visit);

  if (count === null) {
    throw new Error(
      `No signalStore(...) call found in ${fileName}. If the composition root moved, move this ` +
        'guard with it — losing the guard silently is worse than the regression it catches.'
    );
  }

  return count;
}

describe('NgeTableStore composition root', () => {
  it(`spends no more than ${NGE_TABLE_STORE_SLOT_BUDGET} of signalStore's ${SIGNAL_STORE_CEILING} feature slots`, () => {
    const slots = signalStoreArgumentCount(readFileSync(STORE_SOURCE, 'utf8'), STORE_SOURCE);

    expect(slots).toBeLessThanOrEqual(NGE_TABLE_STORE_SLOT_BUDGET);
  });

  // The falsifiability guard, in the shape `entry-points.spec.ts` established for
  // this library: a parser that quietly returned zero — or found some unrelated
  // call — would pass the budget against every possible tree. These prove it reads
  // an argument count it could get wrong.
  describe('the counter itself', () => {
    it('counts the arguments of a root whose answer is known', () => {
      expect(
        signalStoreArgumentCount(
          'export const S = signalStore(withState({}), withFeature(s => f(s)), withMethods(() => ({})));'
        )
      ).toBe(3);
    });

    it('is not fooled by a comment naming the composers', () => {
      expect(
        signalStoreArgumentCount(
          '/** withState, withProps, withComputed, withMethods, withFeature */\n' +
            'export const S = signalStore(withState({}));'
        )
      ).toBe(1);
    });

    it('refuses to report a count for a file with no composition root', () => {
      expect(() => signalStoreArgumentCount('export const S = 1;')).toThrow(/No signalStore/);
    });

    // And that it is reading OUR root rather than a coincidence: a table store with
    // one or two features would not be this library's.
    it('reads the real composition root', () => {
      expect(
        signalStoreArgumentCount(readFileSync(STORE_SOURCE, 'utf8'), STORE_SOURCE)
      ).toBeGreaterThan(2);
    });
  });
});
