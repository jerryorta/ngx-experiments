import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'sb',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'sb',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
  {
    // The `.storybook` manager/preview files are build tooling, not part of the
    // shippable module graph. They legitimately import lib code (glob stories,
    // pull theme configs) via relative paths that Storybook's own manager bundler
    // resolves directly — so Nx's cross-project boundary rule doesn't apply here.
    files: ['**/.storybook/**/*.{ts,tsx}'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
