module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.app.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'prettier'],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite-env.d.ts'],
  plugins: ['react-refresh', '@typescript-eslint', 'prettier', 'react', 'react-hooks'],
  rules: {
    'no-console': ['error', { allow: ['error', 'info'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [1, { args: 'none' }],
    camelcase: 0,
    'no-param-reassign': 0,
    'react/jsx-props-no-spreading': 0,
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'prefer-destructuring': [1, { object: true, array: false }],
    'react/jsx-no-useless-fragment': [1, { allowExpressions: true }],
    'react/jsx-no-duplicate-props': [1, { ignoreCase: false }],
    '@typescript-eslint/no-explicit-any': 'off',
  },

  overrides: [
    {
      files: ['src/routes/sections/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
    {
      files: ['api/**/*.ts'],
      env: {
        browser: false,
        node: true,
      },
      parserOptions: {
        project: ['./tsconfig.node.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
