module.exports = {
  displayName: 'ledger-ui',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/ledger/ui',
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
  // transform can't parse it under jest — additionally transform d3 + its ESM
  // deps so the Overview screen's @nge/charts usage is testable. (Mirrors the
  // fix in ledger-design-library/jest.config.cts; see the Wave 2 gotcha in
  // docs/demos/ledger-build-plan.md.)
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|d3|d3-[a-z0-9-]+|internmap|delaunator|robust-predicates))',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
