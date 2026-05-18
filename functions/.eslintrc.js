module.exports = {
  env: {
    es6: true,
    node: true,  // this is what was missing — tells ESLint you're in a Node/CommonJS environment
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "no-unused-vars": ["warn"],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};