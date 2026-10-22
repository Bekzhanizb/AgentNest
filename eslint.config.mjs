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
    files: ['apps/desktop/electron/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: ['ai', '@agentnest/runtime'], patterns: ['ai/*', '@ai-sdk/*', 'ollama-ai-provider-v2', '@agentnest/provider-*', '@agentnest/runtime/*', '!@agentnest/runtime/notes'] }] },
  },
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
        { group: [...builtinModules, 'node:*', 'electron', 'ai', 'ai/*', '@ai-sdk/*', 'ollama-ai-provider-v2', '@agentnest/storage', '@agentnest/provider-*', '@agentnest/runtime', '**/packages/storage/**', '**/packages/provider-*/**', '**/packages/runtime/**', '**/electron/**'], message: 'Renderer code may only use the narrow preload bridge and core contracts.' },
      ] }],
      'no-restricted-globals': ['error', 'process', 'require', 'Buffer'],
    },
  },
  {
    files: ['packages/core/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [...builtinModules, 'node:*', 'electron', 'react', 'ai', 'ai/*', '@ai-sdk/*', 'ollama-ai-provider-v2', '@agentnest/provider-*', '@agentnest/runtime', '@agentnest/storage', '**/apps/**'] }] },
  },
  {
    files: ['packages/runtime/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['electron', 'react', 'pixi.js', '@agentnest/office-scene', '@agentnest/provider-ollama', 'ollama-ai-provider-v2', '**/apps/**'] }] },
  },
  {
    files: ['packages/provider-sdk/**/*.ts', 'packages/storage/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['electron', 'react', '**/apps/**'] }] },
  },
  {
    files: ['packages/office-scene/**/*.ts', 'apps/desktop/renderer/src/office/**/*.ts', 'apps/desktop/renderer/src/office/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...builtinModules, 'node:*', 'electron', 'ai', 'ai/*', '@ai-sdk/*', 'ollama-ai-provider-v2', '@agentnest/provider-*', '@agentnest/runtime', '@agentnest/storage', '**/packages/provider-*/**', '**/packages/runtime/**', '**/packages/storage/**', '**/electron/**'] }],
      'no-restricted-globals': ['error', 'fetch', 'XMLHttpRequest', 'WebSocket', 'process', 'require'],
    },
  },
);
