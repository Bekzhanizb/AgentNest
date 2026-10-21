import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { builtinModules } from 'node:module';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts', '**/*.tsx'] })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/desktop/renderer/**/*.ts', 'apps/desktop/renderer/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': ['error', { patterns: [
        { group: [...builtinModules, 'node:*', 'electron', '@agentnest/storage', '@agentnest/provider-sdk', '**/packages/storage/**', '**/packages/provider-sdk/**', '**/electron/**'], message: 'Renderer code may only use the narrow preload bridge and core contracts.' },
      ] }],
      'no-restricted-globals': ['error', 'process', 'require', 'Buffer'],
    },
  },
  {
    files: ['packages/core/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [...builtinModules, 'node:*', 'electron', 'react', '@agentnest/provider-sdk', '@agentnest/storage', '**/apps/**'] }] },
  },
  {
    files: ['packages/provider-sdk/**/*.ts', 'packages/storage/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['electron', 'react', '**/apps/**'] }] },
  },
);
