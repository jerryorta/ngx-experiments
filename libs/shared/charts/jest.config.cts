module.exports = {
  displayName: 'shared-charts',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/charts',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // d3 ships ESM (.js) — transform the d3 family (+ its ESM deps) so the axis /
  // gesture / layer code that imports it parses under jest, alongside .mjs deps.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.*\\.mjs$|(?:d3|d3-[a-z-]+|internmap|delaunator|robust-predicates)/))',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
