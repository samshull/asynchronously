
module.exports = {
  root: true,
  env: {
    node: true,
    mocha: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module'
  },
  extends: ['eslint:recommended','plugin:yml/standard', 'plugin:promise/recommended'],
  plugins: ['promise', 'json'],
  rules: {
    'require-atomic-updates': 0,
    'object-curly-spacing': [2, "always"],
    'arrow-parens': [2, "as-needed"],
    'quote-props': [2, "as-needed"],
    'generator-star-spacing': [2, { before: true, after: true }],
    'no-multiple-empty-lines': [1, { max: 2, maxEOF: 1 }],
    'promise/param-names': 0
  }
};
