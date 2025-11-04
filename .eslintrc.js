module.exports = {
  root: true,
  ignorePatterns: ["dist/", ".next/", "node_modules/", "coverage/"],
  env: {
    es2022: true,
    node: true,
    browser: true,
  },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module",
        project: [
          "./backend/tsconfig.json",
          "./frontend/tsconfig.json",
        ],
        tsconfigRootDir: __dirname,
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/explicit-module-boundary-types": "off",
      },
    },
  ],
  rules: {
    "no-console": "off", // TODO: revisit once structured logging is in place
  },
};