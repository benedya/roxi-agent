/** @type {import("jest").Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["@swc/jest", { jsc: { parser: { syntax: "typescript" }, target: "es2022" }, module: { type: "commonjs" } }],
  },
  moduleNameMapper: {
    "^#core/(.*)$": "<rootDir>/agent/lib/core/$1.ts",
    "^#lib/(.*)$": "<rootDir>/agent/lib/$1.ts",
    "^#scripts/(.*)$": "<rootDir>/scripts/$1.ts",
  },
};
