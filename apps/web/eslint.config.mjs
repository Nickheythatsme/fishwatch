import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint flat config. Next 16 removed the `next lint` command and ESLint 9
 * dropped the legacy `.eslintrc` resolution it relied on, so we run ESLint
 * directly (see the "lint" script) and consume the flat config that
 * eslint-config-next now exports.
 */
const config = [
  { ignores: [".next/**", "node_modules/**"] },
  ...nextCoreWebVitals,
  {
    // eslint-plugin-react-hooks v6 (shipped with eslint-config-next 16) adds
    // React-Compiler-era rules that flag pre-existing code. Keep them visible
    // as warnings rather than letting a dependency bump block CI or force an
    // unrelated UI refactor; address them in a dedicated follow-up.
    rules: {
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
