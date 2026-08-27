import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/storybook-static'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Every project carries exactly two tags: one `scope:*` (which vertical
          // owns it) and one `type:*` (which rung of the library ladder it is).
          // A project matches every constraint whose `sourceTag` it carries, and
          // must satisfy ALL of them — so the two dimensions compose: `scope:*`
          // decides which verticals a dependency may come from, `type:*` decides
          // which rungs. See `docs/reference/domain-library-set.md` § Dependency
          // Order for the ladder these encode.
          depConstraints: [
            // ── scope ──────────────────────────────────────────────────────────
            // A domain reaches sideways into shared, never into another domain.
            {
              sourceTag: 'scope:ledger',
              onlyDependOnLibsWithTags: ['scope:ledger', 'scope:shared'],
            },
            // Shared code is domain-agnostic by definition: the moment it imports
            // a domain lib it stops being reusable and inverts the graph. This is
            // also what keeps a second domain from arriving through the back door
            // — it needs no edit when one is added.
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },

            // ── type: the library ladder ───────────────────────────────────────
            // Foundations. Types and design tokens are the bottom of the graph and
            // hold no workspace dependencies at all; an empty list bans every
            // tagged target rather than allowing anything through.
            {
              sourceTag: 'type:models',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'type:themes',
              onlyDependOnLibsWithTags: [],
            },
            // Stateless helpers. Peer utils may compose (a date helper reaching for
            // an rxjs operator); cycles are caught separately by the rule's own
            // circular-dependency check.
            {
              sourceTag: 'type:utils',
              onlyDependOnLibsWithTags: ['type:models', 'type:utils'],
            },
            // Fixture/seed data — shaped by the models it fabricates, nothing more.
            {
              sourceTag: 'type:mocks',
              onlyDependOnLibsWithTags: ['type:models'],
            },
            // Story scaffolding (review container + theme config). Kept a leaf so
            // the harness never becomes a back channel between component libraries.
            {
              sourceTag: 'type:storybook',
              onlyDependOnLibsWithTags: [
                'type:models',
                'type:themes',
                'type:utils',
              ],
            },
            // Global NgRx state. Deliberately excludes `type:ui` and
            // `type:design-library`: state must not know what renders it.
            {
              sourceTag: 'type:store',
              onlyDependOnLibsWithTags: [
                'type:models',
                'type:utils',
                'type:mocks',
              ],
            },
            // Presentational component kits. Peer kits may compose (the table
            // renders charts) but none may reach up into state or containers.
            {
              sourceTag: 'type:design-library',
              onlyDependOnLibsWithTags: [
                'type:models',
                'type:themes',
                'type:utils',
                'type:mocks',
                'type:storybook',
                'type:design-library',
              ],
            },
            // Smart/container components — the only rung that may hold both state
            // and presentation.
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: [
                'type:models',
                'type:themes',
                'type:utils',
                'type:mocks',
                'type:storybook',
                'type:design-library',
                'type:store',
              ],
            },
            // Applications sit above the whole ladder; their `scope:*` constraint
            // is what still holds them to one vertical plus shared.
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
