import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';

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
          prefix: 'nge',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'nge',
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
    // Storybook story-wrapper components are test scaffolding, not shipped
    // components — exempt them from the nge- element-selector prefix and the
    // empty-callback rule (mirrors the source repo's stories exemption).
    files: ['**/stories/**/*.component.ts'],
    rules: {
      '@angular-eslint/component-selector': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];
