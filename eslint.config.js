import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const forbiddenSyntax = [
  {
    selector: "CallExpression[callee.name='require']",
    message: 'Use ES module `import` instead of `require`.',
  },
  {
    selector: "MemberExpression[object.name='module'][property.name='exports']",
    message: 'Use ES module `export` instead of `module.exports`.',
  },
  {
    selector: "MemberExpression[object.name='exports']",
    message: 'Use ES module `export` instead of CommonJS `exports`.',
  },
  {
    selector: "CallExpression[callee.property.name='then']",
    message: 'Use async/await instead of `.then()` chains.',
  },
];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      '.venv/**',
      '.agent/**',
      '.claude/**',
      '.cursor/**',
      '.gemini/**',
      '.impeccable/**',
      'data/**',
      'frontend/mockups/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'max-lines': ['error', { max: 100, skipBlankLines: false, skipComments: false }],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-restricted-syntax': ['error', ...forbiddenSyntax],
      eqeqeq: ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'all' }],
    },
  },
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
