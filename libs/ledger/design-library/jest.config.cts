module.exports = {
  displayName: 'ledger-design-library',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/ledger/design-library',
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
  // deps so ldg-donut-chart's d3-shape usage is testable. (shared-charts has no
  // specs, so this repo had never hit the d3/jest issue before.)
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|d3|d3-[a-z0-9-]+|internmap|delaunator|robust-predicates))',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
