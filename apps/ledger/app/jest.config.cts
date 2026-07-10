module.exports = {
  displayName: 'ledger-app',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/apps/ledger/app',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // d3 (v7) ships ESM as plain `.js` (type:module), so the default `.mjs`-only
  // transform can't parse it under jest. The app transitively imports @nge/charts
  // (d3) via the ledger design-library barrel (ldg-donut-chart) — additionally
  // transform d3 + its ESM deps. Mirrors ledger-ui / ledger-design-library.
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|d3|d3-[a-z0-9-]+|internmap|delaunator|robust-predicates))',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
