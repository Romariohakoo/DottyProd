// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// FSD: a layer imports only from the layers below it,
// and another slice only through its index.ts
const LAYERS = [
  'app',
  'pages',
  'widgets',
  'features',
  'entities',
  'shared',
];
const PUBLIC_API = 'index.{ts,tsx}';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...nextVitals,
  ...nextTs,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: ['app', 'src/app'], partialMatch: false },
        { type: 'pages', pattern: 'src/pages/*', partialMatch: false },
        { type: 'widgets', pattern: 'src/widgets/*', partialMatch: false },
        { type: 'features', pattern: 'src/features/*/*', partialMatch: false },
        { type: 'entities', pattern: 'src/entities/*', partialMatch: false },
        { type: 'shared', pattern: 'src/shared/*', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              allow: {
                dependency: { relationship: { to: 'internal' } },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: 'app' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            ...LAYERS.map((layer, index) => ({
              from: { element: { type: layer } },
              allow: {
                to: {
                  element: {
                    types: LAYERS.slice(index + 1),
                    fileInternalPath: PUBLIC_API,
                  },
                },
              },
            })),
          ],
        },
      ],
    },
  },
);
